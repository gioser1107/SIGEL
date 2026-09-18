"""Retrasos, eventualidades e incidencias del viaje."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Session

from database import Base, fk_usuario
from modelos.usuario_modelo import Usuario, nombre_completo_de
from modelos.viaje_modelo import obtener_viaje_activo
from utilidades.politicas_agencia import TIPOS_INCIDENCIA, normalizar_tipo_incidencia
from utilidades.validaciones import ValidadorEntrada


class IncidenciaViaje(Base):
    __tablename__ = "viaje_incidencias"

    id = Column(BigInteger, primary_key=True, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    tipo = Column(String(30), nullable=False)
    descripcion = Column(Text, nullable=False)
    ocurrio_en = Column(DateTime, nullable=False)
    registrado_por = Column(BigInteger, fk_usuario(), nullable=True, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def incidencia_a_dict(incidencia: IncidenciaViaje, usuario: Usuario | None = None) -> dict:
    return {
        "id": incidencia.id,
        "viaje_id": incidencia.viaje_id,
        "tipo": incidencia.tipo,
        "descripcion": incidencia.descripcion,
        "ocurrio_en": incidencia.ocurrio_en.isoformat() if incidencia.ocurrio_en else None,
        "registrado_por": incidencia.registrado_por,
        "registrado_por_nombre": (
            nombre_completo_de(usuario.nombre, usuario.apellido) if usuario else None
        ),
        "creado_en": incidencia.creado_en.isoformat() if incidencia.creado_en else None,
    }


def listar_incidencias_viaje(db: Session, viaje_id: int) -> list[dict]:
    obtener_viaje_activo(db, viaje_id)
    filas = (
        db.query(IncidenciaViaje, Usuario)
        .outerjoin(Usuario, Usuario.id == IncidenciaViaje.registrado_por)
        .filter(
            IncidenciaViaje.viaje_id == viaje_id,
            IncidenciaViaje.eliminado_en.is_(None),
        )
        .order_by(IncidenciaViaje.ocurrio_en.desc(), IncidenciaViaje.id.desc())
        .all()
    )
    return [incidencia_a_dict(incidencia, usuario) for incidencia, usuario in filas]


def crear_incidencia_viaje(
    db: Session,
    viaje_id: int,
    tipo: str,
    descripcion: str,
    ocurrio_en: datetime | None,
    usuario_id: int | None,
) -> dict:
    obtener_viaje_activo(db, viaje_id)
    tipo_limpio = normalizar_tipo_incidencia(tipo)
    texto = ValidadorEntrada.texto_libre(
        descripcion,
        "descripcion",
        obligatorio=True,
        minimo=5,
        maximo=2000,
    )
    ahora = datetime.now()
    incidencia = IncidenciaViaje(
        viaje_id=viaje_id,
        tipo=tipo_limpio,
        descripcion=texto,
        ocurrio_en=ocurrio_en or ahora,
        registrado_por=usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(incidencia)
    db.commit()
    db.refresh(incidencia)
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first() if usuario_id else None
    return {"incidencia": incidencia_a_dict(incidencia, usuario)}


def eliminar_incidencia_viaje(db: Session, viaje_id: int, incidencia_id: int) -> dict:
    obtener_viaje_activo(db, viaje_id)
    incidencia = (
        db.query(IncidenciaViaje)
        .filter(
            IncidenciaViaje.id == incidencia_id,
            IncidenciaViaje.viaje_id == viaje_id,
            IncidenciaViaje.eliminado_en.is_(None),
        )
        .first()
    )
    if incidencia is None:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    ahora = datetime.now()
    incidencia.eliminado_en = ahora
    incidencia.actualizado_en = ahora
    db.commit()
    return {"mensaje": "Incidencia anulada", "incidencia_id": incidencia_id}


TIPOS_INCIDENCIA_RESPUESTA = list(TIPOS_INCIDENCIA)
