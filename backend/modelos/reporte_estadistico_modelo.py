"""Reportes estadísticos parametrizados por rango de fechas reales.

Apoya decisiones del dueño: clientes del periodo, destinos más concurridos,
mes con más movimiento, reservas de un día e ingresos cobrados (pagos aprobados).
No incluye cortes por género ni edad: el maestro de clientes no guarda esos datos.
"""

from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from modelos.cliente_modelo import Cliente
from modelos.cotizacion_modelo import Cotizacion
from modelos.destino_modelo import Destino
from modelos.pago_modelo import Pago, convertir_monto_pago_a_eur
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.reservas_modelo import Reserva
from modelos.viaje_modelo import Viaje

ANIO_MINIMO = 2000
DIAS_MAXIMOS_RANGO = 366 * 10
ESTADOS_RESERVA_ACTIVOS = ("pendiente", "confirmada", "abonada")
MESES_ES = (
    "",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
)


def _inicio_dia(dia: date) -> datetime:
    return datetime.combine(dia, time.min)


def _fin_exclusivo(dia: date) -> datetime:
    return datetime.combine(dia + timedelta(days=1), time.min)


def _etiqueta_mes(clave: str) -> str:
    try:
        anio, mes = clave.split("-")
        indice = int(mes)
        if 1 <= indice <= 12:
            return f"{MESES_ES[indice]} {anio}"
    except (ValueError, AttributeError):
        pass
    return clave


def validar_rango_fechas(desde: Optional[date], hasta: Optional[date]) -> tuple[date, date]:
    """Rechaza años imposibles (p. ej. 500) y rangos invertidos o excesivos."""
    hoy = date.today()
    if desde is None:
        desde = date(hoy.year, 1, 1)
    if hasta is None:
        hasta = hoy

    if desde.year < ANIO_MINIMO or hasta.year < ANIO_MINIMO:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El año del rango no es válido. Use fechas reales del negocio "
                f"(desde {ANIO_MINIMO} en adelante), no años imposibles."
            ),
        )
    if desde > hoy or hasta > hoy:
        raise HTTPException(
            status_code=400,
            detail="No se admiten fechas futuras en reportes. El rango debe llegar como máximo a hoy.",
        )
    if desde > hasta:
        raise HTTPException(
            status_code=400,
            detail="La fecha inicial no puede ser posterior a la fecha final.",
        )
    if (hasta - desde).days > DIAS_MAXIMOS_RANGO:
        raise HTTPException(
            status_code=400,
            detail="El rango no puede superar 10 años.",
        )
    return desde, hasta


def _rango_disponible(db: Session) -> dict:
    minimos = []
    maximos = []
    for columna, modelo in (
        (Cliente.creado_en, Cliente),
        (Reserva.fecha_reserva, Reserva),
        (Cotizacion.creado_en, Cotizacion),
        (Pago.creado_en, Pago),
    ):
        fila = (
            db.query(func.min(columna), func.max(columna))
            .filter(modelo.eliminado_en.is_(None))
            .first()
        )
        if fila and fila[0]:
            minimos.append(fila[0].date() if isinstance(fila[0], datetime) else fila[0])
        if fila and fila[1]:
            maximos.append(fila[1].date() if isinstance(fila[1], datetime) else fila[1])

    if not minimos or not maximos:
        return {"desde": None, "hasta": None}

    return {
        "desde": min(minimos).isoformat(),
        "hasta": max(maximos).isoformat(),
    }


def _filtro_reservas_periodo(desde: date, hasta: date):
    return (
        Reserva.eliminado_en.is_(None),
        Reserva.fecha_reserva >= _inicio_dia(desde),
        Reserva.fecha_reserva < _fin_exclusivo(hasta),
    )


def _join_pasajero_activo():
    return and_(
        ReservaCliente.reserva_id == Reserva.id,
        ReservaCliente.eliminado_en.is_(None),
    )


def generar_reporte_estadistico(
    db: Session,
    desde: Optional[date],
    hasta: Optional[date],
) -> dict:
    desde, hasta = validar_rango_fechas(desde, hasta)
    inicio = _inicio_dia(desde)
    fin = _fin_exclusivo(hasta)
    filtros_reserva = _filtro_reservas_periodo(desde, hasta)

    clientes_nuevos = (
        db.query(func.count(Cliente.id))
        .filter(
            Cliente.eliminado_en.is_(None),
            Cliente.creado_en >= inicio,
            Cliente.creado_en < fin,
        )
        .scalar()
        or 0
    )

    clientes_por_tipo = [
        {"tipo": tipo or "sin_tipo", "total": int(total)}
        for tipo, total in (
            db.query(Cliente.tipo_cliente, func.count(Cliente.id))
            .filter(
                Cliente.eliminado_en.is_(None),
                Cliente.creado_en >= inicio,
                Cliente.creado_en < fin,
            )
            .group_by(Cliente.tipo_cliente)
            .all()
        )
    ]

    reservas_total = (
        db.query(func.count(Reserva.id)).filter(*filtros_reserva).scalar() or 0
    )
    reservas_canceladas = (
        db.query(func.count(Reserva.id))
        .filter(*filtros_reserva, Reserva.estado == "cancelada")
        .scalar()
        or 0
    )
    reservas_activas = (
        db.query(func.count(Reserva.id))
        .filter(*filtros_reserva, Reserva.estado.in_(ESTADOS_RESERVA_ACTIVOS))
        .scalar()
        or 0
    )

    reservas_por_estado = [
        {"estado": estado, "total": int(total)}
        for estado, total in (
            db.query(Reserva.estado, func.count(Reserva.id))
            .filter(*filtros_reserva)
            .group_by(Reserva.estado)
            .all()
        )
    ]

    pasajeros_fila = (
        db.query(
            func.count(ReservaCliente.id),
            func.sum(case((ReservaCliente.es_menor.is_(True), 1), else_=0)),
        )
        .join(Reserva, Reserva.id == ReservaCliente.reserva_id)
        .filter(
            *filtros_reserva,
            Reserva.estado.in_(ESTADOS_RESERVA_ACTIVOS),
            ReservaCliente.eliminado_en.is_(None),
        )
        .first()
    )
    pasajeros = int(pasajeros_fila[0] or 0) if pasajeros_fila else 0
    pasajeros_menores = int(pasajeros_fila[1] or 0) if pasajeros_fila else 0

    cotizaciones_total = (
        db.query(func.count(Cotizacion.id))
        .filter(
            Cotizacion.eliminado_en.is_(None),
            Cotizacion.creado_en >= inicio,
            Cotizacion.creado_en < fin,
        )
        .scalar()
        or 0
    )

    destinos_reservados = [
        {
            "id": int(destino_id),
            "nombre": nombre,
            "reservas": int(reservas),
            "pasajeros": int(pasajeros_destino or 0),
        }
        for destino_id, nombre, reservas, pasajeros_destino in (
            db.query(
                Destino.id,
                Destino.nombre,
                func.count(func.distinct(Reserva.id)),
                func.count(ReservaCliente.id),
            )
            .join(Viaje, Viaje.destino_id == Destino.id)
            .join(Reserva, Reserva.viaje_id == Viaje.id)
            .outerjoin(ReservaCliente, _join_pasajero_activo())
            .filter(
                *filtros_reserva,
                Reserva.estado.in_(ESTADOS_RESERVA_ACTIVOS),
                Destino.eliminado_en.is_(None),
                Viaje.eliminado_en.is_(None),
            )
            .group_by(Destino.id, Destino.nombre)
            .order_by(func.count(func.distinct(Reserva.id)).desc())
            .limit(10)
            .all()
        )
    ]

    destinos_cotizados = [
        {"id": int(destino_id), "nombre": nombre, "cotizaciones": int(total)}
        for destino_id, nombre, total in (
            db.query(Destino.id, Destino.nombre, func.count(Cotizacion.id))
            .join(Cotizacion, Cotizacion.destino_id == Destino.id)
            .filter(
                Cotizacion.eliminado_en.is_(None),
                Cotizacion.creado_en >= inicio,
                Cotizacion.creado_en < fin,
                Destino.eliminado_en.is_(None),
            )
            .group_by(Destino.id, Destino.nombre)
            .order_by(func.count(Cotizacion.id).desc())
            .limit(10)
            .all()
        )
    ]

    clave_mes = func.date_format(Reserva.fecha_reserva, "%Y-%m")
    movimiento_reservas = {
        mes: {"mes": mes, "reservas": int(reservas), "pasajeros": int(pasajeros_mes or 0)}
        for mes, reservas, pasajeros_mes in (
            db.query(
                clave_mes,
                func.count(func.distinct(Reserva.id)),
                func.count(ReservaCliente.id),
            )
            .outerjoin(ReservaCliente, _join_pasajero_activo())
            .filter(*filtros_reserva, Reserva.estado.in_(ESTADOS_RESERVA_ACTIVOS))
            .group_by(clave_mes)
            .all()
        )
        if mes
    }

    fecha_pago_efectiva = func.coalesce(Pago.fecha_pago, func.date(Pago.creado_en))
    pagos_aprobados = (
        db.query(Pago)
        .filter(
            Pago.eliminado_en.is_(None),
            Pago.estado == "aprobado",
            fecha_pago_efectiva >= desde,
            fecha_pago_efectiva <= hasta,
        )
        .all()
    )

    ingresos_por_mes: dict[str, float] = {}
    ingresos_total = 0.0
    for pago in pagos_aprobados:
        monto_eur, _ = convertir_monto_pago_a_eur(db, pago)
        ingresos_total += monto_eur
        fecha_ref = pago.fecha_pago or (pago.creado_en.date() if pago.creado_en else None)
        if fecha_ref:
            clave = fecha_ref.strftime("%Y-%m")
            ingresos_por_mes[clave] = round(ingresos_por_mes.get(clave, 0.0) + monto_eur, 2)

    claves_mes = sorted(set(movimiento_reservas.keys()) | set(ingresos_por_mes.keys()))
    movimiento_mensual = []
    for clave in claves_mes:
        fila = movimiento_reservas.get(clave, {"mes": clave, "reservas": 0, "pasajeros": 0})
        movimiento_mensual.append(
            {
                "mes": clave,
                "etiqueta": _etiqueta_mes(clave),
                "reservas": fila["reservas"],
                "pasajeros": fila["pasajeros"],
                "ingresos_eur": round(ingresos_por_mes.get(clave, 0.0), 2),
            }
        )

    mes_mayor = None
    if movimiento_mensual:
        mes_mayor = max(
            movimiento_mensual,
            key=lambda item: (item["reservas"], item["pasajeros"], item["ingresos_eur"]),
        )

    clave_dia = func.date(Reserva.fecha_reserva)
    reservas_por_dia = [
        {
            "fecha": dia.isoformat() if hasattr(dia, "isoformat") else str(dia),
            "reservas": int(reservas),
            "pasajeros": int(pasajeros_dia or 0),
        }
        for dia, reservas, pasajeros_dia in (
            db.query(
                clave_dia,
                func.count(func.distinct(Reserva.id)),
                func.count(ReservaCliente.id),
            )
            .outerjoin(ReservaCliente, _join_pasajero_activo())
            .filter(*filtros_reserva)
            .group_by(clave_dia)
            .order_by(clave_dia.asc())
            .all()
        )
        if dia
    ]

    reservas_del_periodo = []
    for reserva_id, fecha_reserva, estado, destino_nombre, cantidad_pasajeros in (
        db.query(
            Reserva.id,
            Reserva.fecha_reserva,
            Reserva.estado,
            Destino.nombre,
            func.count(ReservaCliente.id),
        )
        .join(Viaje, Viaje.id == Reserva.viaje_id)
        .join(Destino, Destino.id == Viaje.destino_id)
        .outerjoin(ReservaCliente, _join_pasajero_activo())
        .filter(*filtros_reserva)
        .group_by(Reserva.id, Reserva.fecha_reserva, Reserva.estado, Destino.nombre)
        .order_by(Reserva.fecha_reserva.desc())
        .limit(50)
        .all()
    ):
        reservas_del_periodo.append(
            {
                "id": reserva_id,
                "fecha": fecha_reserva.date().isoformat(),
                "destino": destino_nombre,
                "pasajeros": int(cantidad_pasajeros or 0),
                "estado": estado,
            }
        )

    return {
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "rango_disponible": _rango_disponible(db),
        "limitaciones": {
            "sin_genero_ni_edad": True,
            "nota": (
                "No se reporta por género ni rango de edad porque el maestro de "
                "clientes no registra esos datos. El corte demográfico disponible "
                "es adulto / menor según la reserva."
            ),
        },
        "resumen": {
            "clientes_nuevos": int(clientes_nuevos),
            "reservas": int(reservas_total),
            "reservas_activas": int(reservas_activas),
            "reservas_canceladas": int(reservas_canceladas),
            "pasajeros": pasajeros,
            "pasajeros_adultos": pasajeros - pasajeros_menores,
            "pasajeros_menores": pasajeros_menores,
            "cotizaciones": int(cotizaciones_total),
            "ingresos_aprobados_eur": round(ingresos_total, 2),
            "pagos_aprobados": len(pagos_aprobados),
        },
        "clientes_por_tipo": clientes_por_tipo,
        "reservas_por_estado": reservas_por_estado,
        "destinos_mas_reservados": destinos_reservados,
        "destinos_mas_cotizados": destinos_cotizados,
        "movimiento_mensual": movimiento_mensual,
        "mes_mayor_movimiento": mes_mayor,
        "reservas_por_dia": reservas_por_dia,
        "reservas_del_periodo": reservas_del_periodo,
    }
