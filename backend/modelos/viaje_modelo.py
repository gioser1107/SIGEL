from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Session

from database import Base
from modelos.asiento_modelo import Asiento
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.costo_operativo_modelo import CostoOperativo
from modelos.destino_modelo import Destino, IMAGEN_DEFAULT, imagenes_destino
from modelos.unidad_transporte_modelo import UnidadTransporte
from modelos.usuario_modelo import Usuario, nombre_completo_de


class Viaje(Base):
    __tablename__ = "viajes"

    id = Column(BigInteger, primary_key=True, index=True)
    destino_id = Column(BigInteger, ForeignKey("destinos.id"), nullable=False, index=True)
    unidad_id = Column(BigInteger, ForeignKey("unidades_transporte.id"), nullable=False, index=True)
    guia_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    fecha_salida = Column(DateTime, nullable=False)
    fecha_regreso = Column(DateTime, nullable=True)
    estado = Column(
        Enum("planificado", "en_curso", "finalizado", "cancelado"),
        nullable=False,
        default="planificado",
    )
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def contar_asientos_activos_unidad(db: Session, unidad_id: int) -> int:
    return (
        db.query(Asiento)
        .filter(Asiento.unidad_id == unidad_id, Asiento.eliminado_en.is_(None))
        .count()
    )


def contar_asientos_ocupados_viaje(db: Session, viaje_id: int) -> int:
    return (
        db.query(AsientoReservado)
        .filter(
            AsientoReservado.viaje_id == viaje_id,
            AsientoReservado.eliminado_en.is_(None),
        )
        .count()
    )


def obtener_unidad_activa_viaje(db: Session, viaje: Viaje) -> UnidadTransporte | None:
    if viaje.unidad_id is None:
        return None

    return (
        db.query(UnidadTransporte)
        .filter(
            UnidadTransporte.id == viaje.unidad_id,
            UnidadTransporte.eliminado_en.is_(None),
        )
        .first()
    )


def calcular_disponibilidad_viaje(db: Session, viaje: Viaje) -> dict:
    unidad = obtener_unidad_activa_viaje(db, viaje)
    tiene_unidad = unidad is not None

    if not tiene_unidad:
        return {
            "tiene_unidad": False,
            "total_asientos": 0,
            "asientos_ocupados": 0,
            "asientos_disponibles": 0,
            "asientos_completos": True,
            "disponible_para_reserva": False,
            "motivo_no_disponible": "sin_unidad_transporte",
        }

    total_asientos = contar_asientos_activos_unidad(db, viaje.unidad_id)
    asientos_ocupados = contar_asientos_ocupados_viaje(db, viaje.id)
    asientos_disponibles = max(total_asientos - asientos_ocupados, 0)
    asientos_completos = total_asientos > 0 and asientos_ocupados >= total_asientos
    sin_asientos_configurados = total_asientos == 0

    disponible = True
    motivo = None

    if viaje.estado in ("finalizado", "cancelado"):
        disponible = False
        motivo = "viaje_no_activo"
    elif sin_asientos_configurados:
        disponible = False
        motivo = "sin_asientos_en_unidad"
    elif asientos_completos:
        disponible = False
        motivo = "asientos_completos"

    return {
        "tiene_unidad": True,
        "unidad_id": unidad.id,
        "unidad_placa": unidad.placa,
        "total_asientos": total_asientos,
        "asientos_ocupados": asientos_ocupados,
        "asientos_disponibles": asientos_disponibles,
        "asientos_completos": asientos_completos or sin_asientos_configurados,
        "disponible_para_reserva": disponible,
        "motivo_no_disponible": motivo,
    }


def viaje_disponible_para_reserva(db: Session, viaje: Viaje) -> bool:
    info = calcular_disponibilidad_viaje(db, viaje)
    return info["disponible_para_reserva"]


def viaje_reserva_a_dict(db: Session, viaje: Viaje) -> dict:
    destino = (
        db.query(Destino)
        .filter(Destino.id == viaje.destino_id, Destino.eliminado_en.is_(None))
        .first()
    )
    disponibilidad = calcular_disponibilidad_viaje(db, viaje)

    return {
        "id": viaje.id,
        "destino_id": viaje.destino_id,
        "destino_nombre": destino.nombre if destino else None,
        "precio_base_eur": float(destino.precio_base_eur) if destino else 0.0,
        "fecha_salida": viaje.fecha_salida,
        "fecha_regreso": viaje.fecha_regreso,
        "estado": viaje.estado,
        "unidad_id": viaje.unidad_id,
        "disponibilidad": disponibilidad,
    }


def obtener_destino_activo(db: Session, destino_id: int) -> Destino:
    destino = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.eliminado_en.is_(None),
    ).first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return destino


def obtener_unidad_activa(db: Session, unidad_id: int) -> UnidadTransporte:
    unidad = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if unidad is None:
        raise HTTPException(status_code=404, detail="Unidad de transporte no encontrada")
    return unidad


def validar_guia_opcional(db: Session, guia_id: int | None) -> None:
    if guia_id is None:
        return
    guia = db.query(Usuario).filter(
        Usuario.id == guia_id,
        Usuario.eliminado_en.is_(None),
    ).first()
    if guia is None:
        raise HTTPException(status_code=404, detail="Guía no encontrado")


def validar_fechas_viaje(fecha_salida: datetime, fecha_regreso: datetime | None) -> None:
    if fecha_regreso is not None and fecha_regreso < fecha_salida:
        raise HTTPException(
            status_code=400,
            detail="La fecha de regreso no puede ser anterior a la fecha de salida",
        )


def obtener_viaje_activo(db: Session, viaje_id: int) -> Viaje:
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
    ).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return viaje


def viaje_a_dict(db: Session, viaje: Viaje) -> dict:
    destino = db.query(Destino).filter(Destino.id == viaje.destino_id).first()
    unidad = db.query(UnidadTransporte).filter(UnidadTransporte.id == viaje.unidad_id).first()
    guia = None
    if viaje.guia_id is not None:
        guia = db.query(Usuario).filter(Usuario.id == viaje.guia_id).first()

    return {
        "id": viaje.id,
        "destino_id": viaje.destino_id,
        "destino_nombre": destino.nombre if destino is not None else None,
        "precio_base": float(destino.precio_base_eur) if destino is not None else 0.0,
        "unidad_id": viaje.unidad_id,
        "unidad_placa": unidad.placa if unidad is not None else None,
        "guia_id": viaje.guia_id,
        "guia_nombre": nombre_completo_de(guia.nombre, guia.apellido) if guia is not None else None,
        "fecha_salida": viaje.fecha_salida,
        "fecha_regreso": viaje.fecha_regreso,
        "estado": viaje.estado,
        "creado_en": viaje.creado_en,
        "actualizado_en": viaje.actualizado_en,
    }


def obtener_viaje_detalle(db: Session, viaje_id: int) -> dict:
    from modelos.viaje_ruta_recogida_modelo import listar_ruta_recogida

    viaje = obtener_viaje_activo(db, viaje_id)
    detalle = viaje_a_dict(db, viaje)

    costos = (
        db.query(CostoOperativo)
        .filter(
            CostoOperativo.viaje_id == viaje_id,
            CostoOperativo.eliminado_en.is_(None),
        )
        .all()
    )

    detalle["ruta_recogida"] = listar_ruta_recogida(db, viaje_id)
    detalle["costos"] = [costo_a_dict(c) for c in costos]
    return detalle


def costo_a_dict(costo: CostoOperativo, incluir_viaje_id: bool = False) -> dict:
    resultado = {
        "id": costo.id,
        "categoria": costo.categoria,
        "monto_eur": float(costo.monto_eur),
        "descripcion": costo.descripcion,
    }
    if incluir_viaje_id:
        resultado["viaje_id"] = costo.viaje_id
    return resultado


def listar_viajes(
    db: Session,
    estado: Optional[str] = None,
    destino_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
) -> list[dict]:
    consulta = db.query(Viaje).filter(Viaje.eliminado_en.is_(None))

    if estado is not None:
        consulta = consulta.filter(Viaje.estado == estado)
    if destino_id is not None:
        consulta = consulta.filter(Viaje.destino_id == destino_id)
    if fecha_desde is not None:
        consulta = consulta.filter(Viaje.fecha_salida >= fecha_desde)
    if fecha_hasta is not None:
        consulta = consulta.filter(Viaje.fecha_salida <= fecha_hasta)

    consulta = consulta.order_by(Viaje.fecha_salida.desc())
    return [viaje_a_dict(db, v) for v in consulta.all()]


def crear_viaje(
    db: Session,
    destino_id: int,
    unidad_id: int,
    fecha_salida: datetime,
    guia_id: Optional[int] = None,
    fecha_regreso: Optional[datetime] = None,
    estado: str = "planificado",
) -> Viaje:
    obtener_destino_activo(db, destino_id)
    obtener_unidad_activa(db, unidad_id)
    validar_guia_opcional(db, guia_id)
    validar_fechas_viaje(fecha_salida, fecha_regreso)

    ahora = datetime.now()
    nuevo_viaje = Viaje(
        destino_id=destino_id,
        unidad_id=unidad_id,
        guia_id=guia_id,
        fecha_salida=fecha_salida,
        fecha_regreso=fecha_regreso,
        estado=estado,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_viaje)
    db.commit()
    db.refresh(nuevo_viaje)
    return nuevo_viaje


def actualizar_viaje(
    db: Session,
    viaje_id: int,
    destino_id: Optional[int] = None,
    unidad_id: Optional[int] = None,
    guia_id: Optional[int] = None,
    fecha_salida: Optional[datetime] = None,
    fecha_regreso: Optional[datetime] = None,
    estado: Optional[str] = None,
) -> Viaje:
    viaje = obtener_viaje_activo(db, viaje_id)

    if viaje.estado in ("finalizado", "cancelado"):
        raise HTTPException(
            status_code=400,
            detail="No se puede modificar un viaje finalizado o cancelado",
        )

    if destino_id is not None:
        obtener_destino_activo(db, destino_id)
        viaje.destino_id = destino_id
    if unidad_id is not None:
        obtener_unidad_activa(db, unidad_id)
        viaje.unidad_id = unidad_id
    if guia_id is not None:
        validar_guia_opcional(db, guia_id)
        viaje.guia_id = guia_id
    if fecha_salida is not None:
        viaje.fecha_salida = fecha_salida
    if fecha_regreso is not None:
        viaje.fecha_regreso = fecha_regreso
    if estado is not None:
        viaje.estado = estado

    validar_fechas_viaje(viaje.fecha_salida, viaje.fecha_regreso)

    viaje.actualizado_en = datetime.now()
    db.commit()
    db.refresh(viaje)
    return viaje


def eliminar_viaje(db: Session, viaje_id: int) -> None:
    viaje = obtener_viaje_activo(db, viaje_id)
    ahora = datetime.now()
    viaje.eliminado_en = ahora
    viaje.actualizado_en = ahora
    db.commit()


def listar_costos(db: Session, viaje_id: int) -> list[dict]:
    obtener_viaje_activo(db, viaje_id)

    costos = db.query(CostoOperativo).filter(
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    ).all()

    return [costo_a_dict(c, incluir_viaje_id=True) for c in costos]


def resumen_costos(db: Session, viaje_id: int) -> dict:
    obtener_viaje_activo(db, viaje_id)

    costos = db.query(CostoOperativo).filter(
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    ).all()

    resumen_por_categoria: dict[str, Decimal] = {}
    total_eur = Decimal("0")

    for costo in costos:
        categoria = costo.categoria
        monto = Decimal(str(costo.monto_eur))
        if categoria not in resumen_por_categoria:
            resumen_por_categoria[categoria] = Decimal("0")
        resumen_por_categoria[categoria] += monto
        total_eur += monto

    detalle = [
        {"categoria": categoria, "monto_eur": float(monto)}
        for categoria, monto in resumen_por_categoria.items()
    ]

    return {
        "viaje_id": viaje_id,
        "total_eur": float(total_eur),
        "por_categoria": detalle,
    }


def crear_costo(
    db: Session,
    viaje_id: int,
    categoria: str,
    monto_eur: Decimal,
    descripcion: Optional[str] = None,
) -> CostoOperativo:
    obtener_viaje_activo(db, viaje_id)

    ahora = datetime.now()
    nuevo_costo = CostoOperativo(
        viaje_id=viaje_id,
        categoria=categoria,
        monto_eur=monto_eur,
        descripcion=descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_costo)
    db.commit()
    db.refresh(nuevo_costo)
    return nuevo_costo


def actualizar_costo(
    db: Session,
    viaje_id: int,
    costo_id: int,
    categoria: Optional[str] = None,
    monto_eur: Optional[Decimal] = None,
    descripcion: Optional[str] = None,
) -> CostoOperativo:
    obtener_viaje_activo(db, viaje_id)

    costo = db.query(CostoOperativo).filter(
        CostoOperativo.id == costo_id,
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    ).first()
    if costo is None:
        raise HTTPException(status_code=404, detail="Costo operativo no encontrado")

    if categoria is not None:
        costo.categoria = categoria
    if monto_eur is not None:
        costo.monto_eur = monto_eur
    if descripcion is not None:
        costo.descripcion = descripcion

    costo.actualizado_en = datetime.now()
    db.commit()
    db.refresh(costo)
    return costo


def eliminar_costo(db: Session, viaje_id: int, costo_id: int) -> None:
    obtener_viaje_activo(db, viaje_id)

    costo = db.query(CostoOperativo).filter(
        CostoOperativo.id == costo_id,
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    ).first()
    if costo is None:
        raise HTTPException(status_code=404, detail="Costo operativo no encontrado")

    ahora = datetime.now()
    costo.eliminado_en = ahora
    costo.actualizado_en = ahora
    db.commit()


def asientos_disponibles(db: Session, viaje_id: int) -> dict:
    viaje = obtener_viaje_activo(db, viaje_id)

    asientos = db.query(Asiento).filter(
        Asiento.unidad_id == viaje.unidad_id,
        Asiento.eliminado_en.is_(None),
    ).order_by(Asiento.id).all()

    reservados = db.query(AsientoReservado.asiento_id).filter(
        AsientoReservado.viaje_id == viaje_id,
        AsientoReservado.eliminado_en.is_(None),
    ).all()
    ids_ocupados = {r.asiento_id for r in reservados}

    lista_asientos = [
        {
            "id": a.id,
            "numero": a.numero,
            "posicion": a.posicion,
            "ocupado": a.id in ids_ocupados,
        }
        for a in asientos
    ]

    return {
        "viaje_id": viaje_id,
        "unidad_id": viaje.unidad_id,
        "total_asientos": len(asientos),
        "total_ocupados": len(ids_ocupados),
        "total_disponibles": len(asientos) - len(ids_ocupados),
        "asientos": lista_asientos,
    }


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
    nombre_destino = destino.nombre if destino is not None else "Viaje"
    descripcion_destino = destino.descripcion if destino is not None else ""
    precio = float(destino.precio_base_eur) if destino is not None and destino.precio_base_eur is not None else 0
    recargo_menor = float(destino.recargo_menor_eur) if destino is not None and destino.recargo_menor_eur is not None else 0
    portada, _ = imagenes_destino(db, viaje.destino_id) if destino is not None else (IMAGEN_DEFAULT, [])

    disponibilidad = calcular_disponibilidad_viaje(db, viaje)
    unidad_activa = obtener_unidad_activa_viaje(db, viaje)

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
        "recargo_menor_eur": recargo_menor,
        "imagen": portada,
        "hora": formatear_hora(viaje.fecha_salida),
        "cupos": disponibilidad["asientos_disponibles"],
        "cupos_totales": disponibilidad["total_asientos"],
        "disponibilidad": disponibilidad,
        "duracion": duracion,
        "dificultad": dificultad,
        "descripcion": descripcion_destino or f"Salida programada a {nombre_destino}.",
        "fecha": fecha_clave,
        "fecha_salida": viaje.fecha_salida,
        "fecha_regreso": viaje.fecha_regreso,
        "estado": viaje.estado,
        "unidad_placa": unidad_activa.placa if unidad_activa is not None else None,
    }


def estadisticas_catalogo(db: Session) -> dict:
    ahora = datetime.now()
    destinos_activos = db.query(Destino).filter(
        Destino.activo.is_(True),
        Destino.eliminado_en.is_(None),
    ).count()
    viajes_candidatos = db.query(Viaje).filter(
        Viaje.eliminado_en.is_(None),
        Viaje.estado == "planificado",
        Viaje.fecha_salida >= ahora,
    ).all()
    viajes_proximos = sum(
        1 for viaje in viajes_candidatos if viaje_disponible_para_reserva(db, viaje)
    )
    return {
        "destinos_activos": destinos_activos,
        "viajes_proximos": viajes_proximos,
    }


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
    viajes = consulta.all()
    return [
        viaje_catalogo_dict(db, v)
        for v in viajes
        if viaje_disponible_para_reserva(db, v)
    ]


def obtener_viaje_catalogo(db: Session, viaje_id: int) -> dict:
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
        Viaje.estado == "planificado",
    ).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if not viaje_disponible_para_reserva(db, viaje):
        raise HTTPException(status_code=404, detail="Viaje no disponible para reservar")
    return viaje_catalogo_dict(db, viaje)
