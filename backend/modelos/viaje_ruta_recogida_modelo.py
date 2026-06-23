from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Session

from database import Base
from modelos.cliente_modelo import Cliente, buscar_ciudad, buscar_estado
from modelos.punto_recogida_modelo import PuntoRecogida, punto_recogida_a_dict
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.reservas_modelo import Reserva
from modelos.viaje_modelo import Viaje


class ViajeRutaRecogida(Base):
    __tablename__ = "viajes_ruta_recogida"

    id = Column(BigInteger, primary_key=True, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    reserva_cliente_id = Column(BigInteger, ForeignKey("reserva_clientes.id"), nullable=False, index=True)
    orden = Column(Integer, nullable=False)
    hora_programada = Column(DateTime, nullable=True)
    notas = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def _validar_viaje(db: Session, viaje_id: int) -> Viaje:
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
    ).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return viaje


def _domicilio_dict(db: Session, punto_id: int | None) -> dict | None:
    if punto_id is None:
        return None
    punto = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_id,
        PuntoRecogida.eliminado_en.is_(None),
    ).first()
    if punto is None:
        return None
    return punto_recogida_a_dict(punto)


def _cliente_resumen(db: Session, cliente: Cliente) -> dict:
    estado = buscar_estado(db, cliente.estado_id)
    ciudad = buscar_ciudad(db, cliente.ciudad_id)
    return {
        "id": cliente.id,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "telefono": cliente.telefono,
        "telefono_secundario": cliente.telefono_secundario,
        "estado": estado.nombre if estado else None,
        "ciudad": ciudad.nombre if ciudad else None,
    }


def _viajeros_del_viaje(db: Session, viaje_id: int) -> list[tuple[ReservaCliente, Reserva, Cliente]]:
    filas = (
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
        .order_by(Reserva.id.asc(), ReservaCliente.es_titular.desc(), ReservaCliente.id.asc())
        .all()
    )
    return filas


def _validar_reserva_cliente_del_viaje(
    db: Session,
    viaje_id: int,
    reserva_cliente_id: int,
) -> tuple[ReservaCliente, Reserva, Cliente]:
    fila = (
        db.query(ReservaCliente, Reserva, Cliente)
        .join(Reserva, Reserva.id == ReservaCliente.reserva_id)
        .join(Cliente, Cliente.id == ReservaCliente.cliente_id)
        .filter(
            ReservaCliente.id == reserva_cliente_id,
            ReservaCliente.eliminado_en.is_(None),
            Reserva.viaje_id == viaje_id,
            Reserva.eliminado_en.is_(None),
            Reserva.estado != "cancelada",
        )
        .first()
    )
    if fila is None:
        raise HTTPException(
            status_code=400,
            detail=f"El viajero {reserva_cliente_id} no pertenece a una reserva activa de este viaje",
        )
    return fila


def _item_candidato(
    db: Session,
    pasajero: ReservaCliente,
    reserva: Reserva,
    cliente: Cliente,
    orden_ruta: int | None,
    en_ruta: bool,
) -> dict:
    return {
        "reserva_cliente_id": pasajero.id,
        "reserva_id": reserva.id,
        "reserva_estado": reserva.estado,
        "es_titular": pasajero.es_titular,
        "es_menor": pasajero.es_menor,
        "cliente": _cliente_resumen(db, cliente),
        "domicilio": _domicilio_dict(db, pasajero.punto_recogida_id),
        "en_ruta": en_ruta,
        "orden_ruta": orden_ruta,
    }


def _item_ruta(
    db: Session,
    ruta: ViajeRutaRecogida,
    pasajero: ReservaCliente,
    reserva: Reserva,
    cliente: Cliente,
) -> dict:
    return {
        "id": ruta.id,
        "viaje_id": ruta.viaje_id,
        "orden": ruta.orden,
        "hora_programada": ruta.hora_programada.isoformat() if ruta.hora_programada else None,
        "notas": ruta.notas,
        "reserva_cliente_id": pasajero.id,
        "reserva_id": reserva.id,
        "reserva_estado": reserva.estado,
        "es_titular": pasajero.es_titular,
        "es_menor": pasajero.es_menor,
        "cliente": _cliente_resumen(db, cliente),
        "domicilio": _domicilio_dict(db, pasajero.punto_recogida_id),
    }


def listar_candidatos_ruta_recogida(db: Session, viaje_id: int) -> dict:
    _validar_viaje(db, viaje_id)
    viajeros = _viajeros_del_viaje(db, viaje_id)

    rutas_activas = (
        db.query(ViajeRutaRecogida)
        .filter(
            ViajeRutaRecogida.viaje_id == viaje_id,
            ViajeRutaRecogida.eliminado_en.is_(None),
        )
        .all()
    )
    orden_por_viajero = {r.reserva_cliente_id: r.orden for r in rutas_activas}
    ids_en_ruta = set(orden_por_viajero.keys())

    candidatos = []
    reservas_ids = set()
    sin_domicilio = 0
    for pasajero, reserva, cliente in viajeros:
        reservas_ids.add(reserva.id)
        if pasajero.punto_recogida_id is None:
            sin_domicilio += 1
        en_ruta = pasajero.id in ids_en_ruta
        candidatos.append(
            _item_candidato(
                db,
                pasajero,
                reserva,
                cliente,
                orden_ruta=orden_por_viajero.get(pasajero.id),
                en_ruta=en_ruta,
            )
        )

    return {
        "viaje_id": viaje_id,
        "reservas_activas": len(reservas_ids),
        "viajeros_total": len(candidatos),
        "viajeros_sin_domicilio": sin_domicilio,
        "viajeros_en_ruta": len(ids_en_ruta),
        "candidatos": candidatos,
    }


def listar_ruta_recogida(db: Session, viaje_id: int) -> dict:
    _validar_viaje(db, viaje_id)

    filas = (
        db.query(ViajeRutaRecogida, ReservaCliente, Reserva, Cliente)
        .join(ReservaCliente, ReservaCliente.id == ViajeRutaRecogida.reserva_cliente_id)
        .join(Reserva, Reserva.id == ReservaCliente.reserva_id)
        .join(Cliente, Cliente.id == ReservaCliente.cliente_id)
        .filter(
            ViajeRutaRecogida.viaje_id == viaje_id,
            ViajeRutaRecogida.eliminado_en.is_(None),
            ReservaCliente.eliminado_en.is_(None),
        )
        .order_by(ViajeRutaRecogida.orden.asc())
        .all()
    )

    paradas = [
        _item_ruta(db, ruta, pasajero, reserva, cliente)
        for ruta, pasajero, reserva, cliente in filas
    ]

    candidatos_info = listar_candidatos_ruta_recogida(db, viaje_id)

    return {
        "viaje_id": viaje_id,
        "total_paradas": len(paradas),
        "viajeros_pendientes": candidatos_info["viajeros_total"] - candidatos_info["viajeros_en_ruta"],
        "paradas": paradas,
    }


def guardar_ruta_recogida(
    db: Session,
    viaje_id: int,
    paradas: list,
) -> dict:
    _validar_viaje(db, viaje_id)

    if not paradas:
        db.query(ViajeRutaRecogida).filter(
            ViajeRutaRecogida.viaje_id == viaje_id,
        ).delete(synchronize_session=False)
        db.commit()
        return listar_ruta_recogida(db, viaje_id)

    ordenes = [item.orden for item in paradas]
    if len(set(ordenes)) != len(ordenes):
        raise HTTPException(status_code=400, detail="Hay ordenes duplicados en la ruta")

    ids = [item.reserva_cliente_id for item in paradas]
    if len(set(ids)) != len(ids):
        raise HTTPException(status_code=400, detail="Hay viajeros duplicados en la ruta")

    for item in paradas:
        pasajero, reserva, cliente = _validar_reserva_cliente_del_viaje(
            db, viaje_id, item.reserva_cliente_id
        )
        if pasajero.punto_recogida_id is None:
            nombre = f"{cliente.nombre} {cliente.apellido}".strip()
            raise HTTPException(
                status_code=400,
                detail=f"El viajero {nombre} no tiene domicilio de recogida registrado",
            )

    ahora = datetime.now()
    db.query(ViajeRutaRecogida).filter(
        ViajeRutaRecogida.viaje_id == viaje_id,
    ).delete(synchronize_session=False)

    for item in sorted(paradas, key=lambda p: p.orden):
        db.add(
            ViajeRutaRecogida(
                viaje_id=viaje_id,
                reserva_cliente_id=item.reserva_cliente_id,
                orden=item.orden,
                hora_programada=item.hora_programada,
                notas=item.notas,
                creado_en=ahora,
                actualizado_en=ahora,
            )
        )

    db.commit()
    return listar_ruta_recogida(db, viaje_id)
