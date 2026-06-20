from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.destino_modelo import Destino
from modelos.punto_recogida_modelo import PuntoRecogida
from modelos.unidad_transporte_modelo import UnidadTransporte
from modelos.viaje_modelo import Viaje
from modelos.viaje_parada_modelo import ViajeParadaRecogida
from utilidades.destino_utilidad import IMAGEN_DEFAULT, destino_a_dict, imagenes_destino


def formatear_hora(fecha: datetime) -> str:
    return fecha.strftime("%I:%M %p").lstrip("0").replace("AM", " AM").replace("PM", " PM")


def calcular_duracion(fecha_salida: datetime, fecha_regreso: datetime | None) -> str:
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


def viaje_catalogo_dict(db: Session, viaje: Viaje) -> dict:
    destino = db.query(Destino).filter(Destino.id == viaje.destino_id).first()
    unidad = db.query(UnidadTransporte).filter(UnidadTransporte.id == viaje.unidad_id).first()
    nombre_destino = destino.nombre if destino is not None else "Viaje"
    descripcion_destino = destino.descripcion if destino is not None else ""
    precio = float(destino.precio_base_eur) if destino is not None and destino.precio_base_eur is not None else 0
    portada, _ = imagenes_destino(db, viaje.destino_id) if destino is not None else (IMAGEN_DEFAULT, [])

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
    duracion = calcular_duracion(viaje.fecha_salida, viaje.fecha_regreso)
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
        "imagen": portada,
        "hora": formatear_hora(viaje.fecha_salida),
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


def estadisticas_catalogo(db: Session) -> dict:
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


def listar_destinos_catalogo(db: Session) -> list[dict]:
    consulta = db.query(Destino).filter(
        Destino.activo.is_(True),
        Destino.eliminado_en.is_(None),
    ).order_by(Destino.nombre)
    return [destino_a_dict(db, d) for d in consulta.all()]


def obtener_destino_catalogo(db: Session, destino_id: int) -> dict:
    destino = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.activo.is_(True),
        Destino.eliminado_en.is_(None),
    ).first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return destino_a_dict(db, destino, incluir_galeria=True)


def listar_viajes_catalogo(
    db: Session,
    destino_id: int | None = None,
    mes: str | None = None,
    desde: datetime | None = None,
    hasta: datetime | None = None,
) -> list[dict]:
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
    return [viaje_catalogo_dict(db, v) for v in consulta.all()]


def obtener_viaje_catalogo(db: Session, viaje_id: int) -> dict:
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
        Viaje.estado == "planificado",
    ).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return viaje_catalogo_dict(db, viaje)


def obtener_paradas_viaje_publico(db: Session, viaje_id: int) -> list[dict]:
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
