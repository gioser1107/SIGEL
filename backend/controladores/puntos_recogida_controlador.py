from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.punto_recogida_modelo import PuntoRecogida
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento

router = APIRouter(prefix="/puntos-recogida", tags=["Puntos de Recogida"])


class DatosPuntoRecogidaPublico(BaseModel):
    nombre: str
    direccion: str | None = None
    ciudad: str | None = None
    estado: str | None = None
    notas_referencia: str | None = None


@router.get("")
def listar_puntos_recogida(db: Session = Depends(get_db)):
    """Lista todos los puntos de recogida activos. Endpoint público."""
    puntos = (
        db.query(PuntoRecogida)
        .filter(
            PuntoRecogida.activo.is_(True),
            PuntoRecogida.eliminado_en.is_(None),
        )
        .order_by(PuntoRecogida.nombre)
        .all()
    )
    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "direccion": p.direccion,
            "ciudad": p.ciudad,
            "estado": p.estado,
            "notas_referencia": p.notas_referencia,
        }
        for p in puntos
    ]


@router.post("/publico")
def crear_punto_recogida_publico(
    datos: DatosPuntoRecogidaPublico,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Permite a un usuario autenticado registrar un nuevo punto de recogida desde la landing."""
    nombre_limpio = datos.nombre.strip()
    if not nombre_limpio:
        raise HTTPException(status_code=422, detail="El nombre del punto de recogida es requerido")

    ahora = datetime.now()
    nuevo_punto = PuntoRecogida(
        nombre=nombre_limpio,
        direccion=datos.direccion,
        ciudad=datos.ciudad,
        estado=datos.estado,
        notas_referencia=datos.notas_referencia,
        activo=True,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_punto)
    db.commit()
    db.refresh(nuevo_punto)

    registrar_evento(
        db,
        modulo="puntos_recogida",
        accion="INSERT",
        resumen=f"Punto de recogida '{nombre_limpio}' creado desde landing por usuario {usuario_actual['id']}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="puntos_recogida",
        registro_id=nuevo_punto.id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"id": nuevo_punto.id, "nombre": nuevo_punto.nombre}
