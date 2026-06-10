from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.asiento_modelo import Asiento
from modelos.unidad_transporte_modelo import UnidadTransporte
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_TRANSPORTE_FLOTA,
    PERMISO_CREAR_TRANSPORTE_FLOTA,
    PERMISO_EDITAR_TRANSPORTE_FLOTA,
    PERMISO_LEER_TRANSPORTE_FLOTA,
)

router = APIRouter(prefix="/asientos", tags=["Asientos de Transporte"])

class DatosAsientoCrear(BaseModel):
    unidad_id: int
    numero: str
    posicion: str = "otro"

class DatosAsientoActualizar(BaseModel):
    numero: Optional[str] = None
    posicion: Optional[str] = None

def _obtener_asiento_activo(db: Session, asiento_id: int) -> Asiento:
    consulta = db.query(Asiento).filter(
        Asiento.id == asiento_id,
        Asiento.eliminado_en.is_(None)
    )
    asiento = consulta.first()
    if not asiento:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    return asiento

@router.get("")
def listar_asientos(
    unidad_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_TRANSPORTE_FLOTA)),
):
    consulta = db.query(Asiento).filter(Asiento.eliminado_en.is_(None))
    if unidad_id:
        consulta = consulta.filter(Asiento.unidad_id == unidad_id)
    
    lista = consulta.order_by(Asiento.id).all()
    resultado = []
    for a in lista:
        resultado.append({
            "id": a.id,
            "unidad_id": a.unidad_id,
            "numero": a.numero,
            "posicion": a.posicion,
        })
    return resultado

@router.post("")
def crear_asiento(
    datos: DatosAsientoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_TRANSPORTE_FLOTA)),
):
    unidad = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == datos.unidad_id,
        UnidadTransporte.eliminado_en.is_(None)
    ).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad de transporte no encontrada o está eliminada")

    ahora = datetime.now()
    nuevo_asiento = Asiento(
        unidad_id=datos.unidad_id,
        numero=datos.numero,
        posicion=datos.posicion,
        creado_en=ahora,
        actualizado_en=ahora
    )
    db.add(nuevo_asiento)
    db.commit()
    db.refresh(nuevo_asiento)

    registrar_evento(
        db, modulo="flota", accion="INSERT",
        resumen=f"Asiento {datos.numero} creado para unidad {datos.unidad_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=nuevo_asiento.id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Asiento creado", "asiento_id": nuevo_asiento.id}

@router.put("/{asiento_id}")
def actualizar_asiento(
    asiento_id: int,
    datos: DatosAsientoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_TRANSPORTE_FLOTA)),
):
    asiento = _obtener_asiento_activo(db, asiento_id)

    if datos.numero is not None: asiento.numero = datos.numero
    if datos.posicion is not None: asiento.posicion = datos.posicion

    asiento.actualizado_en = datetime.now()
    db.commit()

    registrar_evento(
        db, modulo="flota", accion="UPDATE",
        resumen=f"Asiento {asiento_id} actualizado",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=asiento_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Asiento actualizado"}

@router.delete("/{asiento_id}")
def eliminar_asiento(
    asiento_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_TRANSPORTE_FLOTA)),
):
    asiento = _obtener_asiento_activo(db, asiento_id)
    
    ahora = datetime.now()
    asiento.eliminado_en = ahora
    asiento.actualizado_en = ahora
    db.commit()

    registrar_evento(
        db, modulo="flota", accion="DELETE",
        resumen=f"Asiento {asiento_id} eliminado",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos",
        registro_id=asiento_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Asiento eliminado"}
