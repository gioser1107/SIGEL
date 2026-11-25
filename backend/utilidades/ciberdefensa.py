"""Integridad de boletos y tokens HMAC de operaciones críticas.

SHA-256 resume el documento. ECDSA P-256 lo firma con una clave que no sale
del servidor. El token de una operación crítica usa HMAC-SHA256 y dura
exactamente cinco minutos.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey, EllipticCurvePublicKey

VIGENCIA_TOKEN_SEGUNDOS = 300
ALGORITMO_DOCUMENTO = "SHA-256+ECDSA-P256"
OPERACION_APROBAR_PAGO = "aprobar_pago"

_RUTA_CLAVE = Path(os.environ.get("SIGEL_CLAVE_BOLETO_RUTA", Path(__file__).resolve().parents[1] / "claves" / "boleto_ecdsa_privada.pem"))
_SEPARADOR = "|"
_clave_cargada: EllipticCurvePrivateKey | None = None


class DocumentoAlterado(Exception):
    """El documento no supera la verificación de hash o de firma."""


class TokenOperacionInvalido(Exception):
    """El token HMAC no autoriza la operación en este momento."""


def contenido_canonico(campos: dict) -> str:
    """JSON estable: el mismo documento produce siempre los mismos bytes."""
    return json.dumps(campos, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def huella_sha256(contenido: str) -> str:
    return hashlib.sha256(contenido.encode("utf-8")).hexdigest()


def _igual(calculado: str, guardado: str) -> bool:
    if len(calculado) != len(guardado):
        return False
    return hmac.compare_digest(calculado, guardado)


def generar_clave_privada() -> EllipticCurvePrivateKey:
    return ec.generate_private_key(ec.SECP256R1())


def cargar_clave_privada() -> EllipticCurvePrivateKey:
    """Lee la clave del servidor o la crea la primera vez. No se versiona."""
    global _clave_cargada
    if _clave_cargada is not None:
        return _clave_cargada
    if _RUTA_CLAVE.is_file():
        _clave_cargada = serialization.load_pem_private_key(_RUTA_CLAVE.read_bytes(), password=None)
        return _clave_cargada
    _RUTA_CLAVE.parent.mkdir(parents=True, exist_ok=True)
    clave = generar_clave_privada()
    pem = clave.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    _RUTA_CLAVE.write_bytes(pem)
    try:
        os.chmod(_RUTA_CLAVE, 0o600)
    except OSError:
        pass
    _clave_cargada = clave
    return clave


def clave_publica_de(privada: EllipticCurvePrivateKey) -> EllipticCurvePublicKey:
    return privada.public_key()


def firmar_ecdsa(privada: EllipticCurvePrivateKey, contenido: bytes) -> str:
    firma = privada.sign(contenido, ec.ECDSA(hashes.SHA256()))
    return base64.b64encode(firma).decode("ascii")


def verificar_ecdsa(publica: EllipticCurvePublicKey, contenido: bytes, firma_b64: str) -> bool:
    try:
        publica.verify(base64.b64decode(firma_b64), contenido, ec.ECDSA(hashes.SHA256()))
    except (InvalidSignature, ValueError):
        return False
    return True


def firmar_documento(campos: dict, clave: EllipticCurvePrivateKey | None = None) -> dict:
    privada = clave or cargar_clave_privada()
    contenido = contenido_canonico(campos)
    return {
        "contenido": contenido,
        "huella_sha256": huella_sha256(contenido),
        "firma_ecdsa": firmar_ecdsa(privada, contenido.encode("utf-8")),
        "algoritmo": ALGORITMO_DOCUMENTO,
        "clave_publica": clave_publica_de(privada),
    }


def verificar_documento(
    campos: dict,
    huella: str,
    firma: str,
    clave_publica: EllipticCurvePublicKey,
) -> None:
    """Rechaza el documento si el hash o la firma no corresponden al contenido."""
    contenido = contenido_canonico(campos)
    if not _igual(huella_sha256(contenido), huella or ""):
        raise DocumentoAlterado(
            "La huella SHA-256 no coincide. El boleto fue alterado después de emitirse."
        )
    if not verificar_ecdsa(clave_publica, contenido.encode("utf-8"), firma or ""):
        raise DocumentoAlterado(
            "La firma ECDSA no corresponde a este boleto. El cambio no está autorizado."
        )


def _secreto_token() -> bytes:
    valor = (
        os.getenv("TOKEN_OPERACION_SECRETO")
        or os.getenv("JWT_SECRETO")
        or "secreto-temporal-cambiar-en-env"
    )
    return valor.encode("utf-8")


def registro_operacion(reserva_id: int, pago_id: int) -> str:
    return f"{int(reserva_id)}:{int(pago_id)}"


def _codificar_token(cuerpo: str) -> str:
    return base64.urlsafe_b64encode(cuerpo.encode("utf-8")).decode("ascii")


def _decodificar_token(token: str) -> str:
    limpio = (token or "").strip()
    relleno = "=" * (-len(limpio) % 4)
    return base64.urlsafe_b64decode(limpio + relleno).decode("utf-8")


def emitir_token_operacion(
    operacion: str,
    registro: str,
    usuario_id: int,
    secreto: bytes | None = None,
    ahora: int | None = None,
) -> dict:
    """Token HMAC atado a una operación, un registro y un usuario. Dura 5 minutos."""
    emitido = int(time.time()) if ahora is None else int(ahora)
    expira = emitido + VIGENCIA_TOKEN_SEGUNDOS
    nonce = secrets.token_hex(8)
    cuerpo = _SEPARADOR.join((
        operacion,
        str(registro),
        str(int(usuario_id)),
        str(emitido),
        str(expira),
        nonce,
    ))
    firma = hmac.new(secreto or _secreto_token(), cuerpo.encode("utf-8"), hashlib.sha256).hexdigest()
    return {
        "token": _codificar_token(f"{cuerpo}{_SEPARADOR}{firma}"),
        "operacion": operacion,
        "registro": str(registro),
        "usuario_id": int(usuario_id),
        "emitido_en": emitido,
        "expira_en": expira,
        "vigencia_segundos": VIGENCIA_TOKEN_SEGUNDOS,
    }


def verificar_token_operacion(
    token: str,
    operacion: str,
    registro: str,
    usuario_id: int,
    secreto: bytes | None = None,
    ahora: int | None = None,
) -> dict:
    """Acepta solo el token intacto, de esta operación y dentro de los 5 minutos."""
    momento = int(time.time()) if ahora is None else int(ahora)
    try:
        partes = _decodificar_token(token).split(_SEPARADOR)
    except (ValueError, UnicodeError) as error:
        raise TokenOperacionInvalido("El token de operación no se puede leer.") from error
    if len(partes) != 7:
        raise TokenOperacionInvalido("El token de operación no tiene el formato esperado.")

    op, reg, uid, iat_s, exp_s, nonce, firma = partes
    cuerpo = _SEPARADOR.join(partes[:6])
    esperada = hmac.new(secreto or _secreto_token(), cuerpo.encode("utf-8"), hashlib.sha256).hexdigest()
    if not _igual(esperada, firma):
        raise TokenOperacionInvalido(
            "La firma HMAC no coincide. El token fue alterado y la operación se rechaza."
        )
    try:
        emitido = int(iat_s)
        expira = int(exp_s)
    except ValueError as error:
        raise TokenOperacionInvalido("La vigencia del token no es válida.") from error
    if expira - emitido != VIGENCIA_TOKEN_SEGUNDOS:
        raise TokenOperacionInvalido("La vigencia del token no es de 5 minutos.")
    if momento < emitido:
        raise TokenOperacionInvalido("El token todavía no está vigente.")
    if momento >= expira:
        raise TokenOperacionInvalido("El token venció. La autorización dura 5 minutos.")
    if not nonce:
        raise TokenOperacionInvalido("El token no trae identificador.")
    if op != operacion:
        raise TokenOperacionInvalido("El token no autoriza esta operación.")
    if reg != str(registro):
        raise TokenOperacionInvalido("El token no corresponde a este pago.")
    if uid != str(int(usuario_id)):
        raise TokenOperacionInvalido("El token pertenece a otro usuario.")
    return {
        "operacion": op,
        "registro": reg,
        "usuario_id": int(uid),
        "emitido_en": emitido,
        "expira_en": expira,
    }
