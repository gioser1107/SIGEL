from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.cliente_utilidad import es_rol_cliente
from utilidades.cotizacion_utilidad import (
    actualizar_cotizacion,
    actualizar_linea_cotizacion,
    cotizacion_a_dict,
    crear_cotizacion,
    crear_linea_cotizacion,
    eliminar_cotizacion,
    eliminar_linea_cotizacion,
    linea_a_dict,
    listar_cotizaciones,
    listar_lineas_cotizacion,
    obtener_cotizacion_detalle,
    resumen_lineas_cotizacion,
)
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_COTIZACIONES,
    PERMISO_CREAR_COTIZACIONES,
    PERMISO_EDITAR_COTIZACIONES,
    PERMISO_LEER_COTIZACIONES,
)

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])


class DatosCotizacionCrear(BaseModel):
    cliente_id: int | None = None
    destino_id: int
    requisitos: str | None = None
    precio_cotizado_eur: Decimal | None = None
    valida_hasta: datetime | None = None
    estado: str = "solicitada"


class DatosCotizacionActualizar(BaseModel):
    requisitos: str | None = None
    precio_cotizado_eur: Decimal | None = Field(default=None, ge=0)
    valida_hasta: datetime | None = None
    estado: str | None = None


class DatosLineaCrear(BaseModel):
    categoria: str = "otro"
    monto_eur: Decimal = Field(ge=0)
    descripcion: str | None = None


class DatosLineaActualizar(BaseModel):
    categoria: str | None = None
    monto_eur: Decimal | None = Field(default=None, ge=0)
    descripcion: str | None = None


@router.get("")
def listar_cotizaciones_endpoint(
    estado: str | None = Query(default=None),
    cliente_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    return listar_cotizaciones(db, usuario_actual, estado=estado, cliente_id=cliente_id)


@router.get("/{cotizacion_id}")
def obtener_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    return obtener_cotizacion_detalle(db, cotizacion_id, usuario_actual)


@router.post("")
def crear_cotizacion_endpoint(
    datos: DatosCotizacionCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_COTIZACIONES)),
):
    nueva_cotizacion = crear_cotizacion(
        db,
        usuario_actual,
        destino_id=datos.destino_id,
        cliente_id=datos.cliente_id,
        requisitos=datos.requisitos,
        precio_cotizado_eur=datos.precio_cotizado_eur,
        valida_hasta=datos.valida_hasta,
        estado=datos.estado,
    )

    registrar_evento(
        db,
        modulo="cotizaciones",
        accion="INSERT",
        resumen=f"Cotización creada (cliente {nueva_cotizacion.cliente_id}, destino {datos.destino_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="cotizaciones",
        registro_id=nueva_cotizacion.id,
        detalle={
            "cliente_id": nueva_cotizacion.cliente_id,
            "destino_id": datos.destino_id,
            "estado": nueva_cotizacion.estado,
        },
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Cotización creada con éxito",
        "cotizacion": cotizacion_a_dict(db, nueva_cotizacion),
    }


@router.put("/{cotizacion_id}")
def actualizar_cotizacion_endpoint(
    cotizacion_id: int,
    datos: DatosCotizacionActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    cotizacion, accion_bitacora = actualizar_cotizacion(
        db,
        cotizacion_id,
        usuario_actual,
        requisitos=datos.requisitos,
        precio_cotizado_eur=datos.precio_cotizado_eur,
        valida_hasta=datos.valida_hasta,
        estado=datos.estado,
    )

    registrar_evento(
        db,
        modulo="cotizaciones",
        accion=accion_bitacora,
        resumen=f"Cotización actualizada (id {cotizacion_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="cotizaciones",
        registro_id=cotizacion_id,
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Cotización actualizada con éxito",
        "cotizacion": cotizacion_a_dict(db, cotizacion),
    }


@router.delete("/{cotizacion_id}")
def eliminar_cotizacion_endpoint(
    cotizacion_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_COTIZACIONES)),
):
    eliminar_cotizacion(db, cotizacion_id, usuario_actual)

    registrar_evento(
        db,
        modulo="cotizaciones",
        accion="ANULAR",
        resumen=f"Cotización cancelada (id {cotizacion_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="cotizaciones",
        registro_id=cotizacion_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Cotización cancelada con éxito",
        "cotizacion_id": cotizacion_id,
    }


@router.get("/{cotizacion_id}/lineas")
def listar_lineas_cotizacion_endpoint(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    return listar_lineas_cotizacion(db, cotizacion_id, usuario_actual)


@router.get("/{cotizacion_id}/lineas/resumen")
def resumen_lineas_cotizacion_endpoint(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    return resumen_lineas_cotizacion(db, cotizacion_id, usuario_actual)


@router.post("/{cotizacion_id}/lineas")
def crear_linea_cotizacion_endpoint(
    cotizacion_id: int,
    datos: DatosLineaCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden editar el desglose")

    nueva_linea, cotizacion = crear_linea_cotizacion(
        db,
        cotizacion_id,
        categoria=datos.categoria,
        monto_eur=datos.monto_eur,
        descripcion=datos.descripcion,
    )

    registrar_evento(
        db,
        modulo="cotizaciones",
        accion="INSERT",
        resumen=f"Línea de cotización agregada (cotización {cotizacion_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="cotizacion_lineas",
        registro_id=nueva_linea.id,
        detalle={"categoria": datos.categoria, "monto_eur": float(datos.monto_eur)},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Línea agregada con éxito",
        "linea": linea_a_dict(nueva_linea),
        "cotizacion": cotizacion_a_dict(db, cotizacion),
    }


@router.put("/{cotizacion_id}/lineas/{linea_id}")
def actualizar_linea_cotizacion_endpoint(
    cotizacion_id: int,
    linea_id: int,
    datos: DatosLineaActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden editar el desglose")

    linea, cotizacion = actualizar_linea_cotizacion(
        db,
        cotizacion_id,
        linea_id,
        categoria=datos.categoria,
        monto_eur=datos.monto_eur,
        descripcion=datos.descripcion,
    )

    registrar_evento(
        db,
        modulo="cotizaciones",
        accion="UPDATE",
        resumen=f"Línea de cotización actualizada (id {linea_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="cotizacion_lineas",
        registro_id=linea_id,
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Línea actualizada con éxito",
        "linea": linea_a_dict(linea),
        "cotizacion": cotizacion_a_dict(db, cotizacion),
    }


@router.delete("/{cotizacion_id}/lineas/{linea_id}")
def eliminar_linea_cotizacion_endpoint(
    cotizacion_id: int,
    linea_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden editar el desglose")

    cotizacion = eliminar_linea_cotizacion(db, cotizacion_id, linea_id)

    registrar_evento(
        db,
        modulo="cotizaciones",
        accion="DELETE",
        resumen=f"Línea de cotización eliminada (id {linea_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="cotizacion_lineas",
        registro_id=linea_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Línea eliminada con éxito",
        "cotizacion": cotizacion_a_dict(db, cotizacion),
    }
