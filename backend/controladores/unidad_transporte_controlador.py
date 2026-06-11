from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.unidad_transporte_modelo import UnidadTransporte
from modelos.viaje_modelo import Viaje
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_TRANSPORTE_FLOTA,
    PERMISO_CREAR_TRANSPORTE_FLOTA,
    PERMISO_EDITAR_TRANSPORTE_FLOTA,
    PERMISO_LEER_TRANSPORTE_FLOTA,
)

router = APIRouter(prefix="/unidades", tags=["Flota - Unidades de Transporte"])

class DatosUnidadCrear(BaseModel):
    placa: str
    modelo: Optional[str] = None
    capacidad: int

class DatosUnidadActualizar(BaseModel):
    placa: Optional[str] = None
    modelo: Optional[str] = None
    capacidad: Optional[int] = None

def _obtener_unidad_activa(db: Session, unidad_id: int) -> UnidadTransporte:
    consulta = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None)
    )
    unidad = consulta.first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad de transporte no encontrada")
    return unidad

@router.get("")
def listar_unidades(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_TRANSPORTE_FLOTA)),
):
    unidades = db.query(UnidadTransporte).filter(UnidadTransporte.eliminado_en.is_(None)).order_by(UnidadTransporte.id).all()
    resultado = []
    for u in unidades:
        resultado.append({
            "id": u.id,
            "placa": u.placa,
            "modelo": u.modelo,
            "capacidad": u.capacidad,
            "creado_en": u.creado_en,
            "actualizado_en": u.actualizado_en,
        })
    return resultado

@router.post("")
def crear_unidad(
    datos: DatosUnidadCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_TRANSPORTE_FLOTA)),
):
    existente = db.query(UnidadTransporte).filter(
        UnidadTransporte.placa == datos.placa,
        UnidadTransporte.eliminado_en.is_(None)
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una unidad de transporte activa con esta placa")

    ahora = datetime.now()
    nueva_unidad = UnidadTransporte(
        placa=datos.placa,
        modelo=datos.modelo,
        capacidad=datos.capacidad,
        creado_en=ahora,
        actualizado_en=ahora
    )
    db.add(nueva_unidad)
    db.commit()
    db.refresh(nueva_unidad)

    registrar_evento(
        db, modulo="viajes", accion="INSERT",
        resumen=f"Unidad de transporte creada (Placa: {datos.placa})",
        usuario_id=usuario_actual["id"], tabla_afectada="unidades_transporte",
        registro_id=nueva_unidad.id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Unidad de transporte creada con éxito", "unidad_id": nueva_unidad.id}

@router.get("/{unidad_id}")
def obtener_unidad(
    unidad_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_TRANSPORTE_FLOTA)),
):
    unidad = _obtener_unidad_activa(db, unidad_id)
    return {
        "id": unidad.id,
        "placa": unidad.placa,
        "modelo": unidad.modelo,
        "capacidad": unidad.capacidad,
        "creado_en": unidad.creado_en,
        "actualizado_en": unidad.actualizado_en,
    }

@router.put("/{unidad_id}")
def actualizar_unidad(
    unidad_id: int,
    datos: DatosUnidadActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_TRANSPORTE_FLOTA)),
):
    unidad = _obtener_unidad_activa(db, unidad_id)

    if datos.placa is not None:
        if datos.placa != unidad.placa:
            existente = db.query(UnidadTransporte).filter(
                UnidadTransporte.placa == datos.placa,
                UnidadTransporte.eliminado_en.is_(None)
            ).first()
            if existente:
                raise HTTPException(status_code=400, detail="Ya existe una unidad de transporte activa con esta placa")
        unidad.placa = datos.placa

    if datos.modelo is not None:
        unidad.modelo = datos.modelo

    if datos.capacidad is not None:
        unidad.capacidad = datos.capacidad

    unidad.actualizado_en = datetime.now()
    db.commit()

    registrar_evento(
        db, modulo="viajes", accion="UPDATE",
        resumen=f"Unidad de transporte {unidad_id} actualizada",
        usuario_id=usuario_actual["id"], tabla_afectada="unidades_transporte",
        registro_id=unidad_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Unidad de transporte actualizada con éxito"}

@router.delete("/{unidad_id}")
def eliminar_unidad(
    unidad_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_TRANSPORTE_FLOTA)),
):
    unidad = _obtener_unidad_activa(db, unidad_id)

    viajes_activos = db.query(Viaje).filter(
        Viaje.unidad_id == unidad_id,
        Viaje.eliminado_en.is_(None),
        Viaje.estado.in_(["planificado", "en_progreso"])  # Estados activos comunes
    ).first()

    if viajes_activos:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar la unidad de transporte porque tiene viajes activos o planificados asociados."
        )

    ahora = datetime.now()
    unidad.eliminado_en = ahora
    unidad.actualizado_en = ahora
    db.commit()

    registrar_evento(
        db, modulo="viajes", accion="DELETE",
        resumen=f"Unidad de transporte {unidad_id} eliminada",
        usuario_id=usuario_actual["id"], tabla_afectada="unidades_transporte",
        registro_id=unidad_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Unidad de transporte eliminada con éxito"}
