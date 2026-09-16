from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import estado_bases, get_db
from dependencias.permiso_dependencia import requiere_administrador
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from utilidades.respaldo import generar_respaldo, listar_respaldos, ruta_respaldo_seguro

router = APIRouter(prefix="/respaldos", tags=["Respaldos"])


@router.get("/estado")
def estado_bases_endpoint(usuario_actual: dict = Depends(requiere_administrador)):
    return estado_bases()


@router.get("")
def listar_respaldos_endpoint(usuario_actual: dict = Depends(requiere_administrador)):
    return listar_respaldos()


@router.post("")
def crear_respaldo_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_administrador),
):
    try:
        resultado = generar_respaldo()
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    registrar_evento(
        db,
        modulo="seguridad",
        accion="OTRO",
        resumen="Respaldo de bases de datos generado",
        usuario_id=usuario_actual["id"],
        tabla_afectada="respaldos",
        registro_id=resultado["marca"],
        detalle={"archivos": [a["archivo"] for a in resultado["archivos"]]},
        ip_origen=obtener_ip_origen(request),
    )
    return resultado


@router.get("/{nombre_archivo}")
def descargar_respaldo_endpoint(
    nombre_archivo: str,
    usuario_actual: dict = Depends(requiere_administrador),
):
    try:
        ruta = ruta_respaldo_seguro(nombre_archivo)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return FileResponse(
        ruta,
        filename=ruta.name,
        media_type="application/gzip",
    )
