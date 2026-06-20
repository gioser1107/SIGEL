from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.punto_recogida_modelo import (
    crear_punto_recogida_publico,
    listar_puntos_recogida_activos,
)

router = APIRouter(prefix="/puntos-recogida", tags=["Puntos de Recogida"])


class DatosPuntoRecogidaPublico(BaseModel):
    nombre: str
    direccion: str | None = None
    ciudad: str | None = None
    estado: str | None = None
    notas_referencia: str | None = None


@router.get("")
def listar_puntos_recogida(db: Session = Depends(get_db)):
    return listar_puntos_recogida_activos(db)


@router.post("/publico")
def crear_punto_recogida_publico_endpoint(
    datos: DatosPuntoRecogidaPublico,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    nuevo_punto = crear_punto_recogida_publico(
        db,
        nombre=datos.nombre,
        direccion=datos.direccion,
        ciudad=datos.ciudad,
        estado=datos.estado,
        notas_referencia=datos.notas_referencia,
    )

    registrar_evento(
        db,
        modulo="puntos_recogida",
        accion="INSERT",
        resumen=f"Punto de recogida '{nuevo_punto.nombre}' creado desde landing por usuario {usuario_actual['id']}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="puntos_recogida",
        registro_id=nuevo_punto.id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"id": nuevo_punto.id, "nombre": nuevo_punto.nombre}
