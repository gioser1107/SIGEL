from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.permiso_modelo import Permiso
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_PERMISOS,
    PERMISO_CREAR_PERMISOS,
    PERMISO_EDITAR_PERMISOS,
    PERMISO_LEER_PERMISOS,
)

router = APIRouter(prefix="/permisos", tags=["Permisos"])

class DatosPermisoNuevo(BaseModel):
    descripcion: str

class DatosPermisoActualizar(BaseModel):
    descripcion: str

@router.get("/")
def obtener_todos_los_permisos(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PERMISOS)),
):
    consulta = db.query(Permiso).filter(Permiso.eliminado_en.is_(None))
    lista_permisos = consulta.all()

    resultado = []
    for permiso in lista_permisos:
        permiso_dict = {
            "id": permiso.id,
            "descripcion": permiso.descripcion,
        }
        resultado.append(permiso_dict)

    return resultado

@router.get("/{permiso_id}")
def obtener_permiso_por_id(
    permiso_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PERMISOS)),
):
    consulta = db.query(Permiso).filter(
        Permiso.id == permiso_id,
        Permiso.eliminado_en.is_(None),
    )
    permiso = consulta.first()

    if permiso is None:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    return {
        "permiso": {
            "id": permiso.id,
            "descripcion": permiso.descripcion,
        }
    }

@router.post("/")
def crear_permiso(
    datos: DatosPermisoNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_PERMISOS)),
):
    ahora = datetime.now()

    nuevo_permiso = Permiso(
        descripcion=datos.descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_permiso)
    db.commit()
    db.refresh(nuevo_permiso)

    return {
        "mensaje": "Permiso creado con éxito",
        "permiso": {
            "id": nuevo_permiso.id,
            "descripcion": nuevo_permiso.descripcion,
        },
    }

@router.put("/{permiso_id}")
def actualizar_permiso(
    permiso_id: int,
    datos: DatosPermisoActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_PERMISOS)),
):
    consulta = db.query(Permiso).filter(
        Permiso.id == permiso_id,
        Permiso.eliminado_en.is_(None),
    )
    permiso = consulta.first()

    if permiso is None:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    permiso.descripcion = datos.descripcion
    permiso.actualizado_en = datetime.now()
    db.commit()
    db.refresh(permiso)

    return {
        "mensaje": "Permiso actualizado con éxito",
        "permiso": {
            "id": permiso.id,
            "descripcion": permiso.descripcion,
        },
    }

@router.delete("/{permiso_id}")
def eliminar_permiso(
    permiso_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_PERMISOS)),
):
    consulta = db.query(Permiso).filter(
        Permiso.id == permiso_id,
        Permiso.eliminado_en.is_(None),
    )
    permiso = consulta.first()

    if permiso is None:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    ahora = datetime.now()
    permiso.eliminado_en = ahora
    permiso.actualizado_en = ahora
    db.commit()

    return {
        "mensaje": "Permiso eliminado con éxito",
        "permiso_id": permiso_id,
    }
