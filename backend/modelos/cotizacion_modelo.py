from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Session

from database import Base
from modelos.cliente_modelo import Cliente
from modelos.destino_modelo import Destino
from modelos.cliente_modelo import es_rol_cliente, obtener_cliente_por_usuario_id
from modelos.usuario_modelo import nombre_completo_de
from utilidades.paginacion import offset_pagina, respuesta_paginada
from utilidades.validaciones import ValidadorEntrada


class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    destino_id = Column(BigInteger, ForeignKey("destinos.id"), nullable=False, index=True)
    requisitos = Column(Text, nullable=True)
    modalidad = Column(String(20), nullable=False, default="propio")
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
    estado_previo = cotizacion.estado
    aplicar_estado_automatico_cotizacion(db, cotizacion)
    if cotizacion.estado != estado_previo:
        cotizacion.actualizado_en = datetime.now()
        db.commit()
        db.refresh(cotizacion)
    return cotizacion


def _naive_fecha(fecha: datetime) -> datetime:
    if fecha.tzinfo is not None:
        return fecha.replace(tzinfo=None)
    return fecha


def _cotizacion_tiene_items(db: Session, cotizacion_id: int) -> bool:
    from modelos.cotizacion_linea_modelo import CotizacionLinea

    return (
        db.query(CotizacionLinea.id)
        .filter(
            CotizacionLinea.cotizacion_id == cotizacion_id,
            CotizacionLinea.eliminado_en.is_(None),
        )
        .first()
        is not None
    )


def aplicar_estado_automatico_cotizacion(
    db: Session,
    cotizacion: Cotizacion,
    ahora: datetime | None = None,
) -> None:
    """El estado comercial sale de vigencia e ítems. Aceptada y cancelada no se tocan."""
    if cotizacion.estado in ("aceptada", "cancelada"):
        return
    momento = ahora or datetime.now()
    vigencia = cotizacion.valida_hasta
    if vigencia is not None and _naive_fecha(vigencia) < momento:
        cotizacion.estado = "vencida"
        return
    cotizacion.estado = "pendiente" if _cotizacion_tiene_items(db, cotizacion.id) else "solicitada"


def sincronizar_cotizaciones_vencidas(db: Session) -> int:
    ahora = datetime.now()
    filas = (
        db.query(Cotizacion)
        .filter(
            Cotizacion.eliminado_en.is_(None),
            Cotizacion.estado.in_(("solicitada", "pendiente")),
            Cotizacion.valida_hasta.isnot(None),
            Cotizacion.valida_hasta < ahora,
        )
        .all()
    )
    if not filas:
        return 0
    for cotizacion in filas:
        cotizacion.estado = "vencida"
        cotizacion.actualizado_en = ahora
    db.commit()
    return len(filas)


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
        "modalidad": getattr(cotizacion, "modalidad", None) or "propio",
        "precio_cotizado_eur": precio_float,
        "valida_hasta": cotizacion.valida_hasta,
        "estado": cotizacion.estado,
        "creado_en": cotizacion.creado_en,
        "actualizado_en": cotizacion.actualizado_en,
    }
    if cotizacion.eliminado_en is not None:
        resultado["eliminado_en"] = cotizacion.eliminado_en

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
    filtro: Optional[str] = None,
    cliente_id: Optional[int] = None,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    sincronizar_cotizaciones_vencidas(db)
    filtro_efectivo = filtro or estado or "todos"

    if filtro_efectivo == "anulado":
        consulta = db.query(Cotizacion).filter(Cotizacion.eliminado_en.isnot(None))
    else:
        consulta = db.query(Cotizacion).filter(Cotizacion.eliminado_en.is_(None))
        if filtro_efectivo == "pendientes":
            consulta = consulta.filter(Cotizacion.estado == "pendiente")
        elif filtro_efectivo == "vencidas":
            consulta = consulta.filter(Cotizacion.estado == "vencida")
        elif filtro_efectivo == "activas":
            consulta = consulta.filter(Cotizacion.estado.in_(["pendiente", "aceptada"]))
        elif filtro_efectivo not in ("todos", None) and filtro_efectivo in (
            "solicitada", "pendiente", "aceptada", "vencida", "cancelada"
        ):
            consulta = consulta.filter(Cotizacion.estado == filtro_efectivo)

    if es_rol_cliente(usuario_actual.get("rol", "")):
        cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
        if cliente is None:
            return respuesta_paginada([], 0, pagina, limite)
        consulta = consulta.filter(Cotizacion.cliente_id == cliente.id)
    elif cliente_id is not None:
        consulta = consulta.filter(Cotizacion.cliente_id == cliente_id)

    if estado is not None and filtro_efectivo == "todos":
        consulta = consulta.filter(Cotizacion.estado == estado)

    total = consulta.count()
    orden = (
        Cotizacion.eliminado_en.desc()
        if filtro_efectivo == "anulado"
        else Cotizacion.creado_en.desc()
    )
    cotizaciones = (
        consulta.order_by(orden)
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
    modalidad: Optional[str] = None,
    lineas: Optional[list[dict]] = None,
) -> Cotizacion:
    obtener_destino_activo(db, destino_id)
    _ = precio_cotizado_eur
    _ = estado
    lineas_datos = lineas or []

    if es_rol_cliente(usuario_actual.get("rol", "")):
        cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
        if cliente is None:
            raise HTTPException(status_code=400, detail="Tu cuenta no está vinculada a un cliente")
        cliente_id_final = cliente.id
        if lineas_datos:
            raise HTTPException(status_code=403, detail="Las solicitudes no incluyen ítems")
        requisitos_limpios = ValidadorEntrada.texto_libre(
            requisitos,
            "requisitos",
            obligatorio=True,
            minimo=10,
            maximo=1000,
        )
        vigencia = None
        estado_inicial = "solicitada"
    else:
        if cliente_id is None:
            raise HTTPException(status_code=400, detail="cliente_id es requerido")
        obtener_cliente_activo(db, cliente_id)
        cliente_id_final = cliente_id
        if not lineas_datos:
            raise HTTPException(status_code=400, detail="Agrega al menos un ítem a la cotización")
        if valida_hasta is None:
            raise HTTPException(status_code=400, detail="Indica hasta cuándo es válida la cotización")
        requisitos_limpios = ValidadorEntrada.texto_libre(
            requisitos,
            "requisitos",
            obligatorio=True,
            minimo=10,
            maximo=1000,
        )
        vigencia = valida_hasta
        estado_inicial = "pendiente"

    from utilidades.politicas_agencia import normalizar_modalidad

    ahora = datetime.now()
    nueva_cotizacion = Cotizacion(
        cliente_id=cliente_id_final,
        destino_id=destino_id,
        requisitos=requisitos_limpios,
        modalidad=normalizar_modalidad(modalidad, "propio"),
        precio_cotizado_eur=None,
        valida_hasta=vigencia,
        estado=estado_inicial,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nueva_cotizacion)
    db.flush()

    if lineas_datos:
        from modelos.cotizacion_linea_modelo import agregar_lineas_sin_commit

        agregar_lineas_sin_commit(db, nueva_cotizacion, lineas_datos)
        aplicar_estado_automatico_cotizacion(db, nueva_cotizacion, ahora)

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
    modalidad: Optional[str] = None,
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
        if valida_hasta is not None:
            cotizacion.valida_hasta = valida_hasta
        if cotizacion.valida_hasta is None:
            raise HTTPException(status_code=400, detail="Indica hasta cuándo es válida la cotización")

    if requisitos is not None:
        cotizacion.requisitos = ValidadorEntrada.texto_libre(
            requisitos,
            "requisitos",
            obligatorio=True,
            minimo=10,
            maximo=1000,
        )
    if modalidad is not None:
        from utilidades.politicas_agencia import normalizar_modalidad
        cotizacion.modalidad = normalizar_modalidad(modalidad, "propio")

    if es_cliente and estado == "cancelada":
        cotizacion.estado = "cancelada"
        accion_bitacora = "ANULAR"
    else:
        aplicar_estado_automatico_cotizacion(db, cotizacion)
        accion_bitacora = "UPDATE"

    cotizacion.actualizado_en = datetime.now()
    db.commit()
    db.refresh(cotizacion)

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


def aceptar_cotizacion(db: Session, cotizacion_id: int, usuario_actual: dict) -> Cotizacion:
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden convertir cotizaciones")

    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    if cotizacion.estado == "aceptada":
        return cotizacion
    if cotizacion.estado != "pendiente":
        raise HTTPException(
            status_code=400,
            detail="Solo se puede convertir una cotización pendiente con ítems vigentes",
        )
    if cotizacion.precio_cotizado_eur is None:
        raise HTTPException(status_code=400, detail="Agrega ítems antes de convertir la cotización")

    cotizacion.estado = "aceptada"
    cotizacion.actualizado_en = datetime.now()
    db.commit()
    db.refresh(cotizacion)
    return cotizacion
