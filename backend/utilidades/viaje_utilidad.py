from sqlalchemy.orm import Session

from modelos.asiento_modelo import Asiento
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.destino_modelo import Destino
from modelos.unidad_transporte_modelo import UnidadTransporte
from modelos.viaje_modelo import Viaje

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
