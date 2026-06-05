from datetime import datetime

from fastapi import Request
from sqlalchemy.orm import Session

from modelos.bitacora_modelo import Bitacora


def obtener_ip_origen(request: Request | None) -> str | None:
    if request is None:
        return None
    if request.client is not None:
        return request.client.host
    return None


def registrar_evento(
    db: Session,
    modulo: str,
    accion: str,
    resumen: str,
    usuario_id: int | None = None,
    tabla_afectada: str | None = None,
    registro_id: str | int | None = None,
    detalle: dict | None = None,
    ip_origen: str | None = None,
) -> None:
    """Inserta un evento en bitácora. Llámala desde cualquier controlador."""
    try:
        registro_texto = str(registro_id) if registro_id is not None else None
        entrada = Bitacora(
            usuario_id=usuario_id,
            modulo=modulo,
            accion=accion,
            tabla_afectada=tabla_afectada,
            registro_id=registro_texto,
            resumen=resumen[:500],
            detalle=detalle,
            ip_origen=ip_origen,
            creado_en=datetime.now(),
        )
        db.add(entrada)
        db.commit()
    except Exception:
        db.rollback()
