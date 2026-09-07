import asyncio
import logging
import os
from datetime import datetime, time, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

logger = logging.getLogger("sigel")

ZONA_TASA = ZoneInfo("America/Caracas")
HORA_PREDETERMINADA = time(1, 0)


def _flag_activa(nombre: str, predeterminado: str = "1") -> bool:
    return os.getenv(nombre, predeterminado).strip().lower() not in {"0", "false", "no"}


def tasa_bcv_auto_activa() -> bool:
    """Sincroniza al arrancar el API, solo si aún no hay tasa de hoy."""
    return _flag_activa("TASA_BCV_AUTO")


def tasa_bcv_diaria_activa() -> bool:
    """Sincroniza todos los días a TASA_BCV_HORA (1:00 Caracas por defecto)."""
    return _flag_activa("TASA_BCV_DIARIA")


def hora_programada_bcv() -> time:
    bruto = os.getenv("TASA_BCV_HORA", "01:00").strip()
    try:
        partes = bruto.split(":")
        hora = int(partes[0])
        minuto = int(partes[1]) if len(partes) > 1 else 0
        return time(hora, minuto)
    except (ValueError, IndexError):
        logger.warning("TASA_BCV_HORA inválida (%s). Se usa 01:00.", bruto)
        return HORA_PREDETERMINADA


def proximo_disparo_bcv(ahora: Optional[datetime] = None) -> datetime:
    """Próxima 01:00 (o TASA_BCV_HORA) en America/Caracas."""
    actual = ahora.astimezone(ZONA_TASA) if ahora else datetime.now(ZONA_TASA)
    marca = hora_programada_bcv()
    candidato = actual.replace(
        hour=marca.hour,
        minute=marca.minute,
        second=0,
        microsecond=0,
    )
    if actual >= candidato:
        candidato += timedelta(days=1)
    return candidato


def ejecutar_sincronizacion_bcv(solo_si_falta: bool = False) -> None:
    from database import SessionLocal
    from modelos.tasa_modelo import sincronizar_tasas_bcv

    db = SessionLocal()
    try:
        resultado = sincronizar_tasas_bcv(db, solo_si_falta=solo_si_falta)
        logger.info("Tasa BCV: %s", resultado.get("mensaje", resultado))
    except Exception as error:
        logger.warning("No se pudo sincronizar la tasa BCV: %s", error)
    finally:
        db.close()


async def bucle_tasa_bcv_diaria() -> None:
    while True:
        espera = (proximo_disparo_bcv() - datetime.now(ZONA_TASA)).total_seconds()
        await asyncio.sleep(max(espera, 1))
        await asyncio.to_thread(ejecutar_sincronizacion_bcv, False)
