"""CAPTCHA aritmético firmado. No guarda filas: no toca la base de producción."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time

from fastapi import HTTPException

SEGUNDOS_VIGENCIA = 300
_SEPARADOR = "|"


def _secreto() -> bytes:
    valor = os.getenv("CAPTCHA_SECRETO") or os.getenv("JWT_SECRETO") or "secreto-temporal-cambiar-en-env"
    return valor.encode("utf-8")


def _firmar(cuerpo: str) -> str:
    return hmac.new(_secreto(), cuerpo.encode("utf-8"), hashlib.sha256).hexdigest()


def generar_captcha() -> dict:
    a = secrets.randbelow(8) + 1
    b = secrets.randbelow(8) + 1
    expira = int(time.time()) + SEGUNDOS_VIGENCIA
    cuerpo = _SEPARADOR.join((str(a), str(b), str(a + b), str(expira)))
    token = base64.urlsafe_b64encode(f"{cuerpo}{_SEPARADOR}{_firmar(cuerpo)}".encode("utf-8")).decode("ascii")
    return {
        "token": token,
        "pregunta": f"¿Cuánto es {a} + {b}?",
        "etiqueta": "Verificación CAPTCHA",
        "expira_en_segundos": SEGUNDOS_VIGENCIA,
    }


def validar_captcha(token: str | None, respuesta: str | None) -> None:
    if not token or not str(token).strip():
        raise HTTPException(status_code=400, detail="Completa la verificación CAPTCHA.")
    if respuesta is None or not str(respuesta).strip():
        raise HTTPException(status_code=400, detail="Escribe el resultado del CAPTCHA.")

    try:
        crudo = base64.urlsafe_b64decode(str(token).strip().encode("ascii")).decode("utf-8")
        a, b, esperado, expira, firma = crudo.split(_SEPARADOR)
        cuerpo = _SEPARADOR.join((a, b, esperado, expira))
    except (ValueError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=400, detail="El CAPTCHA no es válido. Pide uno nuevo.") from error

    if not hmac.compare_digest(_firmar(cuerpo), firma):
        raise HTTPException(status_code=400, detail="El CAPTCHA no es válido. Pide uno nuevo.")
    if int(time.time()) > int(expira):
        raise HTTPException(status_code=400, detail="El CAPTCHA expiró. Pide uno nuevo.")

    try:
        valor = int(str(respuesta).strip())
    except ValueError as error:
        raise HTTPException(status_code=400, detail="El CAPTCHA solo admite un número.") from error

    if valor != int(esperado):
        raise HTTPException(status_code=400, detail="La respuesta del CAPTCHA es incorrecta.")
