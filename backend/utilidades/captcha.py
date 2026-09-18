"""CAPTCHA de imagen firmado. No guarda filas: no toca la base de producción."""

from __future__ import annotations

import base64
import hashlib
import hmac
import io
import os
import secrets
import time

from fastapi import HTTPException
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SEGUNDOS_VIGENCIA = 300
_SEPARADOR = "|"
_ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_ANCHO = 220
_ALTO = 72


def _secreto() -> bytes:
    valor = os.getenv("CAPTCHA_SECRETO") or os.getenv("JWT_SECRETO") or "secreto-temporal-cambiar-en-env"
    return valor.encode("utf-8")


def _firmar(cuerpo: str) -> str:
    return hmac.new(_secreto(), cuerpo.encode("utf-8"), hashlib.sha256).hexdigest()


def _fuente(tamano: int) -> ImageFont.ImageFont:
    for ruta in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.isfile(ruta):
            return ImageFont.truetype(ruta, tamano)
    return ImageFont.load_default()


def _dibujar(codigo: str) -> str:
    imagen = Image.new("RGB", (_ANCHO, _ALTO), (232, 238, 246))
    dibujo = ImageDraw.Draw(imagen)
    for _ in range(28):
        x1, y1 = secrets.randbelow(_ANCHO), secrets.randbelow(_ALTO)
        x2, y2 = secrets.randbelow(_ANCHO), secrets.randbelow(_ALTO)
        dibujo.line((x1, y1, x2, y2), fill=(180, 196, 214), width=1)
    for _ in range(90):
        x, y = secrets.randbelow(_ANCHO), secrets.randbelow(_ALTO)
        dibujo.point((x, y), fill=(120 + secrets.randbelow(80), 130 + secrets.randbelow(80), 150))

    fuente = _fuente(34)
    paso = _ANCHO // (len(codigo) + 1)
    for i, letra in enumerate(codigo):
        recorte = Image.new("RGBA", (48, 60), (0, 0, 0, 0))
        capa = ImageDraw.Draw(recorte)
        color = (20 + secrets.randbelow(40), 45 + secrets.randbelow(40), 90 + secrets.randbelow(40))
        capa.text((4, 4), letra, font=fuente, fill=color + (255,))
        girado = recorte.rotate(secrets.randbelow(31) - 15, expand=True, resample=Image.BICUBIC)
        imagen.paste(girado, (paso * i + 8, 6 + secrets.randbelow(10)), girado)

    imagen = imagen.filter(ImageFilter.SMOOTH)
    buffer = io.BytesIO()
    imagen.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def generar_captcha() -> dict:
    codigo = "".join(secrets.choice(_ALFABETO) for _ in range(5))
    expira = int(time.time()) + SEGUNDOS_VIGENCIA
    cuerpo = _SEPARADOR.join((codigo, str(expira)))
    token = base64.urlsafe_b64encode(f"{cuerpo}{_SEPARADOR}{_firmar(cuerpo)}".encode("utf-8")).decode("ascii")
    return {
        "token": token,
        "imagen": _dibujar(codigo),
        "pregunta": "Escribe los 5 caracteres de la imagen",
        "etiqueta": "Verificación CAPTCHA",
        "expira_en_segundos": SEGUNDOS_VIGENCIA,
    }


def validar_captcha(token: str | None, respuesta: str | None) -> None:
    if not token or not str(token).strip():
        raise HTTPException(status_code=400, detail="Completa la verificación CAPTCHA.")
    if respuesta is None or not str(respuesta).strip():
        raise HTTPException(status_code=400, detail="Escribe los caracteres de la imagen CAPTCHA.")

    try:
        crudo = base64.urlsafe_b64decode(str(token).strip().encode("ascii")).decode("utf-8")
        codigo, expira, firma = crudo.split(_SEPARADOR)
        cuerpo = _SEPARADOR.join((codigo, expira))
    except (ValueError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=400, detail="El CAPTCHA no es válido. Pide uno nuevo.") from error

    if not hmac.compare_digest(_firmar(cuerpo), firma):
        raise HTTPException(status_code=400, detail="El CAPTCHA no es válido. Pide uno nuevo.")
    if int(time.time()) > int(expira):
        raise HTTPException(status_code=400, detail="El CAPTCHA expiró. Pide uno nuevo.")

    ingresado = "".join(ch for ch in str(respuesta).upper() if ch.isalnum())
    if ingresado != codigo:
        raise HTTPException(status_code=400, detail="Los caracteres del CAPTCHA no coinciden.")
