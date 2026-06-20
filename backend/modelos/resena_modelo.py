from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, SmallInteger, Text
from sqlalchemy.orm import Session

from database import Base
from modelos.cliente_modelo import Cliente
from modelos.destino_modelo import Destino
from modelos.reservas_modelo import Reserva, obtener_reserva_activa
from modelos.viaje_modelo import Viaje


class Resena(Base):
    __tablename__ = "resenas"

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=False, unique=True, index=True)
    calificacion = Column(SmallInteger, nullable=False)
    comentario = Column(Text, nullable=True)
    publico = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def _fecha_fin_viaje(viaje: Viaje) -> datetime:
    return viaje.fecha_regreso or viaje.fecha_salida


def _viaje_ya_realizado(viaje: Viaje, referencia: Optional[datetime] = None) -> bool:
    ahora = referencia or datetime.now()
    return _fecha_fin_viaje(viaje) <= ahora


def _reserva_elegible_para_resena(reserva: Reserva, viaje: Viaje) -> None:
    if reserva.estado == "cancelada":
        raise HTTPException(status_code=400, detail="No se puede reseñar una reserva cancelada")
    if not _viaje_ya_realizado(viaje):
        raise HTTPException(status_code=400, detail="Solo puedes reseñar viajes ya realizados")


def resena_a_dict(
    resena: Resena,
    *,
    nombre_cliente: str,
    destino_titulo: str,
    reserva_id: Optional[int] = None,
) -> dict:
    return {
        "id": resena.id,
        "reserva_id": reserva_id or resena.reserva_id,
        "calificacion": int(resena.calificacion),
        "comentario": resena.comentario,
        "publico": bool(resena.publico),
        "nombre_cliente": nombre_cliente,
        "destino_titulo": destino_titulo,
        "creado_en": resena.creado_en.isoformat() if resena.creado_en else None,
        "actualizado_en": resena.actualizado_en.isoformat() if resena.actualizado_en else None,
    }


def _serializar_fila(
    resena: Resena,
    reserva: Reserva,
    viaje: Viaje,
    destino: Destino,
    cliente: Cliente,
) -> dict:
    nombre = f"{cliente.nombre} {cliente.apellido}".strip()
    return resena_a_dict(
        resena,
        nombre_cliente=nombre,
        destino_titulo=destino.nombre,
        reserva_id=reserva.id,
    )


def obtener_resena_activa(db: Session, resena_id: int) -> Resena:
    resena = db.query(Resena).filter(
        Resena.id == resena_id,
        Resena.eliminado_en.is_(None),
    ).first()
    if resena is None:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    return resena


def obtener_resena_por_reserva(db: Session, reserva_id: int) -> Resena | None:
    return db.query(Resena).filter(
        Resena.reserva_id == reserva_id,
        Resena.eliminado_en.is_(None),
    ).first()


def _consulta_resenas_con_datos(db: Session, solo_publicas: bool = False):
    consulta = (
        db.query(Resena, Reserva, Viaje, Destino, Cliente)
        .join(Reserva, Resena.reserva_id == Reserva.id)
        .join(Viaje, Reserva.viaje_id == Viaje.id)
        .join(Destino, Viaje.destino_id == Destino.id)
        .join(Cliente, Reserva.cliente_id == Cliente.id)
        .filter(
            Resena.eliminado_en.is_(None),
            Reserva.eliminado_en.is_(None),
            Viaje.eliminado_en.is_(None),
            Destino.eliminado_en.is_(None),
            Cliente.eliminado_en.is_(None),
        )
    )
    if solo_publicas:
        consulta = consulta.filter(Resena.publico.is_(True))
    return consulta.order_by(Resena.creado_en.desc())


def listar_resenas_publicas(db: Session) -> list[dict]:
    filas = _consulta_resenas_con_datos(db, solo_publicas=True).all()
    return [_serializar_fila(r, res, viaje, dest, cli) for r, res, viaje, dest, cli in filas]


def listar_resenas_admin(db: Session) -> list[dict]:
    filas = _consulta_resenas_con_datos(db, solo_publicas=False).all()
    return [_serializar_fila(r, res, viaje, dest, cli) for r, res, viaje, dest, cli in filas]


def listar_reservas_elegibles_cliente(db: Session, cliente_id: int) -> list[dict]:
    ahora = datetime.now()
    filas = (
        db.query(Reserva, Viaje, Destino, Resena)
        .join(Viaje, Reserva.viaje_id == Viaje.id)
        .join(Destino, Viaje.destino_id == Destino.id)
        .outerjoin(
            Resena,
            (Resena.reserva_id == Reserva.id) & (Resena.eliminado_en.is_(None)),
        )
        .filter(
            Reserva.cliente_id == cliente_id,
            Reserva.eliminado_en.is_(None),
            Reserva.estado != "cancelada",
            Viaje.eliminado_en.is_(None),
            Destino.eliminado_en.is_(None),
        )
        .order_by(Viaje.fecha_salida.desc())
        .all()
    )

    resultado: list[dict] = []
    for reserva, viaje, destino, resena in filas:
        if not _viaje_ya_realizado(viaje, ahora):
            continue

        item: dict = {
            "reserva_id": reserva.id,
            "destino_titulo": destino.nombre,
            "fecha_viaje": viaje.fecha_salida.isoformat(),
            "estado_reserva": reserva.estado,
            "resena": None,
        }
        if resena is not None:
            item["resena"] = resena_a_dict(
                resena,
                nombre_cliente="",
                destino_titulo=destino.nombre,
                reserva_id=reserva.id,
            )
        resultado.append(item)
    return resultado


def obtener_mi_resena(db: Session, reserva_id: int, cliente_id: int) -> dict | None:
    reserva = obtener_reserva_activa(db, reserva_id)
    if reserva.cliente_id != cliente_id:
        raise HTTPException(status_code=403, detail="No puedes consultar reseñas de otra reserva")

    viaje = db.query(Viaje).filter(Viaje.id == reserva.viaje_id, Viaje.eliminado_en.is_(None)).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    destino = db.query(Destino).filter(Destino.id == viaje.destino_id, Destino.eliminado_en.is_(None)).first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    resena = obtener_resena_por_reserva(db, reserva_id)
    if resena is None:
        return None

    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.eliminado_en.is_(None)).first()
    nombre = f"{cliente.nombre} {cliente.apellido}".strip() if cliente else ""
    return resena_a_dict(
        resena,
        nombre_cliente=nombre,
        destino_titulo=destino.nombre,
        reserva_id=reserva.id,
    )


def crear_resena(
    db: Session,
    reserva_id: int,
    cliente_id: int,
    calificacion: int,
    comentario: Optional[str],
) -> dict:
    if calificacion < 1 or calificacion > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5")

    reserva = obtener_reserva_activa(db, reserva_id)
    if reserva.cliente_id != cliente_id:
        raise HTTPException(status_code=403, detail="No puedes reseñar una reserva que no te pertenece")

    viaje = db.query(Viaje).filter(Viaje.id == reserva.viaje_id, Viaje.eliminado_en.is_(None)).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    destino = db.query(Destino).filter(Destino.id == viaje.destino_id, Destino.eliminado_en.is_(None)).first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    _reserva_elegible_para_resena(reserva, viaje)

    existente = obtener_resena_por_reserva(db, reserva_id)
    if existente is not None:
        raise HTTPException(status_code=400, detail="Ya existe una reseña para esta reserva")

    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.eliminado_en.is_(None)).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    comentario_limpio = comentario.strip() if comentario else None
    ahora = datetime.now()
    nueva = Resena(
        reserva_id=reserva_id,
        calificacion=calificacion,
        comentario=comentario_limpio,
        publico=True,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    nombre = f"{cliente.nombre} {cliente.apellido}".strip()
    return resena_a_dict(
        nueva,
        nombre_cliente=nombre,
        destino_titulo=destino.nombre,
        reserva_id=reserva.id,
    )


def alternar_visibilidad(db: Session, resena_id: int) -> dict:
    resena = obtener_resena_activa(db, resena_id)
    resena.publico = not resena.publico
    resena.actualizado_en = datetime.now()
    db.commit()
    db.refresh(resena)

    fila = (
        _consulta_resenas_con_datos(db, solo_publicas=False)
        .filter(Resena.id == resena_id)
        .first()
    )
    if fila is None:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    r, res, viaje, dest, cli = fila
    return _serializar_fila(r, res, viaje, dest, cli)


def eliminar_resena(db: Session, resena_id: int) -> None:
    resena = obtener_resena_activa(db, resena_id)
    ahora = datetime.now()
    resena.eliminado_en = ahora
    resena.actualizado_en = ahora
    db.commit()
