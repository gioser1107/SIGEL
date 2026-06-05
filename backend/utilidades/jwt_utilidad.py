import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv

directorio_backend = Path(__file__).resolve().parent.parent
load_dotenv(directorio_backend / ".env")

ALGORITMO_JWT = "HS256"
SECRETO_JWT = os.getenv("JWT_SECRETO", "secreto-temporal-cambiar-en-env")
EXPIRACION_MINUTOS = int(os.getenv("JWT_EXPIRACION_MINUTOS", "480"))


def crear_token(usuario_id: int, correo: str, rol_id: int) -> tuple[str, int]:
    """Genera un JWT con fecha de expiración. Devuelve token y segundos hasta expirar."""
    ahora = datetime.now(timezone.utc)
    expiracion = ahora + timedelta(minutes=EXPIRACION_MINUTOS)
    expira_en_segundos = EXPIRACION_MINUTOS * 60

    payload = {
        "sub": str(usuario_id),
        "correo": correo,
        "rol_id": rol_id,
        "iat": int(ahora.timestamp()),
        "exp": int(expiracion.timestamp()),
    }

    token = jwt.encode(payload, SECRETO_JWT, algorithm=ALGORITMO_JWT)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token, expira_en_segundos


def verificar_token(token: str) -> dict:
    """Decodifica y valida el JWT. Lanza jwt exceptions si es inválido o expiró."""
    payload = jwt.decode(token, SECRETO_JWT, algorithms=[ALGORITMO_JWT])
    return payload
