"""Reglas de la historia hablada (sin WhatsApp)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from fastapi import HTTPException

MODALIDADES = ("individual", "grupo", "propio")
TIPOS_HOSPEDAJE = ("compartido", "particular")
EDAD_MIN_MENOR = 1
EDAD_MAX_MENOR = 17
EDAD_MAX_PIERNAS = 5
RECARGO_MENOR_POR_DEFECTO = 7.00
MOTIVO_CREDITO_CANCELACION = "cancelacion_sin_reembolso"


def normalizar_modalidad(valor: Optional[str], por_defecto: str = "individual") -> str:
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return por_defecto
    limpio = valor.strip().lower()
    if limpio not in MODALIDADES:
        raise HTTPException(
            status_code=400,
            detail="La modalidad debe ser individual, grupo o propio",
        )
    return limpio


def normalizar_hospedaje(valor: Optional[str], por_defecto: str = "compartido") -> str:
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return por_defecto
    limpio = valor.strip().lower()
    if limpio not in TIPOS_HOSPEDAJE:
        raise HTTPException(
            status_code=400,
            detail="El hospedaje debe ser compartido o particular",
        )
    return limpio


def parsear_fecha(valor) -> Optional[date]:
    if valor is None or valor == "":
        return None
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    texto = str(valor).strip()[:10]
    try:
        return datetime.strptime(texto, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="fecha_nacimiento debe tener formato AAAA-MM-DD",
        ) from exc


def edad_en_anos(fecha_nacimiento: date, referencia: Optional[date] = None) -> int:
    hoy = referencia or date.today()
    return hoy.year - fecha_nacimiento.year - (
        (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day)
    )


def resolver_politica_menor(
    es_menor: bool,
    fecha_nacimiento,
    ocupa_asiento: Optional[bool],
    recargo_destino_eur: float,
    partida_nacimiento_url: Optional[str] = None,
    exigir_partida: bool = False,
) -> tuple[bool, bool, float, Optional[date], Optional[int]]:
    """Devuelve es_menor, ocupa_asiento, recargo, fecha, edad.

    Niños de 1 a 5 años viajan en las piernas (no ocupan asiento) y pagan recargo.
    """
    if not es_menor:
        ocupa = True if ocupa_asiento is None else bool(ocupa_asiento)
        return False, ocupa, 0.0, None, None

    nacimiento = parsear_fecha(fecha_nacimiento)
    if nacimiento is None:
        raise HTTPException(
            status_code=400,
            detail="Los menores deben registrar fecha de nacimiento",
        )
    if nacimiento > date.today():
        raise HTTPException(status_code=400, detail="La fecha de nacimiento no puede ser futura")

    edad = edad_en_anos(nacimiento)
    if edad < EDAD_MIN_MENOR or edad > EDAD_MAX_MENOR:
        raise HTTPException(
            status_code=400,
            detail="Solo se registran como menores a niños de 1 a 17 años",
        )

    if exigir_partida and not (partida_nacimiento_url or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Debes adjuntar la partida de nacimiento del menor",
        )

    en_piernas = edad <= EDAD_MAX_PIERNAS
    if ocupa_asiento is None:
        ocupa = not en_piernas
    else:
        ocupa = bool(ocupa_asiento)
        if en_piernas is False and not ocupa:
            raise HTTPException(
                status_code=400,
                detail="Los menores de 6 años o más ocupan un asiento propio",
            )

    recargo = float(recargo_destino_eur or 0) if (es_menor and not ocupa) else 0.0
    return True, ocupa, recargo, nacimiento, edad
