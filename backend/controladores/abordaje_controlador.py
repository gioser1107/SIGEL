from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.abordaje_viaje_modelo import (
    ESTADO_ABORDADO,
    ESTADO_NO_PRESENTADO,
    actualizar_abordaje,
    eliminar_abordaje,
    listar_viajes_para_abordaje,
    obtener_abordaje,
    obtener_manifiesto_viaje,
    registrar_abordaje_pasajero,
    registrar_abordajes_lote,
    resumen_abordaje_viaje,
)
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.permiso_modelo import (
    PERMISO_BORRAR_ABORDAJE,
    PERMISO_CREAR_ABORDAJE,
    PERMISO_EDITAR_ABORDAJE,
    PERMISO_LEER_ABORDAJE,
)

router = APIRouter(prefix="/abordajes", tags=["Abordaje"])


class DatosAbordajeRegistrar(BaseModel):
    estado: str = Field(default=ESTADO_ABORDADO, pattern="^(abordado|no_presentado)$")
    notas: str | None = None
    abordado_en: datetime | None = None


class DatosAbordajeLoteItem(BaseModel):
    reserva_cliente_id: int
    estado: str = Field(default=ESTADO_ABORDADO, pattern="^(abordado|no_presentado)$")
    notas: str | None = None
    abordado_en: datetime | None = None


class DatosAbordajeLote(BaseModel):
    registros: list[DatosAbordajeLoteItem] = Field(min_length=1)


class DatosAbordajeActualizar(BaseModel):
    estado: str | None = Field(default=None, pattern="^(abordado|no_presentado)$")
    notas: str | None = None
    abordado_en: datetime | None = None


@router.get("/viajes")
def listar_viajes_abordaje_endpoint(
    estado: str | None = Query(default=None, description="planificado | en_curso | finalizado"),
    solo_hoy: bool = Query(default=False),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_ABORDAJE)),
):
    return listar_viajes_para_abordaje(db, estado=estado, solo_hoy=solo_hoy)


@router.get("/viajes/{viaje_id}/manifiesto")
def obtener_manifiesto_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_ABORDAJE)),
):
    return obtener_manifiesto_viaje(db, viaje_id)


@router.get("/viajes/{viaje_id}/resumen")
def resumen_abordaje_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_ABORDAJE)),
):
    return resumen_abordaje_viaje(db, viaje_id)


@router.put("/viajes/{viaje_id}/pasajeros/{reserva_cliente_id}")
def registrar_abordaje_pasajero_endpoint(
    viaje_id: int,
    reserva_cliente_id: int,
    datos: DatosAbordajeRegistrar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_ABORDAJE)),
):
    resultado = registrar_abordaje_pasajero(
        db,
        viaje_id,
        reserva_cliente_id,
        estado=datos.estado,
        notas=datos.notas,
        abordado_en=datos.abordado_en,
        registrado_por_usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="abordaje",
        accion="UPDATE",
        resumen=(
            f"Abordaje {datos.estado} — viaje {viaje_id}, "
            f"pasajero {reserva_cliente_id}"
        ),
        usuario_id=usuario_actual["id"],
        tabla_afectada="abordajes_viaje",
        registro_id=resultado["abordaje"]["id"],
        detalle={
            "viaje_id": viaje_id,
            "reserva_cliente_id": reserva_cliente_id,
            "estado": datos.estado,
        },
        ip_origen=obtener_ip_origen(request),
    )

    return resultado


@router.post("/viajes/{viaje_id}/registrar-lote")
def registrar_abordaje_lote_endpoint(
    viaje_id: int,
    datos: DatosAbordajeLote,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_ABORDAJE)),
):
    resultado = registrar_abordajes_lote(
        db,
        viaje_id,
        datos.registros,
        registrado_por_usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="abordaje",
        accion="INSERT",
        resumen=f"Lote abordaje viaje {viaje_id} ({len(datos.registros)} pasajeros)",
        usuario_id=usuario_actual["id"],
        tabla_afectada="abordajes_viaje",
        registro_id=viaje_id,
        detalle={"procesados": len(datos.registros)},
        ip_origen=obtener_ip_origen(request),
    )

    return resultado


@router.get("/{abordaje_id}")
def obtener_abordaje_endpoint(
    abordaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_ABORDAJE)),
):
    return obtener_abordaje(db, abordaje_id)


@router.put("/{abordaje_id}")
def actualizar_abordaje_endpoint(
    abordaje_id: int,
    datos: DatosAbordajeActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_ABORDAJE)),
):
    resultado = actualizar_abordaje(
        db,
        abordaje_id,
        estado=datos.estado,
        notas=datos.notas,
        abordado_en=datos.abordado_en,
        registrado_por_usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="abordaje",
        accion="UPDATE",
        resumen=f"Abordaje {abordaje_id} actualizado",
        usuario_id=usuario_actual["id"],
        tabla_afectada="abordajes_viaje",
        registro_id=abordaje_id,
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    return resultado


@router.delete("/{abordaje_id}")
def eliminar_abordaje_endpoint(
    abordaje_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_ABORDAJE)),
):
    resultado = eliminar_abordaje(db, abordaje_id)

    registrar_evento(
        db,
        modulo="abordaje",
        accion="DELETE",
        resumen=f"Abordaje {abordaje_id} anulado",
        usuario_id=usuario_actual["id"],
        tabla_afectada="abordajes_viaje",
        registro_id=abordaje_id,
        ip_origen=obtener_ip_origen(request),
    )

    return resultado
