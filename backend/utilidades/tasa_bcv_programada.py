import logging
import os

logger = logging.getLogger("sigel")


def tasa_bcv_auto_activa() -> bool:
    """Sincroniza al arrancar el API, solo si aún no hay tasa de hoy."""
    valor = os.getenv("TASA_BCV_AUTO", "0").strip().lower()
    return valor not in {"0", "false", "no", ""}


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
