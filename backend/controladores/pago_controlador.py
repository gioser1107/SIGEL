from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.pago_modelo import (
    actualizar_pago_reserva,
    calcular_resumen_pagos_reserva,
    cargar_datos_pago,
    eliminar_pago_reserva,
    listar_pagos_reserva,
    listar_todos_los_pagos,
    obtener_catalogo_pagos,
    obtener_pago_activo,
    registrar_pago_reserva,
)
from modelos.reservas_modelo import obtener_reserva_activa
from modelos.permiso_modelo import (
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_LEER_REPORTES_PAGO,
)

router = APIRouter(tags=["Pagos"])


class DatosPagoCrear(BaseModel):
    metodo_pago_id: int
    tasa_id: int
    monto: Decimal = Field(gt=0)
    tipo: str = "cuota"
    fecha_pago: Optional[date] = None
    referencia: Optional[str] = None
    banco_origen_id: Optional[int] = None
    banco_destino_id: Optional[int] = None
    punto_venta_id: Optional[int] = None
    telefono_origen: Optional[str] = None
    correo_origen: Optional[str] = None
    comprobante_url: Optional[str] = None
    notas: Optional[str] = None


class DatosPagoActualizar(BaseModel):
    metodo_pago_id: Optional[int] = None
    tasa_id: Optional[int] = None
    monto: Optional[Decimal] = Field(default=None, gt=0)
    tipo: Optional[str] = None
    estado: Optional[str] = None
    fecha_pago: Optional[date] = None
    referencia: Optional[str] = None
    banco_origen_id: Optional[int] = None
    banco_destino_id: Optional[int] = None
    punto_venta_id: Optional[int] = None
    telefono_origen: Optional[str] = None
    correo_origen: Optional[str] = None
    comprobante_url: Optional[str] = None
    notas: Optional[str] = None


@router.get("/pagos")
def listar_todos_los_pagos_endpoint(
    reserva_id: Optional[int] = Query(default=None),
    estado: Optional[str] = Query(default=None),
    metodo_pago_id: Optional[int] = Query(default=None),
    fecha_desde: Optional[date] = Query(default=None),
    fecha_hasta: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return listar_todos_los_pagos(
        db,
        reserva_id=reserva_id,
        estado=estado,
        metodo_pago_id=metodo_pago_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


@router.get("/pagos/catalogo")
def obtener_catalogo_pagos_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    return obtener_catalogo_pagos(db)


@router.get("/reservas/{reserva_id}/pagos")
def listar_pagos_reserva_endpoint(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    obtener_reserva_activa(db, reserva_id)
    return listar_pagos_reserva(db, reserva_id)


@router.get("/reservas/{reserva_id}/pagos/resumen")
def obtener_resumen_pagos_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    reserva = obtener_reserva_activa(db, reserva_id)
    try:
        return calcular_resumen_pagos_reserva(db, reserva)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.get("/reservas/{reserva_id}/pagos/{pago_id}")
def obtener_pago_reserva(
    reserva_id: int,
    pago_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    pago = obtener_pago_activo(db, reserva_id, pago_id)
    return cargar_datos_pago(db, pago)


@router.post("/reservas/{reserva_id}/pagos")
def registrar_pago_reserva_endpoint(
    reserva_id: int,
    datos: DatosPagoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    reserva = obtener_reserva_activa(db, reserva_id)
    nuevo_pago = registrar_pago_reserva(
        db, reserva,
        metodo_pago_id=datos.metodo_pago_id,
        tasa_id=datos.tasa_id,
        monto=datos.monto,
        tipo=datos.tipo,
        fecha_pago=datos.fecha_pago,
        referencia=datos.referencia,
        banco_origen_id=datos.banco_origen_id,
        banco_destino_id=datos.banco_destino_id,
        punto_venta_id=datos.punto_venta_id,
        telefono_origen=datos.telefono_origen,
        correo_origen=datos.correo_origen,
        comprobante_url=datos.comprobante_url,
        notas=datos.notas,
        usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="pagos",
        accion="INSERT",
        resumen=f"Pago {nuevo_pago.id} registrado en reserva {reserva_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="pagos",
        registro_id=nuevo_pago.id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Pago registrado con exito",
        "pago": cargar_datos_pago(db, nuevo_pago),
    }


@router.put("/reservas/{reserva_id}/pagos/{pago_id}")
def actualizar_pago_reserva_endpoint(
    reserva_id: int,
    pago_id: int,
    datos: DatosPagoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    reserva = obtener_reserva_activa(db, reserva_id)
    pago = obtener_pago_activo(db, reserva_id, pago_id)
    pago = actualizar_pago_reserva(
        db, reserva, pago,
        metodo_pago_id=datos.metodo_pago_id,
        tasa_id=datos.tasa_id,
        monto=datos.monto,
        tipo=datos.tipo,
        estado=datos.estado,
        fecha_pago=datos.fecha_pago,
        referencia=datos.referencia,
        banco_origen_id=datos.banco_origen_id,
        banco_destino_id=datos.banco_destino_id,
        punto_venta_id=datos.punto_venta_id,
        telefono_origen=datos.telefono_origen,
        correo_origen=datos.correo_origen,
        comprobante_url=datos.comprobante_url,
        notas=datos.notas,
        usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="pagos",
        accion="UPDATE",
        resumen=f"Pago {pago_id} de reserva {reserva_id} actualizado",
        usuario_id=usuario_actual["id"],
        tabla_afectada="pagos",
        registro_id=pago_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Pago actualizado con exito",
        "pago": cargar_datos_pago(db, pago),
    }


@router.delete("/reservas/{reserva_id}/pagos/{pago_id}")
def eliminar_pago_reserva_endpoint(
    reserva_id: int,
    pago_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    reserva = obtener_reserva_activa(db, reserva_id)
    pago = obtener_pago_activo(db, reserva_id, pago_id)
    eliminar_pago_reserva(db, reserva, pago)

    registrar_evento(
        db,
        modulo="pagos",
        accion="DELETE",
        resumen=f"Pago {pago_id} de reserva {reserva_id} eliminado",
        usuario_id=usuario_actual["id"],
        tabla_afectada="pagos",
        registro_id=pago_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Pago eliminado"}
