from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from modelos.destino_imagen_modelo import DestinoImagen
from modelos.destino_modelo import Destino
from modelos.punto_recogida_modelo import PuntoRecogida
from modelos.unidad_transporte_modelo import UnidadTransporte
from modelos.viaje_modelo import Viaje
from modelos.viaje_parada_modelo import ViajeParadaRecogida

router = APIRouter(prefix="/catalogo", tags=["Catálogo público"])

IMAGEN_DEFAULT = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop"

def _imagen_a_dict(img: DestinoImagen) -> dict:
    return {
        "id": img.id,
        "url": img.url,
        "orden": img.orden,
        "es_portada": bool(img.es_portada),
    }

def _imagenes_destino(db: Session, destino_id: int) -> tuple[str, list[dict]]:
    filas = (
        db.query(DestinoImagen)
        .filter(
            DestinoImagen.destino_id == destino_id,
            DestinoImagen.eliminado_en.is_(None),
        )
        .order_by(DestinoImagen.es_portada.desc(), DestinoImagen.orden.asc(), DestinoImagen.id.asc())
        .all()
    )
    if not filas:
        return IMAGEN_DEFAULT, []

    lista = [_imagen_a_dict(f) for f in filas]
    portada = next((f.url for f in filas if f.es_portada), filas[0].url)
    return portada, lista

def _destino_a_dict(db: Session, destino: Destino, incluir_galeria: bool = False) -> dict:
    precio = destino.precio_base_eur
    portada, imagenes = _imagenes_destino(db, destino.id)
    resultado = {
        "id": destino.id,
        "nombre": destino.nombre,
        "descripcion": destino.descripcion,
        "precio_base_eur": float(precio) if precio is not None else None,
        "imagen": portada,
        "activo": destino.activo,
    }
    if incluir_galeria:
        resultado["imagenes"] = imagenes
    return resultado

def _formatear_hora(fecha: datetime) -> str:
    return fecha.strftime("%I:%M %p").lstrip("0").replace("AM", " AM").replace("PM", " PM")

def _calcular_duracion(fecha_salida: datetime, fecha_regreso: datetime | None) -> str:
    if fecha_regreso is None:
        return "1 día"
    delta = fecha_regreso - fecha_salida
    horas = delta.total_seconds() / 3600
    if horas >= 48:
        dias = int(horas // 24)
        noches = max(dias - 1, 1)
        return f"{dias} días {noches} noche{'s' if noches > 1 else ''}"
    if horas >= 10:
        return f"{int(horas)} horas"
    return f"{int(horas)} horas"

def _viaje_catalogo_dict(db: Session, viaje: Viaje) -> dict:
    destino = db.query(Destino).filter(Destino.id == viaje.destino_id).first()
    unidad = db.query(UnidadTransporte).filter(UnidadTransporte.id == viaje.unidad_id).first()
    nombre_destino = destino.nombre if destino is not None else "Viaje"
    descripcion_destino = destino.descripcion if destino is not None else ""
    precio = float(destino.precio_base_eur) if destino is not None and destino.precio_base_eur is not None else 0
    recargo_menor = float(destino.recargo_menor_eur) if destino is not None and destino.recargo_menor_eur is not None else 0
    portada, _ = _imagenes_destino(db, viaje.destino_id) if destino is not None else (IMAGEN_DEFAULT, [])

    paradas = (
        db.query(ViajeParadaRecogida, PuntoRecogida)
        .join(PuntoRecogida, PuntoRecogida.id == ViajeParadaRecogida.punto_recogida_id)
        .filter(
            ViajeParadaRecogida.viaje_id == viaje.id,
            ViajeParadaRecogida.eliminado_en.is_(None),
        )
        .order_by(ViajeParadaRecogida.orden)
        .all()
    )
    paradas_resumen = [
        {
            "orden": p.orden,
            "nombre": punto.nombre,
            "hora_programada": p.hora_programada,
        }
        for p, punto in paradas
    ]

    fecha_clave = viaje.fecha_salida.strftime("%Y-%m-%d")
    duracion = _calcular_duracion(viaje.fecha_salida, viaje.fecha_regreso)
    dificultad = "Moderado"
    if duracion.startswith("1") and "hora" in duracion and int(duracion.split()[0]) <= 8:
        dificultad = "Fácil"
    elif "días" in duracion:
        dificultad = "Moderado"

    return {
        "id": viaje.id,
        "destino_id": viaje.destino_id,
        "titulo": nombre_destino,
        "ubicacion": descripcion_destino[:120] if descripcion_destino else "Venezuela",
        "precio": precio,
        "recargo_menor_eur": recargo_menor,
        "imagen": portada,
        "hora": _formatear_hora(viaje.fecha_salida),
        "cupos": unidad.capacidad if unidad is not None else 0,
        "duracion": duracion,
        "dificultad": dificultad,
        "descripcion": descripcion_destino or f"Salida programada a {nombre_destino}.",
        "fecha": fecha_clave,
        "fecha_salida": viaje.fecha_salida,
        "fecha_regreso": viaje.fecha_regreso,
        "estado": viaje.estado,
        "unidad_placa": unidad.placa if unidad is not None else None,
        "paradas": paradas_resumen,
    }

@router.get("/estadisticas")
def estadisticas_catalogo(db: Session = Depends(get_db)):
    ahora = datetime.now()
    destinos_activos = db.query(Destino).filter(
        Destino.activo.is_(True),
        Destino.eliminado_en.is_(None),
    ).count()
    viajes_proximos = db.query(Viaje).filter(
        Viaje.eliminado_en.is_(None),
        Viaje.estado == "planificado",
        Viaje.fecha_salida >= ahora,
    ).count()
    return {
        "destinos_activos": destinos_activos,
        "viajes_proximos": viajes_proximos,
    }

@router.get("/destinos")
def listar_destinos_catalogo(db: Session = Depends(get_db)):
    consulta = db.query(Destino).filter(
        Destino.activo.is_(True),
        Destino.eliminado_en.is_(None),
    ).order_by(Destino.nombre)
    return [_destino_a_dict(db, d) for d in consulta.all()]

@router.get("/destinos/{destino_id}")
def obtener_destino_catalogo(destino_id: int, db: Session = Depends(get_db)):
    destino = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.activo.is_(True),
        Destino.eliminado_en.is_(None),
    ).first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return _destino_a_dict(db, destino, incluir_galeria=True)

@router.get("/viajes")
def listar_viajes_catalogo(
    destino_id: int | None = Query(default=None),
    mes: str | None = Query(default=None, description="Formato YYYY-MM"),
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
):
    ahora = datetime.now()
    consulta = db.query(Viaje).filter(
        Viaje.eliminado_en.is_(None),
        Viaje.estado == "planificado",
        Viaje.fecha_salida >= ahora,
    )

    if destino_id is not None:
        consulta = consulta.filter(Viaje.destino_id == destino_id)
    if mes is not None:
        try:
            partes = mes.split("-")
            anio, mes_num = int(partes[0]), int(partes[1])
            inicio_mes = datetime(anio, mes_num, 1)
            if mes_num == 12:
                fin_mes = datetime(anio + 1, 1, 1)
            else:
                fin_mes = datetime(anio, mes_num + 1, 1)
            consulta = consulta.filter(Viaje.fecha_salida >= inicio_mes, Viaje.fecha_salida < fin_mes)
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Formato de mes inválido. Use YYYY-MM")
    if desde is not None:
        consulta = consulta.filter(Viaje.fecha_salida >= desde)
    if hasta is not None:
        consulta = consulta.filter(Viaje.fecha_salida <= hasta)

    consulta = consulta.order_by(Viaje.fecha_salida.asc())
    return [_viaje_catalogo_dict(db, v) for v in consulta.all()]

@router.get("/viajes/{viaje_id}")
def obtener_viaje_catalogo(viaje_id: int, db: Session = Depends(get_db)):
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
        Viaje.estado == "planificado",
    ).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return _viaje_catalogo_dict(db, viaje)

@router.get("/viajes/{viaje_id}/paradas")
def obtener_paradas_viaje_publico(viaje_id: int, db: Session = Depends(get_db)):
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
    ).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    paradas = (
        db.query(ViajeParadaRecogida, PuntoRecogida)
        .join(PuntoRecogida, PuntoRecogida.id == ViajeParadaRecogida.punto_recogida_id)
        .filter(
            ViajeParadaRecogida.viaje_id == viaje_id,
            ViajeParadaRecogida.eliminado_en.is_(None),
        )
        .order_by(ViajeParadaRecogida.orden)
        .all()
    )

    return [
        {
            "punto_recogida_id": p.punto_recogida_id,
            "punto_nombre": punto.nombre,
            "orden": p.orden,
            "hora_programada": p.hora_programada,
        }
        for p, punto in paradas
    ]
