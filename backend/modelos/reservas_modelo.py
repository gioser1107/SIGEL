from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Session

from database import Base
from modelos.asiento_modelo import Asiento
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.cliente_modelo import Cliente
from modelos.destino_modelo import Destino
from modelos.punto_recogida_modelo import PuntoRecogida
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.viaje_modelo import Viaje, viaje_disponible_para_reserva, viaje_reserva_a_dict


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    fecha_reserva = Column(DateTime, nullable=False)
    estado = Column(
        Enum("pendiente", "confirmada", "abonada", "cancelada"),
        nullable=False,
        default="pendiente",
    )
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def obtener_reserva_activa(db: Session, reserva_id: int) -> Reserva:
    reserva = db.query(Reserva).filter(
        Reserva.id == reserva_id,
        Reserva.eliminado_en.is_(None),
    ).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva


def obtener_pasajero_activo(db: Session, reserva_id: int, pasajero_id: int) -> ReservaCliente:
    pasajero = db.query(ReservaCliente).filter(
        ReservaCliente.id == pasajero_id,
        ReservaCliente.reserva_id == reserva_id,
    ).first()
    if not pasajero:
        raise HTTPException(status_code=404, detail="Pasajero no encontrado en esta reserva")
    return pasajero


def validar_viaje_para_reserva(db: Session, viaje_id: int) -> Viaje:
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
    ).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if not viaje_disponible_para_reserva(db, viaje):
        raise HTTPException(
            status_code=400,
            detail="El viaje no está disponible para reservar (sin unidad, sin asientos o cupo completo)",
        )
    return viaje


def buscar_o_crear_cliente(
    db: Session, tipo_doc: str, num_doc: str, nombre: str, apellido: str,
) -> Cliente:
    cliente = db.query(Cliente).filter(
        Cliente.tipo_documento == tipo_doc,
        Cliente.numero_documento == num_doc.strip(),
        Cliente.eliminado_en.is_(None),
    ).first()
    if cliente:
        return cliente

    ahora = datetime.now()
    nuevo = Cliente(
        tipo_cliente="natural",
        tipo_documento=tipo_doc or "V",
        numero_documento=num_doc.strip(),
        nombre=nombre,
        apellido=apellido,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.flush()
    return nuevo


def pasajero_a_dict(p: ReservaCliente, cliente: Cliente, punto_nombre: Optional[str]) -> dict:
    return {
        "id": p.id,
        "reserva_id": p.reserva_id,
        "cliente_id": p.cliente_id,
        "es_titular": p.es_titular,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "es_menor": p.es_menor,
        "ocupa_asiento": p.ocupa_asiento,
        "precio_pasajero_eur": float(p.precio_pasajero_eur),
        "recargo_eur": float(p.recargo_eur),
        "notas_tarifa": p.notas_tarifa,
        "punto_recogida_id": p.punto_recogida_id,
        "punto_recogida_nombre": punto_nombre,
    }


def reserva_a_dict(reserva: Reserva) -> dict:
    return {
        "id": reserva.id,
        "cliente_id": reserva.cliente_id,
        "viaje_id": reserva.viaje_id,
        "fecha_reserva": reserva.fecha_reserva,
        "estado": reserva.estado,
        "creado_en": reserva.creado_en,
        "actualizado_en": reserva.actualizado_en,
    }


def listar_viajes_disponibles(db: Session) -> list[dict]:
    viajes = (
        db.query(Viaje)
        .filter(
            Viaje.eliminado_en.is_(None),
            Viaje.estado.notin_(("finalizado", "cancelado")),
        )
        .order_by(Viaje.fecha_salida.asc())
        .all()
    )
    return [viaje_reserva_a_dict(db, v) for v in viajes if viaje_disponible_para_reserva(db, v)]


def validar_punto_recogida(db: Session, punto_id: int) -> None:
    punto = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_id,
        PuntoRecogida.eliminado_en.is_(None),
    ).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto de recogida no encontrado")


def crear_reserva_desde_landing(
    db: Session,
    viaje_id: int,
    cliente_id: int,
    usuario_id: int,
    titular_punto_recogida_id: Optional[int],
    pasajeros_extra: list,
) -> Reserva:
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")

    viaje = validar_viaje_para_reserva(db, viaje_id)

    destino = db.query(Destino).filter(Destino.id == viaje.destino_id).first()
    recargo_menor = float(destino.recargo_menor_eur) if destino and destino.recargo_menor_eur else 0.0

    if titular_punto_recogida_id:
        validar_punto_recogida(db, titular_punto_recogida_id)

    ahora = datetime.now()
    nueva_reserva = Reserva(
        cliente_id=cliente_id,
        viaje_id=viaje_id,
        fecha_reserva=ahora,
        estado="pendiente",
        creado_por=usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_reserva)
    db.flush()

    db.add(ReservaCliente(
        reserva_id=nueva_reserva.id,
        cliente_id=cliente_id,
        es_titular=True,
        es_menor=False,
        ocupa_asiento=True,
        precio_pasajero_eur=0,
        recargo_eur=0,
        punto_recogida_id=titular_punto_recogida_id,
        creado_en=ahora,
        actualizado_en=ahora,
    ))

    for p in pasajeros_extra:
        acomp = buscar_o_crear_cliente(
            db, p.tipo_documento, p.numero_documento, p.nombre, p.apellido,
        )
        ya_existe = db.query(ReservaCliente).filter(
            ReservaCliente.reserva_id == nueva_reserva.id,
            ReservaCliente.cliente_id == acomp.id,
            ReservaCliente.eliminado_en.is_(None),
        ).first()
        if ya_existe:
            continue

        es_menor = getattr(p, 'es_menor', False)
        db.add(ReservaCliente(
            reserva_id=nueva_reserva.id,
            cliente_id=acomp.id,
            es_titular=False,
            es_menor=es_menor,
            ocupa_asiento=not es_menor,
            precio_pasajero_eur=0,
            recargo_eur=recargo_menor if es_menor else 0,
            punto_recogida_id=p.punto_recogida_id,
            creado_en=ahora,
            actualizado_en=ahora,
        ))

    db.commit()
    db.refresh(nueva_reserva)
    return nueva_reserva


def listar_reservas(
    db: Session,
    viaje_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    estado: Optional[str] = None,
) -> list[dict]:
    consulta = db.query(Reserva).filter(Reserva.eliminado_en.is_(None))
    if viaje_id:
        consulta = consulta.filter(Reserva.viaje_id == viaje_id)
    if cliente_id:
        consulta = consulta.filter(Reserva.cliente_id == cliente_id)
    if estado:
        consulta = consulta.filter(Reserva.estado == estado)

    return [reserva_a_dict(r) for r in consulta.order_by(Reserva.creado_en.desc()).all()]


def crear_reserva(
    db: Session,
    cliente_id: int,
    viaje_id: int,
    estado: str,
    usuario_id: int,
) -> Reserva:
    validar_viaje_para_reserva(db, viaje_id)

    ahora = datetime.now()
    nueva_reserva = Reserva(
        cliente_id=cliente_id,
        viaje_id=viaje_id,
        fecha_reserva=ahora,
        estado=estado,
        creado_por=usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_reserva)
    db.commit()
    db.refresh(nueva_reserva)
    return nueva_reserva


def actualizar_reserva(db: Session, reserva_id: int, estado: Optional[str]) -> Reserva:
    reserva = obtener_reserva_activa(db, reserva_id)
    if estado:
        reserva.estado = estado
    reserva.actualizado_en = datetime.now()
    db.commit()
    db.refresh(reserva)
    return reserva


def eliminar_reserva(db: Session, reserva_id: int) -> None:
    reserva = obtener_reserva_activa(db, reserva_id)
    ahora = datetime.now()
    reserva.eliminado_en = ahora
    reserva.actualizado_en = ahora
    db.commit()


def listar_pasajeros_reserva(db: Session, reserva_id: int) -> list[dict]:
    obtener_reserva_activa(db, reserva_id)

    pasajeros = (
        db.query(ReservaCliente)
        .filter(
            ReservaCliente.reserva_id == reserva_id,
            ReservaCliente.eliminado_en.is_(None),
        )
        .order_by(ReservaCliente.es_titular.desc(), ReservaCliente.creado_en)
        .all()
    )

    cliente_ids = [p.cliente_id for p in pasajeros]
    clientes = {
        c.id: c
        for c in db.query(Cliente).filter(Cliente.id.in_(cliente_ids)).all()
    }

    punto_ids = {p.punto_recogida_id for p in pasajeros if p.punto_recogida_id}
    puntos = {}
    if punto_ids:
        for pr in db.query(PuntoRecogida).filter(PuntoRecogida.id.in_(punto_ids)).all():
            puntos[pr.id] = pr.nombre

    resultado = []
    for p in pasajeros:
        cliente = clientes.get(p.cliente_id)
        if not cliente:
            continue
        resultado.append(pasajero_a_dict(p, cliente, puntos.get(p.punto_recogida_id)))
    return resultado


def agregar_pasajero(
    db: Session,
    reserva_id: int,
    cliente_id: int,
    es_menor: bool,
    ocupa_asiento: bool,
    precio_pasajero_eur: Decimal,
    recargo_eur: Decimal,
    notas_tarifa: Optional[str],
    punto_recogida_id: Optional[int],
) -> ReservaCliente:
    reserva = obtener_reserva_activa(db, reserva_id)

    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado. Debe estar registrado en el sistema.")

    duplicado = db.query(ReservaCliente).filter(
        ReservaCliente.reserva_id == reserva_id,
        ReservaCliente.cliente_id == cliente_id,
        ReservaCliente.eliminado_en.is_(None),
    ).first()
    if duplicado:
        raise HTTPException(status_code=400, detail="Este cliente ya está registrado en esta reserva")

    if punto_recogida_id:
        validar_punto_recogida(db, punto_recogida_id)

    es_el_titular = cliente_id == reserva.cliente_id
    ahora = datetime.now()
    nuevo_pasajero = ReservaCliente(
        reserva_id=reserva_id,
        cliente_id=cliente_id,
        es_titular=es_el_titular,
        es_menor=es_menor,
        ocupa_asiento=ocupa_asiento,
        precio_pasajero_eur=precio_pasajero_eur,
        recargo_eur=recargo_eur,
        notas_tarifa=notas_tarifa,
        punto_recogida_id=punto_recogida_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_pasajero)
    db.commit()
    db.refresh(nuevo_pasajero)
    return nuevo_pasajero


def actualizar_pasajero(
    db: Session,
    reserva_id: int,
    pasajero_id: int,
    es_menor: Optional[bool],
    ocupa_asiento: Optional[bool],
    precio_pasajero_eur: Optional[Decimal],
    recargo_eur: Optional[Decimal],
    notas_tarifa: Optional[str],
    punto_recogida_id: Optional[int],
    actualizar_punto: bool,
) -> ReservaCliente:
    pasajero = obtener_pasajero_activo(db, reserva_id, pasajero_id)

    if es_menor is not None:
        pasajero.es_menor = es_menor
    if ocupa_asiento is not None:
        pasajero.ocupa_asiento = ocupa_asiento
    if precio_pasajero_eur is not None:
        pasajero.precio_pasajero_eur = precio_pasajero_eur
    if recargo_eur is not None:
        pasajero.recargo_eur = recargo_eur
    if notas_tarifa is not None:
        pasajero.notas_tarifa = notas_tarifa
    if actualizar_punto:
        if punto_recogida_id is not None:
            validar_punto_recogida(db, punto_recogida_id)
        pasajero.punto_recogida_id = punto_recogida_id

    pasajero.actualizado_en = datetime.now()
    db.commit()
    return pasajero


def eliminar_pasajero(db: Session, reserva_id: int, pasajero_id: int) -> None:
    pasajero = obtener_pasajero_activo(db, reserva_id, pasajero_id)
    ahora = datetime.now()
    db.query(AsientoReservado).filter(
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None),
    ).update({"eliminado_en": ahora, "actualizado_en": ahora}, synchronize_session=False)
    pasajero.eliminado_en = ahora
    pasajero.actualizado_en = ahora
    db.commit()


def listar_asientos_pasajero(db: Session, reserva_id: int, pasajero_id: int) -> list[dict]:
    obtener_pasajero_activo(db, reserva_id, pasajero_id)
    asientos = db.query(AsientoReservado).filter(
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None),
    ).all()
    return [{"id": a.id, "asiento_id": a.asiento_id, "viaje_id": a.viaje_id} for a in asientos]


def asignar_asiento_pasajero(
    db: Session, reserva_id: int, pasajero_id: int, asiento_id: int,
) -> AsientoReservado:
    reserva = obtener_reserva_activa(db, reserva_id)
    obtener_pasajero_activo(db, reserva_id, pasajero_id)

    asiento = db.query(Asiento).filter(
        Asiento.id == asiento_id, Asiento.eliminado_en.is_(None),
    ).first()
    if not asiento:
        raise HTTPException(status_code=404, detail="El asiento seleccionado no existe o está eliminado")

    ocupado = db.query(AsientoReservado).filter(
        AsientoReservado.asiento_id == asiento_id,
        AsientoReservado.viaje_id == reserva.viaje_id,
        AsientoReservado.eliminado_en.is_(None),
    ).first()
    if ocupado:
        raise HTTPException(status_code=400, detail="Este asiento ya está reservado para este viaje")

    ahora = datetime.now()
    nuevo_asiento = AsientoReservado(
        reserva_cliente_id=pasajero_id,
        viaje_id=reserva.viaje_id,
        asiento_id=asiento_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_asiento)
    db.commit()
    db.refresh(nuevo_asiento)
    return nuevo_asiento


def quitar_asiento_pasajero(
    db: Session, reserva_id: int, pasajero_id: int, asiento_reservado_id: int,
) -> None:
    obtener_pasajero_activo(db, reserva_id, pasajero_id)
    asignacion = db.query(AsientoReservado).filter(
        AsientoReservado.id == asiento_reservado_id,
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None),
    ).first()
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación de asiento no encontrada")

    ahora = datetime.now()
    asignacion.eliminado_en = ahora
    asignacion.actualizado_en = ahora
    db.commit()
