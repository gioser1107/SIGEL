"""Copia de seguridad diaria sin intervención del administrador."""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timedelta

from utilidades.respaldo import (
    HORA_PROGRAMADA,
    MINUTO_PROGRAMADO,
    ZONA_LOCAL,
    generar_respaldo_si_hace_falta,
    respaldo_auto_activo,
)

logger = logging.getLogger("sigel")
_hilo_iniciado = False


def _segundos_hasta_proxima() -> float:
    ahora = datetime.now(ZONA_LOCAL)
    proxima = ahora.replace(
        hour=HORA_PROGRAMADA, minute=MINUTO_PROGRAMADO, second=0, microsecond=0
    )
    if ahora >= proxima:
        proxima += timedelta(days=1)
    return max(30.0, (proxima - ahora).total_seconds())


def ejecutar_respaldo_si_hace_falta() -> None:
    try:
        resultado = generar_respaldo_si_hace_falta()
        if resultado.get("omitido"):
            logger.info("Respaldo automático: %s", resultado.get("motivo"))
            return
        logger.info(
            "Respaldo automático %s (%s archivos)",
            resultado.get("marca"),
            len(resultado.get("archivos") or []),
        )
    except Exception as error:
        logger.warning("No se pudo generar el respaldo automático: %s", error)


def _ciclo() -> None:
    ejecutar_respaldo_si_hace_falta()
    while True:
        time.sleep(_segundos_hasta_proxima())
        ejecutar_respaldo_si_hace_falta()


def arrancar_respaldo_automatico() -> None:
    global _hilo_iniciado
    if not respaldo_auto_activo() or _hilo_iniciado:
        return
    _hilo_iniciado = True
    hilo = threading.Thread(target=_ciclo, name="sigel-respaldo", daemon=True)
    hilo.start()
    logger.info(
        "Copia de seguridad automática activa (diaria %02d:%02d %s)",
        HORA_PROGRAMADA,
        MINUTO_PROGRAMADO,
        ZONA_LOCAL.key,
    )
