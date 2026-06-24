from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.orm import Session

from database import Base
from modelos.cliente_modelo import Cliente
from modelos.destino_modelo import Destino
from modelos.cliente_modelo import es_rol_cliente, obtener_cliente_por_usuario_id
from modelos.usuario_modelo import nombre_completo_de
from utilidades.paginacion import offset_pagina, respuesta_paginada


class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    destino_id = Column(BigInteger, ForeignKey("destinos.id"), nullable=False, index=True)
    requisitos = Column(Text, nullable=True)
    precio_cotizado_eur = Column(Numeric(12, 2), nullable=True)
    valida_hasta = Column(DateTime, nullable=True)
    estado = Column(
        Enum("solicitada", "pendiente", "aceptada", "vencida", "cancelada"),
        nullable=False,
        default="solicitada",
    )
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def obtener_cliente_activo(db: Session, cliente_id: int) -> Cliente:
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    ).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


def obtener_destino_activo(db: Session, destino_id: int) -> Destino:
    destino = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.eliminado_en.is_(None),
    ).first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return destino


def obtener_cotizacion_activa(db: Session, cotizacion_id: int) -> Cotizacion:
    cotizacion = db.query(Cotizacion).filter(
        Cotizacion.id == cotizacion_id,
        Cotizacion.eliminado_en.is_(None),
    ).first()
    if cotizacion is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cotizacion


def cotizacion_a_dict(db: Session, cotizacion: Cotizacion, incluir_lineas: bool = False) -> dict:
    from modelos.cotizacion_linea_modelo import CotizacionLinea, linea_a_dict

    cliente = db.query(Cliente).filter(Cliente.id == cotizacion.cliente_id).first()
    destino = db.query(Destino).filter(Destino.id == cotizacion.destino_id).first()

    precio = cotizacion.precio_cotizado_eur
    precio_float = float(precio) if precio is not None else None

    resultado = {
        "id": cotizacion.id,
        "cliente_id": cotizacion.cliente_id,
        "cliente_nombre": nombre_completo_de(cliente.nombre, cliente.apellido) if cliente is not None else None,
        "cliente_razon_social": cliente.razon_social if cliente is not None else None,
        "destino_id": cotizacion.destino_id,
        "destino_nombre": destino.nombre if destino is not None else None,
        "requisitos": cotizacion.requisitos,
        "precio_cotizado_eur": precio_float,
        "valida_hasta": cotizacion.valida_hasta,
        "estado": cotizacion.estado,
        "creado_en": cotizacion.creado_en,
        "actualizado_en": cotizacion.actualizado_en,
    }

    if incluir_lineas:
        lineas = db.query(CotizacionLinea).filter(
            CotizacionLinea.cotizacion_id == cotizacion.id,
            CotizacionLinea.eliminado_en.is_(None),
        ).order_by(CotizacionLinea.id).all()
        resultado["lineas"] = [linea_a_dict(l) for l in lineas]

    return resultado


def validar_acceso_cotizacion(usuario_actual: dict, cotizacion: Cotizacion, db: Session) -> None:
    if not es_rol_cliente(usuario_actual.get("rol", "")):
        return
    cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
    if cliente is None or cotizacion.cliente_id != cliente.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta cotización")


def listar_cotizaciones(
    db: Session,
    usuario_actual: dict,
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    consulta = db.query(Cotizacion).filter(Cotizacion.eliminado_en.is_(None))

    if es_rol_cliente(usuario_actual.get("rol", "")):
        cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
        if cliente is None:
            return respuesta_paginada([], 0, pagina, limite)
        consulta = consulta.filter(Cotizacion.cliente_id == cliente.id)
    elif cliente_id is not None:
        consulta = consulta.filter(Cotizacion.cliente_id == cliente_id)

    if estado is not None:
        consulta = consulta.filter(Cotizacion.estado == estado)

    total = consulta.count()
    cotizaciones = (
        consulta.order_by(Cotizacion.creado_en.desc())
        .offset(offset_pagina(pagina, limite))
        .limit(limite)
        .all()
    )
    items = [cotizacion_a_dict(db, c) for c in cotizaciones]
    return respuesta_paginada(items, total, pagina, limite)


def obtener_cotizacion_detalle(
    db: Session,
    cotizacion_id: int,
    usuario_actual: dict,
) -> dict:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    validar_acceso_cotizacion(usuario_actual, cotizacion, db)
    incluir_lineas = (
        not es_rol_cliente(usuario_actual.get("rol", ""))
        or cotizacion.estado in ("pendiente", "aceptada")
    )
    return cotizacion_a_dict(db, cotizacion, incluir_lineas=incluir_lineas)


def crear_cotizacion(
    db: Session,
    usuario_actual: dict,
    destino_id: int,
    cliente_id: Optional[int],
    requisitos: Optional[str],
    precio_cotizado_eur: Optional[Decimal],
    valida_hasta: Optional[datetime],
    estado: str,
) -> Cotizacion:
    obtener_destino_activo(db, destino_id)

    if es_rol_cliente(usuario_actual.get("rol", "")):
        cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
        if cliente is None:
            raise HTTPException(status_code=400, detail="Tu cuenta no está vinculada a un cliente")
        cliente_id_final = cliente.id
        precio = None
        estado_final = "solicitada"
    else:
        if cliente_id is None:
            raise HTTPException(status_code=400, detail="cliente_id es requerido")
        obtener_cliente_activo(db, cliente_id)
        cliente_id_final = cliente_id
        precio = precio_cotizado_eur
        estado_final = estado

    ahora = datetime.now()
    nueva_cotizacion = Cotizacion(
        cliente_id=cliente_id_final,
        destino_id=destino_id,
        requisitos=requisitos,
        precio_cotizado_eur=precio,
        valida_hasta=valida_hasta,
        estado=estado_final,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nueva_cotizacion)
    db.commit()
    db.refresh(nueva_cotizacion)
    return nueva_cotizacion


def actualizar_cotizacion(
    db: Session,
    cotizacion_id: int,
    usuario_actual: dict,
    requisitos: Optional[str],
    precio_cotizado_eur: Optional[Decimal],
    valida_hasta: Optional[datetime],
    estado: Optional[str],
) -> tuple[Cotizacion, str]:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    es_cliente = es_rol_cliente(usuario_actual.get("rol", ""))

    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(
            status_code=400,
            detail="No se puede modificar una cotización aceptada o cancelada",
        )

    if es_cliente:
        if estado is not None and estado != "cancelada":
            raise HTTPException(status_code=403, detail="Solo puedes cancelar tu solicitud")
        if estado == "cancelada" and cotizacion.estado != "solicitada":
            raise HTTPException(status_code=400, detail="Solo puedes cancelar cotizaciones solicitadas")
        if precio_cotizado_eur is not None or valida_hasta is not None:
            raise HTTPException(status_code=403, detail="No puedes modificar precio ni vigencia")
        if requisitos is not None and cotizacion.estado != "solicitada":
            raise HTTPException(status_code=400, detail="Solo puedes editar requisitos en estado solicitada")
    else:
        if precio_cotizado_eur is not None:
            cotizacion.precio_cotizado_eur = precio_cotizado_eur
        if valida_hasta is not None:
            cotizacion.valida_hasta = valida_hasta

    if requisitos is not None:
        cotizacion.requisitos = requisitos
    if estado is not None:
        cotizacion.estado = estado

    cotizacion.actualizado_en = datetime.now()
    db.commit()
    db.refresh(cotizacion)

    accion_bitacora = "UPDATE"
    if estado is not None and estado == "cancelada":
        accion_bitacora = "ANULAR"

    return cotizacion, accion_bitacora


def eliminar_cotizacion(db: Session, cotizacion_id: int, usuario_actual: dict) -> int:
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden eliminar cotizaciones")

    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    ahora = datetime.now()
    cotizacion.eliminado_en = ahora
    cotizacion.actualizado_en = ahora
    cotizacion.estado = "cancelada"
    db.commit()
    return cotizacion_id
