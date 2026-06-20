from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.destino_imagen_modelo import procesar_y_guardar_imagen_destino
from modelos.destino_modelo import (
    actualizar_destino,
    actualizar_imagen_destino,
    agregar_imagen_destino,
    anular_destino,
    buscar_destino_activo,
    crear_destino,
    destino_a_dict,
    imagen_destino_a_dict,
    listar_destinos,
    listar_imagenes_destino,
    quitar_imagen_destino,
)
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.permiso_modelo import (
    PERMISO_BORRAR_DESTINOS,
    PERMISO_CREAR_DESTINOS,
    PERMISO_EDITAR_DESTINOS,
    PERMISO_LEER_DESTINOS,
)

router = APIRouter(prefix="/destinos", tags=["Destinos"])


class DatosDestinoCrear(BaseModel):
    nombre: str
    descripcion: str | None = None
    precio_base_eur: Decimal = Field(default=Decimal("0.00"), ge=0)
    recargo_menor_eur: Decimal = Field(default=Decimal("0.00"), ge=0)
    activo: bool = True
    url_portada: str | None = None


class DatosDestinoActualizar(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio_base_eur: Decimal | None = Field(default=None, ge=0)
    recargo_menor_eur: Decimal | None = Field(default=None, ge=0)
    activo: bool | None = None
    url_portada: str | None = None


class DatosImagenDestinoCrear(BaseModel):
    url: str
    es_portada: bool = False


class DatosImagenDestinoActualizar(BaseModel):
    url: str | None = None
    es_portada: bool | None = None


@router.get("")
def listar_destinos_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_DESTINOS)),
):
    return listar_destinos(db)


@router.get("/{destino_id}")
def obtener_destino(
    destino_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    return {"destino": destino_a_dict(db, destino, incluir_galeria=True)}


@router.post("")
def crear_destino_endpoint(
    datos: DatosDestinoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_DESTINOS)),
):
    nuevo_destino = crear_destino(
        db,
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        precio_base_eur=datos.precio_base_eur,
        recargo_menor_eur=datos.recargo_menor_eur,
        activo=datos.activo,
        url_portada=datos.url_portada,
    )

    registrar_evento(
        db,
        modulo="catalogo",
        accion="INSERT",
        resumen=f"Destino creado: {nuevo_destino.nombre}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="destinos",
        registro_id=nuevo_destino.id,
        detalle={
            "nombre": nuevo_destino.nombre,
            "precio_base_eur": str(nuevo_destino.precio_base_eur),
            "activo": nuevo_destino.activo,
        },
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Destino creado con éxito",
        "destino": destino_a_dict(db, nuevo_destino),
    }


@router.put("/{destino_id}")
def actualizar_destino_endpoint(
    destino_id: int,
    datos: DatosDestinoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    destino = actualizar_destino(
        db,
        destino_id,
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        precio_base_eur=datos.precio_base_eur,
        recargo_menor_eur=datos.recargo_menor_eur,
        activo=datos.activo,
        url_portada=datos.url_portada,
    )

    registrar_evento(
        db,
        modulo="catalogo",
        accion="UPDATE",
        resumen=f"Destino actualizado: {destino.nombre}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="destinos",
        registro_id=destino_id,
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Destino actualizado con éxito",
        "destino": destino_a_dict(db, destino),
    }


@router.delete("/{destino_id}")
def anular_destino_endpoint(
    destino_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_DESTINOS)),
):
    destino = anular_destino(db, destino_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="DELETE",
        resumen=f"Destino anulado: {destino.nombre}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="destinos",
        registro_id=destino_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Destino anulado con éxito",
        "destino_id": destino_id,
    }


@router.get("/{destino_id}/imagenes")
def listar_imagenes_destino_endpoint(
    destino_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_DESTINOS)),
):
    return {"imagenes": listar_imagenes_destino(db, destino_id)}


@router.post("/{destino_id}/imagenes/upload")
async def subir_imagen_destino(
    destino_id: int,
    request: Request,
    archivo: UploadFile = File(...),
    es_portada: bool = Form(False),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    url_publica = await procesar_y_guardar_imagen_destino(destino_id, archivo)
    nueva = agregar_imagen_destino(db, destino_id, url_publica, es_portada=es_portada)
    destino = buscar_destino_activo(db, destino_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="INSERT",
        resumen=f"Imagen subida al destino {destino.nombre}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="destino_imagenes",
        registro_id=nueva.id,
        detalle={"destino_id": destino_id, "es_portada": nueva.es_portada},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Imagen subida con éxito",
        "imagen": imagen_destino_a_dict(nueva),
    }


@router.post("/{destino_id}/imagenes")
def agregar_imagen_destino_endpoint(
    destino_id: int,
    datos: DatosImagenDestinoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    nueva = agregar_imagen_destino(db, destino_id, datos.url, es_portada=datos.es_portada)
    destino = buscar_destino_activo(db, destino_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="INSERT",
        resumen=f"Imagen agregada al destino {destino.nombre}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="destino_imagenes",
        registro_id=nueva.id,
        detalle={"destino_id": destino_id, "es_portada": nueva.es_portada},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Imagen agregada con éxito",
        "imagen": imagen_destino_a_dict(nueva),
    }


@router.put("/{destino_id}/imagenes/{imagen_id}")
def actualizar_imagen_destino_endpoint(
    destino_id: int,
    imagen_id: int,
    datos: DatosImagenDestinoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    imagen = actualizar_imagen_destino(
        db,
        destino_id,
        imagen_id,
        url=datos.url,
        es_portada=datos.es_portada,
    )
    destino = buscar_destino_activo(db, destino_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="UPDATE",
        resumen=f"Imagen actualizada en destino {destino.nombre}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="destino_imagenes",
        registro_id=imagen_id,
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Imagen actualizada con éxito",
        "imagen": imagen_destino_a_dict(imagen),
    }


@router.delete("/{destino_id}/imagenes/{imagen_id}")
def quitar_imagen_destino_endpoint(
    destino_id: int,
    imagen_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    quitar_imagen_destino(db, destino_id, imagen_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="DELETE",
        resumen=f"Imagen eliminada del destino {destino.nombre}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="destino_imagenes",
        registro_id=imagen_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Imagen eliminada con éxito",
        "imagen_id": imagen_id,
    }
