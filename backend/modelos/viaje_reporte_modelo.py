from collections import Counter

from sqlalchemy.orm import Session

from modelos.abordaje_viaje_modelo import (
    ESTADO_PENDIENTE,
    _abordaje_activo,
    _asiento_pasajero,
    _cliente_resumen,
    _domicilio_dict,
    _orden_ruta_por_viajero,
    _ordenar_manifiesto,
    abordaje_a_dict,
)
from modelos.cliente_modelo import Cliente
from modelos.pago_modelo import calcular_resumen_pagos_reserva
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.reservas_modelo import Reserva
from modelos.viaje_modelo import asientos_disponibles, obtener_viaje_activo, viaje_a_dict


def _pasajeros_reporte_viaje(db: Session, viaje_id: int) -> list[tuple[ReservaCliente, Reserva, Cliente]]:
    return (
        db.query(ReservaCliente, Reserva, Cliente)
        .join(Reserva, Reserva.id == ReservaCliente.reserva_id)
        .join(Cliente, Cliente.id == ReservaCliente.cliente_id)
        .filter(
            Reserva.viaje_id == viaje_id,
            Reserva.eliminado_en.is_(None),
            Reserva.estado != "cancelada",
            ReservaCliente.eliminado_en.is_(None),
            Cliente.eliminado_en.is_(None),
        )
        .all()
    )


def _item_pasajero_reporte(
    db: Session,
    viaje_id: int,
    pasajero: ReservaCliente,
    reserva: Reserva,
    cliente: Cliente,
    orden_ruta: dict[int, dict],
    resumen_pagos: dict,
) -> dict:
    abordaje = _abordaje_activo(db, pasajero.id)
    ruta = orden_ruta.get(pasajero.id)
    asiento = _asiento_pasajero(db, viaje_id, pasajero.id)

    return {
        "reserva_cliente_id": pasajero.id,
        "reserva_id": reserva.id,
        "reserva_estado": reserva.estado,
        "es_titular": pasajero.es_titular,
        "es_menor": pasajero.es_menor,
        "ocupa_asiento": pasajero.ocupa_asiento,
        "cliente": _cliente_resumen(db, cliente),
        "domicilio": _domicilio_dict(db, pasajero.punto_recogida_id),
        "asiento": asiento,
        "orden_ruta": ruta["orden"] if ruta else None,
        "hora_recogida_programada": ruta["hora_programada"] if ruta else None,
        "estado_abordaje": abordaje.estado if abordaje else ESTADO_PENDIENTE,
        "abordaje": abordaje_a_dict(db, abordaje),
        "resumen_pagos": {
            "total_reserva_eur": resumen_pagos.get("total_reserva_eur"),
            "total_pagado_aprobado_eur": resumen_pagos.get("total_pagado_aprobado_eur"),
            "total_pendiente_validacion_eur": resumen_pagos.get("total_pendiente_validacion_eur"),
            "saldo_pendiente_eur": resumen_pagos.get("saldo_pendiente_eur"),
            "pagado_completo": resumen_pagos.get("pagado_completo"),
            "deposito_minimo_cumplido": resumen_pagos.get("deposito_minimo_cumplido"),
        },
    }


def obtener_reporte_viaje(db: Session, viaje_id: int) -> dict:
    viaje = obtener_viaje_activo(db, viaje_id)
    orden_ruta = _orden_ruta_por_viajero(db, viaje_id)
    filas = _pasajeros_reporte_viaje(db, viaje_id)

    resumenes_por_reserva: dict[int, dict] = {}
    reservas_vistas: dict[int, Reserva] = {}
    for pasajero, reserva, _cliente in filas:
        reservas_vistas[reserva.id] = reserva
        if reserva.id not in resumenes_por_reserva:
            try:
                resumenes_por_reserva[reserva.id] = calcular_resumen_pagos_reserva(db, reserva)
            except ValueError:
                resumenes_por_reserva[reserva.id] = {
                    "total_reserva_eur": 0,
                    "total_pagado_aprobado_eur": 0,
                    "total_pendiente_validacion_eur": 0,
                    "saldo_pendiente_eur": 0,
                    "pagado_completo": False,
                    "deposito_minimo_cumplido": False,
                }

    pasajeros = [
        _item_pasajero_reporte(
            db,
            viaje_id,
            pasajero,
            reserva,
            cliente,
            orden_ruta,
            resumenes_por_reserva[reserva.id],
        )
        for pasajero, reserva, cliente in filas
    ]
    pasajeros = _ordenar_manifiesto(pasajeros)

    ocupacion = asientos_disponibles(db, viaje_id)

    total_reservado_eur = round(
        sum(r.get("total_reserva_eur", 0) or 0 for r in resumenes_por_reserva.values()),
        2,
    )
    total_cobrado_eur = round(
        sum(r.get("total_pagado_aprobado_eur", 0) or 0 for r in resumenes_por_reserva.values()),
        2,
    )
    saldo_pendiente_eur = round(
        sum(r.get("saldo_pendiente_eur", 0) or 0 for r in resumenes_por_reserva.values()),
        2,
    )
    reservas_pagadas = sum(1 for r in resumenes_por_reserva.values() if r.get("pagado_completo"))
    reservas_con_saldo = sum(
        1 for r in resumenes_por_reserva.values() if (r.get("saldo_pendiente_eur") or 0) > 0.01
    )

    reservas_por_estado = Counter(reserva.estado for reserva in reservas_vistas.values())

    reservas_resumen = []
    for reserva_id, reserva in sorted(reservas_vistas.items(), key=lambda x: x[0]):
        titular_fila = next(
            (f for f in filas if f[1].id == reserva_id and f[0].es_titular),
            None,
        )
        titular_cliente = titular_fila[2] if titular_fila else None

        resumen = resumenes_por_reserva[reserva_id]
        cantidad_pasajeros = sum(1 for p, r, _ in filas if r.id == reserva_id)
        reservas_resumen.append({
            "id": reserva_id,
            "estado": reserva.estado,
            "fecha_reserva": reserva.fecha_reserva.isoformat() if reserva.fecha_reserva else None,
            "titular": (
                {
                    "id": titular_cliente.id,
                    "nombre": titular_cliente.nombre,
                    "apellido": titular_cliente.apellido,
                    "telefono": titular_cliente.telefono,
                }
                if titular_cliente
                else None
            ),
            "cantidad_pasajeros": cantidad_pasajeros,
            "resumen_pagos": resumen,
        })

    return {
        "viaje": viaje_a_dict(db, viaje),
        "ocupacion": {
            "total_asientos": ocupacion["total_asientos"],
            "total_ocupados": ocupacion["total_ocupados"],
            "total_disponibles": ocupacion["total_disponibles"],
        },
        "resumen": {
            "total_reservas": len(reservas_vistas),
            "total_pasajeros": len(pasajeros),
            "reservas_por_estado": dict(reservas_por_estado),
            "total_reservado_eur": total_reservado_eur,
            "total_cobrado_eur": total_cobrado_eur,
            "saldo_pendiente_eur": saldo_pendiente_eur,
            "reservas_pagadas_completas": reservas_pagadas,
            "reservas_con_saldo": reservas_con_saldo,
        },
        "reservas": reservas_resumen,
        "pasajeros": pasajeros,
    }
