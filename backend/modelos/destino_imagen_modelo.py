import io
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, SmallInteger, String

from database import Base

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
PREFIJO_ARCHIVOS = "/api/archivos"
MAX_BYTES = 10 * 1024 * 1024
MAX_LADO_PX = 1920
MAX_LADO_THUMB_PX = 600
CALIDAD_WEBP = 82
TIPOS_PERMITIDOS = {"image/jpeg", "image/png", "image/webp", "image/jpg"}


class DestinoImagen(Base):
    __tablename__ = "destino_imagenes"

    id = Column(BigInteger, primary_key=True, index=True)
    destino_id = Column(BigInteger, ForeignKey("destinos.id"), nullable=False, index=True)
    url = Column(String(512), nullable=False)
    orden = Column(SmallInteger, nullable=False, default=0)
    es_portada = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def asegurar_carpeta_uploads() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def es_url_archivo_local(url: str) -> bool:
    return url.startswith(f"{PREFIJO_ARCHIVOS}/")


def ruta_fisica_desde_url(url: str) -> Path | None:
    if not es_url_archivo_local(url):
        return None

    relativa = url.removeprefix(f"{PREFIJO_ARCHIVOS}/").lstrip("/")
    ruta = (UPLOAD_ROOT / relativa).resolve()
    raiz = UPLOAD_ROOT.resolve()

    if not str(ruta).startswith(str(raiz)):
        return None

    return ruta


def eliminar_archivo_imagen(url: str) -> None:
    ruta = ruta_fisica_desde_url(url)
    if ruta is not None and ruta.is_file():
        ruta.unlink()


async def procesar_y_guardar_imagen_destino(
    destino_id: int,
    archivo: UploadFile,
) -> str:
    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    if len(contenido) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 5 MB")

    tipo = (archivo.content_type or "").lower()
    if tipo not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa JPG, PNG o WebP.",
        )

    try:
        imagen = Image.open(io.BytesIO(contenido))
        imagen = ImageOps.exif_transpose(imagen)

        if imagen.mode == "RGBA":
            fondo = Image.new("RGB", imagen.size, (255, 255, 255))
            fondo.paste(imagen, mask=imagen.split()[3])
            imagen = fondo
        elif imagen.mode != "RGB":
            imagen = imagen.convert("RGB")

        imagen.thumbnail((MAX_LADO_PX, MAX_LADO_PX))
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=400,
            detail="El archivo no es una imagen válida",
        ) from exc

    carpeta = UPLOAD_ROOT / "destinos" / str(destino_id)
    carpeta.mkdir(parents=True, exist_ok=True)

    base = uuid4().hex

    nombre_full = f"{base}.webp"
    imagen_full = imagen.copy()
    imagen_full.thumbnail((MAX_LADO_PX, MAX_LADO_PX))
    imagen_full.save(carpeta / nombre_full, "WEBP", quality=CALIDAD_WEBP, method=6)

    nombre_thumb = f"{base}_thumb.webp"
    imagen_thumb = imagen.copy()
    imagen_thumb.thumbnail((MAX_LADO_THUMB_PX, MAX_LADO_THUMB_PX))
    imagen_thumb.save(carpeta / nombre_thumb, "WEBP", quality=CALIDAD_WEBP, method=6)

    return f"{PREFIJO_ARCHIVOS}/destinos/{destino_id}/{nombre_full}"
