from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.permiso_modelo import Permiso

router = APIRouter(prefix="/permisos", tags=["Permisos"])


class DatosPermisoNuevo(BaseModel):
    descripcion: str


@router.get("/")
def obtener_todos_los_permisos(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Lista todos los permisos activos del sistema."""
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


@router.post("/")
def crear_permiso(
    datos: DatosPermisoNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Crea un permiso nuevo."""
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
