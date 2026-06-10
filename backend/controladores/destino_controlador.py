from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.destino_imagen_modelo import DestinoImagen
from modelos.destino_modelo import Destino
from utilidades.archivo_imagen_utilidad import (
    eliminar_archivo_imagen,
    procesar_y_guardar_imagen_destino,
)
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.destino_utilidad import (
    buscar_imagen_activa,
    crear_imagen_destino,
    destino_a_dict,
    imagenes_destino,
    marcar_como_portada,
    validar_url_imagen,
)
from utilidades.permisos_constantes import (
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
    activo: bool = True
    url_portada: str | None = None


class DatosDestinoActualizar(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio_base_eur: Decimal | None = Field(default=None, ge=0)
    activo: bool | None = None
    url_portada: str | None = None


class DatosImagenDestinoCrear(BaseModel):
    url: str
    es_portada: bool = False


class DatosImagenDestinoActualizar(BaseModel):
    url: str | None = None
    es_portada: bool | None = None


def buscar_destino_activo(db: Session, destino_id: int) -> Destino | None:
    consulta = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.eliminado_en.is_(None),
    )
    return consulta.first()


def validar_nombre_no_repetido(
    db: Session,
    nombre: str,
    destino_id_actual: int | None = None,
) -> None:
    consulta = db.query(Destino).filter(
        Destino.nombre == nombre.strip(),
        Destino.eliminado_en.is_(None),
    )
    existente = consulta.first()
    if existente is not None and existente.id != destino_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un destino con ese nombre",
        )


@router.get("")
def listar_destinos(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_DESTINOS)),
):
    consulta = (
        db.query(Destino)
        .filter(Destino.eliminado_en.is_(None))
        .order_by(Destino.nombre.asc())
    )
    lista = consulta.all()
    return [destino_a_dict(db, destino) for destino in lista]


@router.get("/{destino_id}")
def obtener_destino(
    destino_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return {"destino": destino_a_dict(db, destino, incluir_galeria=True)}


@router.post("")
def crear_destino(
    datos: DatosDestinoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_DESTINOS)),
):
    nombre = datos.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")

    validar_nombre_no_repetido(db, nombre)

    ahora = datetime.now()
    nuevo_destino = Destino(
        nombre=nombre,
        descripcion=datos.descripcion,
        precio_base_eur=datos.precio_base_eur,
        activo=datos.activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_destino)
    db.flush()

    if datos.url_portada:
        crear_imagen_destino(db, nuevo_destino.id, datos.url_portada, es_portada=True)

    db.commit()
    db.refresh(nuevo_destino)

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
def actualizar_destino(
    destino_id: int,
    datos: DatosDestinoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    if datos.nombre is not None:
        nombre = datos.nombre.strip()
        if not nombre:
            raise HTTPException(status_code=400, detail="El nombre es obligatorio")
        validar_nombre_no_repetido(db, nombre, destino_id)
        destino.nombre = nombre

    if datos.descripcion is not None:
        destino.descripcion = datos.descripcion

    if datos.precio_base_eur is not None:
        destino.precio_base_eur = datos.precio_base_eur

    if datos.activo is not None:
        destino.activo = datos.activo

    if datos.url_portada is not None:
        url_portada = datos.url_portada.strip()
        if url_portada:
            portada = (
                db.query(DestinoImagen)
                .filter(
                    DestinoImagen.destino_id == destino_id,
                    DestinoImagen.es_portada.is_(True),
                    DestinoImagen.eliminado_en.is_(None),
                )
                .first()
            )
            if portada is not None:
                portada.url = validar_url_imagen(url_portada)
                portada.actualizado_en = datetime.now()
            else:
                crear_imagen_destino(db, destino_id, url_portada, es_portada=True)

    destino.actualizado_en = datetime.now()
    db.commit()
    db.refresh(destino)

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
def anular_destino(
    destino_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    ahora = datetime.now()
    destino.eliminado_en = ahora
    destino.actualizado_en = ahora
    db.commit()

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
def listar_imagenes_destino(
    destino_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    _, imagenes = imagenes_destino(db, destino_id)
    return {"imagenes": imagenes}


@router.post("/{destino_id}/imagenes/upload")
async def subir_imagen_destino(
    destino_id: int,
    request: Request,
    archivo: UploadFile = File(...),
    es_portada: bool = Form(False),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    url_publica = await procesar_y_guardar_imagen_destino(destino_id, archivo)
    nueva = crear_imagen_destino(db, destino_id, url_publica, es_portada=es_portada)
    destino.actualizado_en = datetime.now()
    db.commit()
    db.refresh(nueva)

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
        "imagen": {
            "id": nueva.id,
            "url": nueva.url,
            "orden": nueva.orden,
            "es_portada": bool(nueva.es_portada),
        },
    }


@router.post("/{destino_id}/imagenes")
def agregar_imagen_destino(
    destino_id: int,
    datos: DatosImagenDestinoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    nueva = crear_imagen_destino(db, destino_id, datos.url, es_portada=datos.es_portada)
    destino.actualizado_en = datetime.now()
    db.commit()
    db.refresh(nueva)

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
        "imagen": {
            "id": nueva.id,
            "url": nueva.url,
            "orden": nueva.orden,
            "es_portada": bool(nueva.es_portada),
        },
    }


@router.put("/{destino_id}/imagenes/{imagen_id}")
def actualizar_imagen_destino(
    destino_id: int,
    imagen_id: int,
    datos: DatosImagenDestinoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    imagen = buscar_imagen_activa(db, destino_id, imagen_id)
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    if datos.url is not None:
        imagen.url = validar_url_imagen(datos.url)

    if datos.es_portada is not None and datos.es_portada:
        marcar_como_portada(db, destino_id, imagen_id)
    elif datos.es_portada is not None:
        imagen.es_portada = False

    imagen.actualizado_en = datetime.now()
    destino.actualizado_en = datetime.now()
    db.commit()
    db.refresh(imagen)

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
        "imagen": {
            "id": imagen.id,
            "url": imagen.url,
            "orden": imagen.orden,
            "es_portada": bool(imagen.es_portada),
        },
    }


@router.delete("/{destino_id}/imagenes/{imagen_id}")
def quitar_imagen_destino(
    destino_id: int,
    imagen_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_DESTINOS)),
):
    destino = buscar_destino_activo(db, destino_id)
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")

    imagen = buscar_imagen_activa(db, destino_id, imagen_id)
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    era_portada = bool(imagen.es_portada)
    url_imagen = imagen.url
    ahora = datetime.now()
    imagen.eliminado_en = ahora
    imagen.actualizado_en = ahora
    destino.actualizado_en = ahora

    if era_portada:
        siguiente = (
            db.query(DestinoImagen)
            .filter(
                DestinoImagen.destino_id == destino_id,
                DestinoImagen.id != imagen_id,
                DestinoImagen.eliminado_en.is_(None),
            )
            .order_by(DestinoImagen.orden.asc(), DestinoImagen.id.asc())
            .first()
        )
        if siguiente is not None:
            marcar_como_portada(db, destino_id, siguiente.id)

    db.commit()
    eliminar_archivo_imagen(url_imagen)

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
