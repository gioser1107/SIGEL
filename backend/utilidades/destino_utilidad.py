from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.destino_imagen_modelo import DestinoImagen
from modelos.destino_modelo import Destino

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
        "recargo_menor_eur": float(destino.recargo_menor_eur) if destino.recargo_menor_eur is not None else 0.0,
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

def buscar_imagen_activa(
    db: Session,
    destino_id: int,
    imagen_id: int,
) -> DestinoImagen | None:
    consulta = db.query(DestinoImagen).filter(
        DestinoImagen.id == imagen_id,
        DestinoImagen.destino_id == destino_id,
        DestinoImagen.eliminado_en.is_(None),
    )
    return consulta.first()

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
    consulta = db.query(DestinoImagen).filter(
        DestinoImagen.destino_id == destino_id,
        DestinoImagen.eliminado_en.is_(None),
    )
    return consulta.first() is not None

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
