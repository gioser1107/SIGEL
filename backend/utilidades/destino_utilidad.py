from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.destino_imagen_modelo import DestinoImagen
from modelos.destino_modelo import Destino
from utilidades.archivo_imagen_utilidad import eliminar_archivo_imagen

IMAGEN_DEFAULT = (
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"
    "?q=80&w=800&auto=format&fit=crop"
)


def _imagen_a_dict(img: DestinoImagen) -> dict:
    return {
        "id": img.id,
        "url": img.url,
        "orden": img.orden,
        "es_portada": bool(img.es_portada),
    }


def imagenes_destino(db: Session, destino_id: int) -> tuple[str, list[dict]]:
    filas = (
        db.query(DestinoImagen)
        .filter(
            DestinoImagen.destino_id == destino_id,
            DestinoImagen.eliminado_en.is_(None),
        )
        .order_by(
            DestinoImagen.es_portada.desc(),
            DestinoImagen.orden.asc(),
            DestinoImagen.id.asc(),
        )
        .all()
    )
    if not filas:
        return IMAGEN_DEFAULT, []

    lista = [_imagen_a_dict(f) for f in filas]
    portada = next((f.url for f in filas if f.es_portada), filas[0].url)
    return portada, lista


def destino_a_dict(
    db: Session,
    destino: Destino,
    incluir_galeria: bool = False,
) -> dict:
    precio = destino.precio_base_eur
    portada, imagenes = imagenes_destino(db, destino.id)
    resultado = {
        "id": destino.id,
        "nombre": destino.nombre,
        "descripcion": destino.descripcion,
        "precio_base_eur": float(precio) if precio is not None else 0.0,
        "imagen": portada,
        "activo": destino.activo,
        "creado_en": destino.creado_en,
        "actualizado_en": destino.actualizado_en,
    }
    if incluir_galeria:
        resultado["imagenes"] = imagenes
    return resultado


def validar_url_imagen(url: str) -> str:
    url_limpia = url.strip()
    if not url_limpia:
        raise HTTPException(status_code=400, detail="La URL de la imagen es obligatoria")
    if url_limpia.startswith("/api/archivos/"):
        if len(url_limpia) > 512:
            raise HTTPException(status_code=400, detail="La ruta no puede superar 512 caracteres")
        return url_limpia
    if not url_limpia.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail="La URL debe comenzar con http://, https:// o ser una ruta de archivo subido",
        )
    if len(url_limpia) > 512:
        raise HTTPException(status_code=400, detail="La URL no puede superar 512 caracteres")
    return url_limpia


def buscar_destino_activo(db: Session, destino_id: int) -> Destino:
    destino = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.eliminado_en.is_(None),
    ).first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return destino


def validar_nombre_no_repetido(
    db: Session,
    nombre: str,
    destino_id_actual: int | None = None,
) -> None:
    existente = db.query(Destino).filter(
        Destino.nombre == nombre.strip(),
        Destino.eliminado_en.is_(None),
    ).first()
    if existente is not None and existente.id != destino_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un destino con ese nombre",
        )


def buscar_imagen_activa(
    db: Session,
    destino_id: int,
    imagen_id: int,
) -> DestinoImagen:
    imagen = db.query(DestinoImagen).filter(
        DestinoImagen.id == imagen_id,
        DestinoImagen.destino_id == destino_id,
        DestinoImagen.eliminado_en.is_(None),
    ).first()
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return imagen


def siguiente_orden_imagen(db: Session, destino_id: int) -> int:
    ultima = (
        db.query(DestinoImagen)
        .filter(
            DestinoImagen.destino_id == destino_id,
            DestinoImagen.eliminado_en.is_(None),
        )
        .order_by(DestinoImagen.orden.desc(), DestinoImagen.id.desc())
        .first()
    )
    if ultima is None:
        return 0
    return int(ultima.orden) + 1


def tiene_imagenes_activas(db: Session, destino_id: int) -> bool:
    return db.query(DestinoImagen).filter(
        DestinoImagen.destino_id == destino_id,
        DestinoImagen.eliminado_en.is_(None),
    ).first() is not None


def marcar_como_portada(db: Session, destino_id: int, imagen_id: int) -> None:
    ahora = datetime.now()
    filas = (
        db.query(DestinoImagen)
        .filter(
            DestinoImagen.destino_id == destino_id,
            DestinoImagen.eliminado_en.is_(None),
        )
        .all()
    )
    for fila in filas:
        fila.es_portada = fila.id == imagen_id
        fila.actualizado_en = ahora


def crear_imagen_destino(
    db: Session,
    destino_id: int,
    url: str,
    es_portada: bool = False,
) -> DestinoImagen:
    url_valida = validar_url_imagen(url)
    ahora = datetime.now()
    sin_imagenes = not tiene_imagenes_activas(db, destino_id)
    debe_ser_portada = es_portada or sin_imagenes

    nueva = DestinoImagen(
        destino_id=destino_id,
        url=url_valida,
        orden=siguiente_orden_imagen(db, destino_id),
        es_portada=debe_ser_portada,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva)
    db.flush()

    if debe_ser_portada:
        marcar_como_portada(db, destino_id, nueva.id)

    return nueva


def imagen_destino_a_dict(imagen: DestinoImagen) -> dict:
    return {
        "id": imagen.id,
        "url": imagen.url,
        "orden": imagen.orden,
        "es_portada": bool(imagen.es_portada),
    }


def listar_destinos(db: Session) -> list[dict]:
    destinos = (
        db.query(Destino)
        .filter(Destino.eliminado_en.is_(None))
        .order_by(Destino.nombre.asc())
        .all()
    )
    return [destino_a_dict(db, destino) for destino in destinos]


def crear_destino(
    db: Session,
    nombre: str,
    descripcion: str | None,
    precio_base_eur: Decimal,
    activo: bool,
    url_portada: str | None,
) -> Destino:
    nombre_limpio = nombre.strip()
    if not nombre_limpio:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")

    validar_nombre_no_repetido(db, nombre_limpio)

    ahora = datetime.now()
    nuevo_destino = Destino(
        nombre=nombre_limpio,
        descripcion=descripcion,
        precio_base_eur=precio_base_eur,
        activo=activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_destino)
    db.flush()

    if url_portada:
        crear_imagen_destino(db, nuevo_destino.id, url_portada, es_portada=True)

    db.commit()
    db.refresh(nuevo_destino)
    return nuevo_destino


def actualizar_destino(
    db: Session,
    destino_id: int,
    nombre: str | None,
    descripcion: str | None,
    precio_base_eur: Decimal | None,
    activo: bool | None,
    url_portada: str | None,
) -> Destino:
    destino = buscar_destino_activo(db, destino_id)

    if nombre is not None:
        nombre_limpio = nombre.strip()
        if not nombre_limpio:
            raise HTTPException(status_code=400, detail="El nombre es obligatorio")
        validar_nombre_no_repetido(db, nombre_limpio, destino_id)
        destino.nombre = nombre_limpio

    if descripcion is not None:
        destino.descripcion = descripcion

    if precio_base_eur is not None:
        destino.precio_base_eur = precio_base_eur

    if activo is not None:
        destino.activo = activo

    if url_portada is not None:
        url_limpia = url_portada.strip()
        if url_limpia:
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
                portada.url = validar_url_imagen(url_limpia)
                portada.actualizado_en = datetime.now()
            else:
                crear_imagen_destino(db, destino_id, url_limpia, es_portada=True)

    destino.actualizado_en = datetime.now()
    db.commit()
    db.refresh(destino)
    return destino


def anular_destino(db: Session, destino_id: int) -> Destino:
    destino = buscar_destino_activo(db, destino_id)
    ahora = datetime.now()
    destino.eliminado_en = ahora
    destino.actualizado_en = ahora
    db.commit()
    return destino


def listar_imagenes_destino(db: Session, destino_id: int) -> list[dict]:
    buscar_destino_activo(db, destino_id)
    _, imagenes = imagenes_destino(db, destino_id)
    return imagenes


def agregar_imagen_destino(
    db: Session,
    destino_id: int,
    url: str,
    es_portada: bool,
) -> DestinoImagen:
    destino = buscar_destino_activo(db, destino_id)
    nueva = crear_imagen_destino(db, destino_id, url, es_portada=es_portada)
    destino.actualizado_en = datetime.now()
    db.commit()
    db.refresh(nueva)
    return nueva


def actualizar_imagen_destino(
    db: Session,
    destino_id: int,
    imagen_id: int,
    url: str | None,
    es_portada: bool | None,
) -> DestinoImagen:
    destino = buscar_destino_activo(db, destino_id)
    imagen = buscar_imagen_activa(db, destino_id, imagen_id)

    if url is not None:
        imagen.url = validar_url_imagen(url)

    if es_portada is not None and es_portada:
        marcar_como_portada(db, destino_id, imagen_id)
    elif es_portada is not None:
        imagen.es_portada = False

    imagen.actualizado_en = datetime.now()
    destino.actualizado_en = datetime.now()
    db.commit()
    db.refresh(imagen)
    return imagen


def quitar_imagen_destino(db: Session, destino_id: int, imagen_id: int) -> str:
    destino = buscar_destino_activo(db, destino_id)
    imagen = buscar_imagen_activa(db, destino_id, imagen_id)

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
    return url_imagen
