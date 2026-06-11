from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.banco_modelo import Banco
from modelos.metodo_pago_modelo import MetodoPago
from modelos.moneda_modelo import Moneda
from modelos.pago_modelo import Pago
from modelos.punto_venta_modelo import PuntoVenta
from modelos.reservas_modelo import Reserva
from modelos.tasa_modelo import Tasa
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.pago_utilidad import (
    actualizar_estado_reserva_por_pagos,
    banco_a_dict,
    calcular_resumen_pagos_reserva,
    cargar_datos_pago,
    convertir_monto_pago_a_eur,
    determinar_estado_inicial_pago,
    metodo_pago_a_dict,
    obtener_tasa_eur_reciente,
    punto_venta_a_dict,
    tasa_a_dict,
)
from utilidades.permisos_constantes import (
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

def _obtener_reserva_activa(db: Session, reserva_id: int) -> Reserva:
    reserva = db.query(Reserva).filter(
        Reserva.id == reserva_id,
        Reserva.eliminado_en.is_(None),
    ).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva

def _obtener_pago_activo(db: Session, reserva_id: int, pago_id: int) -> Pago:
    pago = db.query(Pago).filter(
        Pago.id == pago_id,
        Pago.reserva_id == reserva_id,
        Pago.eliminado_en.is_(None),
    ).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado en esta reserva")
    return pago

def _validar_metodo_pago(db: Session, metodo_pago_id: int) -> MetodoPago:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == metodo_pago_id).first()
    if not metodo:
        raise HTTPException(status_code=400, detail="Metodo de pago invalido")
    return metodo

def _validar_tasa(db: Session, tasa_id: int) -> Tasa:
    tasa = db.query(Tasa).filter(Tasa.id == tasa_id).first()
    if not tasa:
        raise HTTPException(status_code=400, detail="Tasa invalida")
    return tasa

def _validar_banco(db: Session, banco_id: int | None, campo: str) -> None:
    if banco_id is None:
        return
    banco = db.query(Banco).filter(
        Banco.id == banco_id,
        Banco.eliminado_en.is_(None),
        Banco.activo.is_(True),
    ).first()
    if not banco:
        raise HTTPException(status_code=400, detail=f"{campo} invalido")

def _validar_punto_venta(db: Session, punto_venta_id: int | None) -> None:
    if punto_venta_id is None:
        return
    punto = db.query(PuntoVenta).filter(
        PuntoVenta.id == punto_venta_id,
        PuntoVenta.eliminado_en.is_(None),
        PuntoVenta.activo.is_(True),
    ).first()
    if not punto:
        raise HTTPException(status_code=400, detail="Punto de venta invalido")

def _validar_tipo_pago(tipo: str) -> None:
    if tipo not in ("total", "cuota"):
        raise HTTPException(status_code=400, detail="tipo debe ser total o cuota")

def _validar_estado_pago(estado: str) -> None:
    if estado not in ("en_validacion", "aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="estado invalido")

@router.get("/pagos")
def listar_todos_los_pagos(
    reserva_id: Optional[int] = Query(default=None),
    estado: Optional[str] = Query(default=None),
    metodo_pago_id: Optional[int] = Query(default=None),
    fecha_desde: Optional[date] = Query(default=None),
    fecha_hasta: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    consulta = db.query(Pago).filter(Pago.eliminado_en.is_(None))

    if reserva_id is not None:
        consulta = consulta.filter(Pago.reserva_id == reserva_id)
    if estado is not None:
        consulta = consulta.filter(Pago.estado == estado)
    if metodo_pago_id is not None:
        consulta = consulta.filter(Pago.metodo_pago_id == metodo_pago_id)
    if fecha_desde is not None:
        consulta = consulta.filter(Pago.fecha_pago >= fecha_desde)
    if fecha_hasta is not None:
        consulta = consulta.filter(Pago.fecha_pago <= fecha_hasta)

    pagos = consulta.order_by(Pago.creado_en.desc()).all()

    resultado = []
    for pago in pagos:
        detalle = cargar_datos_pago(db, pago)
        monto_eur, aproximado = convertir_monto_pago_a_eur(db, pago)
        detalle["monto_eur"] = monto_eur
        detalle["conversion_aproximada"] = aproximado
        resultado.append(detalle)

    return resultado

@router.get("/pagos/catalogo")
def obtener_catalogo_pagos(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    metodos = db.query(MetodoPago).order_by(MetodoPago.nombre).all()
    monedas = db.query(Moneda).all()
    monedas_por_id = {m.id: m for m in monedas}

    lista_metodos = []
    for metodo in metodos:
        moneda = monedas_por_id.get(metodo.moneda_id)
        if not moneda:
            continue
        lista_metodos.append(metodo_pago_a_dict(metodo, moneda))

    bancos = (
        db.query(Banco)
        .filter(Banco.eliminado_en.is_(None), Banco.activo.is_(True))
        .order_by(Banco.nombre)
        .all()
    )

    puntos = (
        db.query(PuntoVenta)
        .filter(PuntoVenta.eliminado_en.is_(None), PuntoVenta.activo.is_(True))
        .order_by(PuntoVenta.nombre)
        .all()
    )

    tasas = (
        db.query(Tasa)
        .order_by(Tasa.fecha.desc(), Tasa.id.desc())
        .limit(30)
        .all()
    )

    tasa_eur = obtener_tasa_eur_reciente(db)
    tasa_eur_dict = None
    if tasa_eur:
        tasa_eur_dict = tasa_a_dict(tasa_eur[0], tasa_eur[1])

    lista_tasas = []
    for tasa in tasas:
        moneda = monedas_por_id.get(tasa.moneda_id)
        if not moneda:
            continue
        lista_tasas.append(tasa_a_dict(tasa, moneda))

    return {
        "metodos_pago": lista_metodos,
        "bancos": [banco_a_dict(b) for b in bancos],
        "puntos_venta": [punto_venta_a_dict(p) for p in puntos],
        "tasa_eur_reciente": tasa_eur_dict,
        "tasas": lista_tasas,
    }

@router.get("/reservas/{reserva_id}/pagos")
def listar_pagos_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    _obtener_reserva_activa(db, reserva_id)

    pagos = (
        db.query(Pago)
        .filter(Pago.reserva_id == reserva_id, Pago.eliminado_en.is_(None))
        .order_by(Pago.creado_en.desc())
        .all()
    )

    resultado = []
    for pago in pagos:
        resultado.append(cargar_datos_pago(db, pago))
    return resultado

@router.get("/reservas/{reserva_id}/pagos/resumen")
def obtener_resumen_pagos_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    reserva = _obtener_reserva_activa(db, reserva_id)
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
    pago = _obtener_pago_activo(db, reserva_id, pago_id)
    return cargar_datos_pago(db, pago)

@router.post("/reservas/{reserva_id}/pagos")
def registrar_pago_reserva(
    reserva_id: int,
    datos: DatosPagoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    reserva = _obtener_reserva_activa(db, reserva_id)
    metodo = _validar_metodo_pago(db, datos.metodo_pago_id)
    _validar_tasa(db, datos.tasa_id)
    _validar_banco(db, datos.banco_origen_id, "banco_origen_id")
    _validar_banco(db, datos.banco_destino_id, "banco_destino_id")
    _validar_punto_venta(db, datos.punto_venta_id)
    _validar_tipo_pago(datos.tipo)

    ahora = datetime.now()
    estado_inicial = determinar_estado_inicial_pago(metodo.codigo, registro_desde_admin=True)
    nuevo_pago = Pago(
        reserva_id=reserva_id,
        metodo_pago_id=datos.metodo_pago_id,
        tasa_id=datos.tasa_id,
        monto=datos.monto,
        tipo=datos.tipo,
        estado=estado_inicial,
        fecha_pago=datos.fecha_pago or date.today(),
        referencia=datos.referencia,
        banco_origen_id=datos.banco_origen_id,
        banco_destino_id=datos.banco_destino_id,
        punto_venta_id=datos.punto_venta_id,
        telefono_origen=datos.telefono_origen,
        correo_origen=datos.correo_origen,
        comprobante_url=datos.comprobante_url,
        notas=datos.notas,
        creado_por=usuario_actual["id"],
        creado_en=ahora,
        actualizado_en=ahora,
    )
    if estado_inicial == "aprobado":
        nuevo_pago.validado_por = usuario_actual["id"]
        nuevo_pago.validado_en = ahora

    db.add(nuevo_pago)
    db.flush()
    actualizar_estado_reserva_por_pagos(db, reserva)
    reserva.actualizado_en = ahora
    db.commit()
    db.refresh(nuevo_pago)

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
def actualizar_pago_reserva(
    reserva_id: int,
    pago_id: int,
    datos: DatosPagoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    pago = _obtener_pago_activo(db, reserva_id, pago_id)

    if datos.metodo_pago_id is not None:
        _validar_metodo_pago(db, datos.metodo_pago_id)
        pago.metodo_pago_id = datos.metodo_pago_id

    if datos.tasa_id is not None:
        _validar_tasa(db, datos.tasa_id)
        pago.tasa_id = datos.tasa_id

    if datos.monto is not None:
        pago.monto = datos.monto

    if datos.tipo is not None:
        _validar_tipo_pago(datos.tipo)
        pago.tipo = datos.tipo

    if datos.estado is not None:
        _validar_estado_pago(datos.estado)
        pago.estado = datos.estado
        if datos.estado in ("aprobado", "rechazado"):
            pago.validado_por = usuario_actual["id"]
            pago.validado_en = datetime.now()

    if datos.fecha_pago is not None:
        pago.fecha_pago = datos.fecha_pago

    if datos.referencia is not None:
        pago.referencia = datos.referencia

    if datos.banco_origen_id is not None:
        _validar_banco(db, datos.banco_origen_id, "banco_origen_id")
        pago.banco_origen_id = datos.banco_origen_id

    if datos.banco_destino_id is not None:
        _validar_banco(db, datos.banco_destino_id, "banco_destino_id")
        pago.banco_destino_id = datos.banco_destino_id

    if datos.punto_venta_id is not None:
        _validar_punto_venta(db, datos.punto_venta_id)
        pago.punto_venta_id = datos.punto_venta_id

    if datos.telefono_origen is not None:
        pago.telefono_origen = datos.telefono_origen

    if datos.correo_origen is not None:
        pago.correo_origen = datos.correo_origen

    if datos.comprobante_url is not None:
        pago.comprobante_url = datos.comprobante_url

    if datos.notas is not None:
        pago.notas = datos.notas

    pago.actualizado_en = datetime.now()

    reserva = _obtener_reserva_activa(db, reserva_id)
    actualizar_estado_reserva_por_pagos(db, reserva)
    reserva.actualizado_en = datetime.now()

    db.commit()
    db.refresh(pago)

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
def eliminar_pago_reserva(
    reserva_id: int,
    pago_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    pago = _obtener_pago_activo(db, reserva_id, pago_id)
    ahora = datetime.now()
    pago.eliminado_en = ahora
    pago.actualizado_en = ahora

    reserva = _obtener_reserva_activa(db, reserva_id)
    actualizar_estado_reserva_por_pagos(db, reserva)
    reserva.actualizado_en = ahora

    db.commit()

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
