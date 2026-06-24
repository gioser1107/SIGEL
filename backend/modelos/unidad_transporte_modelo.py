from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Integer, String
from sqlalchemy.orm import Session

from database import Base
from utilidades.paginacion import paginar_consulta, respuesta_paginada


class UnidadTransporte(Base):
    __tablename__ = "unidades_transporte"

    id = Column(BigInteger, primary_key=True, index=True)
    placa = Column(String(16), unique=True, nullable=False)
    modelo = Column(String(80), nullable=True)
    capacidad = Column(Integer, nullable=False)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def unidad_a_dict(unidad: UnidadTransporte) -> dict:
    return {
        "id": unidad.id,
        "placa": unidad.placa,
        "modelo": unidad.modelo,
        "capacidad": unidad.capacidad,
        "creado_en": unidad.creado_en,
        "actualizado_en": unidad.actualizado_en,
    }


def obtener_unidad_activa(db: Session, unidad_id: int) -> UnidadTransporte:
    unidad = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad de transporte no encontrada")
    return unidad


def _validar_placa_no_repetida(db: Session, placa: str, unidad_id_actual: int | None = None) -> None:
    existente = db.query(UnidadTransporte).filter(
        UnidadTransporte.placa == placa,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if existente and existente.id != unidad_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una unidad de transporte activa con esta placa",
        )


def listar_unidades(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    consulta = (
        db.query(UnidadTransporte)
        .filter(UnidadTransporte.eliminado_en.is_(None))
        .order_by(UnidadTransporte.id)
    )
    unidades, total = paginar_consulta(consulta, pagina, limite)
    items = [unidad_a_dict(u) for u in unidades]
    return respuesta_paginada(items, total, pagina, limite)


def crear_unidad(
    db: Session,
    placa: str,
    modelo: Optional[str],
    capacidad: int,
) -> UnidadTransporte:
    _validar_placa_no_repetida(db, placa)

    ahora = datetime.now()
    nueva_unidad = UnidadTransporte(
        placa=placa,
        modelo=modelo,
        capacidad=capacidad,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_unidad)
    db.commit()
    db.refresh(nueva_unidad)
    return nueva_unidad


def actualizar_unidad(
    db: Session,
    unidad_id: int,
    placa: Optional[str],
    modelo: Optional[str],
    capacidad: Optional[int],
) -> UnidadTransporte:
    unidad = obtener_unidad_activa(db, unidad_id)

    if placa is not None:
        if placa != unidad.placa:
            _validar_placa_no_repetida(db, placa, unidad_id)
        unidad.placa = placa

    if modelo is not None:
        unidad.modelo = modelo

    if capacidad is not None:
        unidad.capacidad = capacidad

    unidad.actualizado_en = datetime.now()
    db.commit()
    return unidad


def eliminar_unidad(db: Session, unidad_id: int) -> None:
    from modelos.viaje_modelo import Viaje

    unidad = obtener_unidad_activa(db, unidad_id)

    viajes_activos = db.query(Viaje).filter(
        Viaje.unidad_id == unidad_id,
        Viaje.eliminado_en.is_(None),
        Viaje.estado.in_(["planificado", "en_progreso"]),
    ).first()

    if viajes_activos:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar la unidad de transporte porque tiene viajes activos o planificados asociados.",
        )

    ahora = datetime.now()
    unidad.eliminado_en = ahora
    unidad.actualizado_en = ahora
    db.commit()
