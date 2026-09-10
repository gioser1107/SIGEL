from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ZONA_OPERATIVA = ZoneInfo("America/Caracas")


def ahora_caracas() -> datetime:
    return datetime.now(ZONA_OPERATIVA)


def fecha_operativa_hoy() -> date:
    return ahora_caracas().date()


def fecha_operativa_manana() -> date:
    return fecha_operativa_hoy() + timedelta(days=1)
