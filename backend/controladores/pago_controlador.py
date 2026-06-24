from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.cliente_modelo import es_rol_cliente
from modelos.destino_imagen_modelo import procesar_y_guardar_comprobante_pago
from modelos.pago_modelo import (
    actualizar_pago_reserva,
    calcular_monto_en_moneda_desde_eur,
    calcular_resumen_pagos_reserva,
    cargar_datos_pago,
    cargar_datos_pago_portal,
    eliminar_pago_reserva,
    listar_pagos_cliente_portal,
    listar_pagos_reserva,
    listar_pagos_reserva_portal,
    listar_todos_los_pagos,
    obtener_catalogo_pagos,
    obtener_pago_activo,
    obtener_pago_portal_cliente,
    obtener_reserva_del_cliente,
    obtener_resumen_pago_portal,
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


class DatosPagoReportarPortal(BaseModel):
    metodo_pago_id: int
    tasa_id: int
    monto: Decimal = Field(gt=0, description="Monto en la moneda del metodo (ej. Bs para pago movil)")
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


def _requiere_cliente_sesion(usuario_actual: dict) -> int:
    cliente_id = usuario_actual.get("cliente_id")
    if cliente_id is None or not es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Solo clientes pueden usar este recurso")
    return cliente_id


@router.post("/pagos/portal/comprobante/upload")
async def subir_comprobante_pago_portal(
    archivo: UploadFile = File(...),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _requiere_cliente_sesion(usuario_actual)
    url = await procesar_y_guardar_comprobante_pago(archivo)
    return {"comprobante_url": url}


@router.get("/pagos/portal/mis-pagos")
def listar_mis_pagos_portal(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    return listar_pagos_cliente_portal(db, cliente_id, pagina=pagina, limite=limite)


@router.get("/pagos/catalogo/portal")
def obtener_catalogo_pagos_portal(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _requiere_cliente_sesion(usuario_actual)
    return obtener_catalogo_pagos(db)


@router.get("/reservas/{reserva_id}/pagos/portal/resumen")
def obtener_resumen_pago_portal_endpoint(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    reserva = obtener_reserva_del_cliente(db, reserva_id, cliente_id)
    try:
        return obtener_resumen_pago_portal(db, reserva)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.get("/reservas/{reserva_id}/pagos/portal/cotizar")
def cotizar_pago_portal_endpoint(
    reserva_id: int,
    monto_eur: Decimal = Query(..., gt=0),
    metodo_pago_id: int = Query(...),
    tasa_id: int = Query(...),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    obtener_reserva_del_cliente(db, reserva_id, cliente_id)
    return calcular_monto_en_moneda_desde_eur(
        db,
        float(monto_eur),
        metodo_pago_id,
        tasa_id,
    )


@router.get("/reservas/{reserva_id}/pagos/portal")
def listar_mis_pagos_reserva_endpoint(
    reserva_id: int,
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    obtener_reserva_del_cliente(db, reserva_id, cliente_id)
    return listar_pagos_reserva_portal(db, reserva_id, pagina=pagina, limite=limite)


@router.get("/reservas/{reserva_id}/pagos/portal/{pago_id}")
def obtener_detalle_pago_portal_endpoint(
    reserva_id: int,
    pago_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    return obtener_pago_portal_cliente(db, reserva_id, pago_id, cliente_id)


@router.post("/reservas/{reserva_id}/pagos/portal/reportar")
def reportar_pago_portal_endpoint(
    reserva_id: int,
    datos: DatosPagoReportarPortal,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    reserva = obtener_reserva_del_cliente(db, reserva_id, cliente_id)

    nuevo_pago = registrar_pago_reserva(
        db,
        reserva,
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
        registro_desde_admin=False,
    )

    registrar_evento(
        db,
        modulo="pagos",
        accion="INSERT",
        resumen=f"Pago {nuevo_pago.id} reportado por cliente en reserva {reserva_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="pagos",
        registro_id=nuevo_pago.id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Pago reportado y pendiente de validacion",
        "pago": cargar_datos_pago_portal(db, nuevo_pago),
    }


@router.get("/pagos")
def listar_todos_los_pagos_endpoint(
    reserva_id: Optional[int] = Query(default=None),
    estado: Optional[str] = Query(default=None),
    metodo_pago_id: Optional[int] = Query(default=None),
    fecha_desde: Optional[date] = Query(default=None),
    fecha_hasta: Optional[date] = Query(default=None),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
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
        pagina=pagina,
        limite=limite,
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
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    obtener_reserva_activa(db, reserva_id)
    return listar_pagos_reserva(db, reserva_id, pagina=pagina, limite=limite)


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


class DatosPagoValidar(BaseModel):
    notas: Optional[str] = None


@router.post("/reservas/{reserva_id}/pagos/{pago_id}/aprobar")
def aprobar_pago_reserva_endpoint(
    reserva_id: int,
    pago_id: int,
    request: Request,
    datos: DatosPagoValidar | None = None,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    reserva = obtener_reserva_activa(db, reserva_id)
    pago = obtener_pago_activo(db, reserva_id, pago_id)
    pago = actualizar_pago_reserva(
        db, reserva, pago,
        metodo_pago_id=None,
        tasa_id=None,
        monto=None,
        tipo=None,
        estado="aprobado",
        fecha_pago=None,
        referencia=None,
        banco_origen_id=None,
        banco_destino_id=None,
        punto_venta_id=None,
        telefono_origen=None,
        correo_origen=None,
        comprobante_url=None,
        notas=datos.notas if datos else None,
        usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="pagos",
        accion="UPDATE",
        resumen=f"Pago {pago_id} aprobado en reserva {reserva_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="pagos",
        registro_id=pago_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Pago aprobado",
        "pago": cargar_datos_pago(db, pago),
    }


@router.post("/reservas/{reserva_id}/pagos/{pago_id}/rechazar")
def rechazar_pago_reserva_endpoint(
    reserva_id: int,
    pago_id: int,
    request: Request,
    datos: DatosPagoValidar | None = None,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    reserva = obtener_reserva_activa(db, reserva_id)
    pago = obtener_pago_activo(db, reserva_id, pago_id)
    pago = actualizar_pago_reserva(
        db, reserva, pago,
        metodo_pago_id=None,
        tasa_id=None,
        monto=None,
        tipo=None,
        estado="rechazado",
        fecha_pago=None,
        referencia=None,
        banco_origen_id=None,
        banco_destino_id=None,
        punto_venta_id=None,
        telefono_origen=None,
        correo_origen=None,
        comprobante_url=None,
        notas=datos.notas if datos else None,
        usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="pagos",
        accion="UPDATE",
        resumen=f"Pago {pago_id} rechazado en reserva {reserva_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="pagos",
        registro_id=pago_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Pago rechazado",
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
