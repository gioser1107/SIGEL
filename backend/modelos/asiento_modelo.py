from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Session

from database import Base
from modelos.croquis_plantillas import (
    CROQUIS_COLUMNAS_MAX,
    CROQUIS_FILAS_MAX,
    obtener_plantilla_croquis,
)
from utilidades.validaciones import ValidadorEntrada


class Asiento(Base):
    __tablename__ = "asientos"

    id = Column(BigInteger, primary_key=True, index=True)
    unidad_id = Column(BigInteger, ForeignKey("unidades_transporte.id"), nullable=False, index=True)
    numero = Column(String(10), nullable=False)
    posicion = Column(
        Enum("ventana", "pasillo", "medio", "otro"),
        nullable=False,
        default="otro",
    )
    fila = Column(Integer, nullable=True)
    columna = Column(Integer, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def asiento_a_dict(asiento: Asiento) -> dict:
    return {
        "id": asiento.id,
        "unidad_id": asiento.unidad_id,
        "numero": asiento.numero,
        "posicion": asiento.posicion,
        "fila": asiento.fila,
        "columna": asiento.columna,
    }


def obtener_asiento_activo(db: Session, asiento_id: int) -> Asiento:
    asiento = db.query(Asiento).filter(
        Asiento.id == asiento_id,
        Asiento.eliminado_en.is_(None),
    ).first()
    if not asiento:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    return asiento


def listar_asientos(db: Session, unidad_id: Optional[int] = None) -> list[dict]:
    consulta = db.query(Asiento).filter(Asiento.eliminado_en.is_(None))
    if unidad_id:
        consulta = consulta.filter(Asiento.unidad_id == unidad_id)
    asientos = consulta.order_by(Asiento.fila.asc(), Asiento.columna.asc(), Asiento.id.asc()).all()
    return [asiento_a_dict(a) for a in asientos]


def _validar_numero_asiento_no_repetido(
    db: Session,
    unidad_id: int,
    numero: str,
    asiento_id_actual: int | None = None,
) -> None:
    existente = db.query(Asiento).filter(
        Asiento.unidad_id == unidad_id,
        Asiento.numero == numero,
        Asiento.eliminado_en.is_(None),
    ).first()
    if existente and existente.id != asiento_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un asiento con ese número en esta unidad",
        )


def _validar_coordenada_asiento_libre(
    db: Session,
    unidad_id: int,
    fila: int | None,
    columna: int | None,
    asiento_id_actual: int | None = None,
) -> None:
    if fila is None or columna is None:
        return
    existente = db.query(Asiento).filter(
        Asiento.unidad_id == unidad_id,
        Asiento.fila == fila,
        Asiento.columna == columna,
        Asiento.eliminado_en.is_(None),
    ).first()
    if existente and existente.id != asiento_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya hay un asiento en esa posición del croquis",
        )


def _celda_especial_en(
    celdas: list | None,
    fila: int | None,
    columna: int | None,
) -> bool:
    if fila is None or columna is None or not celdas:
        return False
    return any(
        int(c.get("fila")) == fila and int(c.get("columna")) == columna
        for c in celdas
        if isinstance(c, dict) and c.get("fila") is not None and c.get("columna") is not None
    )


def crear_asiento(
    db: Session,
    unidad_id: int,
    numero: str,
    posicion: str,
    fila: int | None = None,
    columna: int | None = None,
) -> Asiento:
    from modelos.unidad_transporte_modelo import UnidadTransporte, _ampliar_croquis_si_hace_falta

    unidad = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if not unidad:
        raise HTTPException(
            status_code=404,
            detail="Unidad de transporte no encontrada o está eliminada",
        )

    numero_limpio = ValidadorEntrada.numero_asiento(numero)
    posicion_limpia = ValidadorEntrada.posicion_asiento(posicion)
    fila_limpia = ValidadorEntrada.coordenada_croquis(fila, "fila", maximo=CROQUIS_FILAS_MAX - 1)
    columna_limpia = ValidadorEntrada.coordenada_croquis(columna, "columna", maximo=CROQUIS_COLUMNAS_MAX - 1)
    if (fila_limpia is None) != (columna_limpia is None):
        raise HTTPException(status_code=400, detail="Debes indicar fila y columna juntas")

    _validar_numero_asiento_no_repetido(db, unidad_id, numero_limpio)
    _validar_coordenada_asiento_libre(db, unidad_id, fila_limpia, columna_limpia)
    if _celda_especial_en(unidad.croquis_celdas, fila_limpia, columna_limpia):
        raise HTTPException(
            status_code=400,
            detail="Esa celda del croquis ya está ocupada (conductor o puerta)",
        )

    ahora = datetime.now()
    nuevo_asiento = Asiento(
        unidad_id=unidad_id,
        numero=numero_limpio,
        posicion=posicion_limpia,
        fila=fila_limpia,
        columna=columna_limpia,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_asiento)
    _ampliar_croquis_si_hace_falta(unidad, fila_limpia, columna_limpia)
    db.commit()
    db.refresh(nuevo_asiento)
    return nuevo_asiento


def actualizar_asiento(
    db: Session,
    asiento_id: int,
    numero: Optional[str],
    posicion: Optional[str],
    fila: Optional[int] = None,
    columna: Optional[int] = None,
    actualizar_coordenadas: bool = False,
) -> Asiento:
    from modelos.unidad_transporte_modelo import _ampliar_croquis_si_hace_falta

    asiento = obtener_asiento_activo(db, asiento_id)

    if numero is not None:
        numero_limpio = ValidadorEntrada.numero_asiento(numero)
        _validar_numero_asiento_no_repetido(db, asiento.unidad_id, numero_limpio, asiento_id)
        asiento.numero = numero_limpio
    if posicion is not None:
        asiento.posicion = ValidadorEntrada.posicion_asiento(posicion)
    if actualizar_coordenadas:
        fila_limpia = ValidadorEntrada.coordenada_croquis(fila, "fila", maximo=CROQUIS_FILAS_MAX - 1)
        columna_limpia = ValidadorEntrada.coordenada_croquis(columna, "columna", maximo=CROQUIS_COLUMNAS_MAX - 1)
        if (fila_limpia is None) != (columna_limpia is None):
            raise HTTPException(status_code=400, detail="Debes indicar fila y columna juntas")
        _validar_coordenada_asiento_libre(db, asiento.unidad_id, fila_limpia, columna_limpia, asiento_id)
        from modelos.unidad_transporte_modelo import obtener_unidad_activa
        unidad = obtener_unidad_activa(db, asiento.unidad_id)
        if _celda_especial_en(unidad.croquis_celdas, fila_limpia, columna_limpia):
            raise HTTPException(
                status_code=400,
                detail="Esa celda del croquis ya está ocupada (conductor o puerta)",
            )
        asiento.fila = fila_limpia
        asiento.columna = columna_limpia
        _ampliar_croquis_si_hace_falta(unidad, fila_limpia, columna_limpia)

    asiento.actualizado_en = datetime.now()
    db.commit()
    return asiento


def eliminar_asiento(db: Session, asiento_id: int) -> None:
    asiento = obtener_asiento_activo(db, asiento_id)
    ahora = datetime.now()
    asiento.eliminado_en = ahora
    asiento.actualizado_en = ahora
    db.commit()


def _unidad_tiene_reservas_de_asientos(db: Session, unidad_id: int) -> bool:
    from modelos.asiento_reservado_modelo import AsientoReservado

    return (
        db.query(AsientoReservado)
        .join(Asiento, Asiento.id == AsientoReservado.asiento_id)
        .filter(
            Asiento.unidad_id == unidad_id,
            Asiento.eliminado_en.is_(None),
            AsientoReservado.eliminado_en.is_(None),
        )
        .first()
        is not None
    )


def aplicar_plantilla_croquis(db: Session, unidad_id: int, codigo_plantilla: str) -> dict:
    from modelos.unidad_transporte_modelo import obtener_unidad_activa

    unidad = obtener_unidad_activa(db, unidad_id)
    plantilla = obtener_plantilla_croquis(codigo_plantilla)

    if _unidad_tiene_reservas_de_asientos(db, unidad_id):
        raise HTTPException(
            status_code=400,
            detail="No se puede reemplazar el croquis porque hay asientos ya reservados en viajes de esta unidad",
        )

    ahora = datetime.now()
    asientos_actuales = db.query(Asiento).filter(
        Asiento.unidad_id == unidad_id,
        Asiento.eliminado_en.is_(None),
    ).all()
    for asiento in asientos_actuales:
        asiento.eliminado_en = ahora
        asiento.actualizado_en = ahora

    creados = []
    for dato in plantilla["asientos"]:
        nuevo = Asiento(
            unidad_id=unidad_id,
            numero=dato["numero"],
            posicion=dato["posicion"],
            fila=dato["fila"],
            columna=dato["columna"],
            creado_en=ahora,
            actualizado_en=ahora,
        )
        db.add(nuevo)
        creados.append(nuevo)

    unidad.croquis_filas = plantilla["filas"]
    unidad.croquis_columnas = plantilla["columnas"]
    unidad.croquis_celdas = plantilla["celdas"]
    if unidad.capacidad < len(plantilla["asientos"]):
        unidad.capacidad = len(plantilla["asientos"])
    unidad.actualizado_en = ahora
    db.commit()
    for asiento in creados:
        db.refresh(asiento)

    from modelos.unidad_transporte_modelo import croquis_unidad_a_dict

    return {
        "mensaje": f"Croquis {plantilla['nombre']} aplicado",
        "total_asientos": len(creados),
        "croquis": croquis_unidad_a_dict(unidad),
        "asientos": [asiento_a_dict(a) for a in creados],
    }
