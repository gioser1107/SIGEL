from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Session

from database import Base
from modelos.cotizacion_modelo import Cotizacion, obtener_cotizacion_activa
from utilidades.validaciones import ValidadorEntrada


class CotizacionLinea(Base):
    __tablename__ = "cotizacion_lineas"

    id = Column(BigInteger, primary_key=True, index=True)
    cotizacion_id = Column(BigInteger, ForeignKey("cotizaciones.id"), nullable=False, index=True)
    concepto = Column(String(255), nullable=False)
    cantidad = Column(Numeric(10, 2), nullable=False, default=Decimal("1.00"), server_default="1.00")
    unidad = Column(String(20), nullable=False, default="personas", server_default="personas")
    precio_unitario_eur = Column(Numeric(12, 2), nullable=False)
    monto_eur = Column(Numeric(12, 2), nullable=False)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def _redondear_eur(valor: Decimal) -> Decimal:
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calcular_importe_linea(cantidad: Decimal, precio_unitario: Decimal) -> Decimal:
    return _redondear_eur(cantidad * precio_unitario)


def linea_a_dict(linea: CotizacionLinea) -> dict:
    cantidad = float(linea.cantidad) if linea.cantidad is not None else 1.0
    precio = (
        float(linea.precio_unitario_eur)
        if linea.precio_unitario_eur is not None
        else float(linea.monto_eur)
    )
    return {
        "id": linea.id,
        "cotizacion_id": linea.cotizacion_id,
        "concepto": (linea.concepto or "").strip() or "Servicio",
        "cantidad": cantidad,
        "unidad": linea.unidad or "personas",
        "precio_unitario_eur": precio,
        "monto_eur": float(linea.monto_eur),
    }


def _resolver_valores_linea(
    concepto: Optional[str],
    cantidad: Optional[Decimal],
    unidad: Optional[str],
    precio_unitario_eur: Optional[Decimal],
    *,
    concepto_actual: Optional[str] = None,
    cantidad_actual: Optional[Decimal] = None,
    unidad_actual: Optional[str] = None,
    precio_actual: Optional[Decimal] = None,
) -> dict:
    concepto_limpio = ValidadorEntrada.texto_libre(
        concepto if concepto is not None else concepto_actual,
        "concepto",
        obligatorio=True,
        minimo=3,
        maximo=255,
    )
    cantidad_limpia = ValidadorEntrada.cantidad_linea(
        cantidad if cantidad is not None else (cantidad_actual or Decimal("1"))
    )
    unidad_limpia = ValidadorEntrada.unidad_linea_cotizacion(
        unidad if unidad is not None else unidad_actual
    )

    if precio_unitario_eur is not None:
        precio_limpio = ValidadorEntrada.monto(precio_unitario_eur, "precio_unitario_eur")
    elif precio_actual is not None:
        precio_limpio = ValidadorEntrada.monto(precio_actual, "precio_unitario_eur")
    else:
        raise HTTPException(status_code=422, detail="precio_unitario_eur: es obligatorio")

    return {
        "concepto": concepto_limpio,
        "cantidad": cantidad_limpia,
        "unidad": unidad_limpia,
        "precio_unitario_eur": precio_limpio,
        "monto_eur": calcular_importe_linea(cantidad_limpia, precio_limpio),
    }


def recalcular_precio_cotizacion(db: Session, cotizacion: Cotizacion) -> None:
    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion.id,
        CotizacionLinea.eliminado_en.is_(None),
    ).all()
    if not lineas:
        cotizacion.precio_cotizado_eur = None
        cotizacion.actualizado_en = datetime.now()
        return
    total = sum((l.monto_eur for l in lineas), Decimal("0.00"))
    cotizacion.precio_cotizado_eur = _redondear_eur(Decimal(str(total)))
    cotizacion.actualizado_en = datetime.now()


def agregar_lineas_sin_commit(
    db: Session,
    cotizacion: Cotizacion,
    lineas: list[dict],
) -> None:
    if not lineas:
        return
    ahora = datetime.now()
    for datos in lineas:
        valores = _resolver_valores_linea(
            datos.get("concepto"),
            datos.get("cantidad"),
            datos.get("unidad"),
            datos.get("precio_unitario_eur"),
        )
        db.add(
            CotizacionLinea(
                cotizacion_id=cotizacion.id,
                concepto=valores["concepto"],
                cantidad=valores["cantidad"],
                unidad=valores["unidad"],
                precio_unitario_eur=valores["precio_unitario_eur"],
                monto_eur=valores["monto_eur"],
                creado_en=ahora,
                actualizado_en=ahora,
            )
        )
    db.flush()
    recalcular_precio_cotizacion(db, cotizacion)


def listar_lineas_cotizacion(
    db: Session,
    cotizacion_id: int,
    usuario_actual: dict,
) -> list[dict]:
    from modelos.cotizacion_modelo import validar_acceso_cotizacion

    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).order_by(CotizacionLinea.id).all()

    return [linea_a_dict(l) for l in lineas]


def resumen_lineas_cotizacion(
    db: Session,
    cotizacion_id: int,
    usuario_actual: dict,
) -> dict:
    from modelos.cotizacion_modelo import validar_acceso_cotizacion

    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).order_by(CotizacionLinea.id).all()

    items = [linea_a_dict(l) for l in lineas]
    return {
        "cotizacion_id": cotizacion_id,
        "total_eur": sum(item["monto_eur"] for item in items),
        "items": items,
    }


def crear_linea_cotizacion(
    db: Session,
    cotizacion_id: int,
    concepto: str,
    cantidad: Optional[Decimal] = None,
    unidad: Optional[str] = None,
    precio_unitario_eur: Optional[Decimal] = None,
) -> tuple[CotizacionLinea, Cotizacion]:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(status_code=400, detail="No se puede modificar el detalle en este estado")

    valores = _resolver_valores_linea(concepto, cantidad, unidad, precio_unitario_eur)

    ahora = datetime.now()
    nueva_linea = CotizacionLinea(
        cotizacion_id=cotizacion_id,
        concepto=valores["concepto"],
        cantidad=valores["cantidad"],
        unidad=valores["unidad"],
        precio_unitario_eur=valores["precio_unitario_eur"],
        monto_eur=valores["monto_eur"],
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_linea)
    db.flush()
    recalcular_precio_cotizacion(db, cotizacion)
    from modelos.cotizacion_modelo import aplicar_estado_automatico_cotizacion
    aplicar_estado_automatico_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(nueva_linea)
    db.refresh(cotizacion)
    return nueva_linea, cotizacion


def actualizar_linea_cotizacion(
    db: Session,
    cotizacion_id: int,
    linea_id: int,
    concepto: Optional[str] = None,
    cantidad: Optional[Decimal] = None,
    unidad: Optional[str] = None,
    precio_unitario_eur: Optional[Decimal] = None,
) -> tuple[CotizacionLinea, Cotizacion]:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(status_code=400, detail="No se puede modificar el detalle en este estado")

    linea = db.query(CotizacionLinea).filter(
        CotizacionLinea.id == linea_id,
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).first()
    if linea is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")

    valores = _resolver_valores_linea(
        concepto,
        cantidad,
        unidad,
        precio_unitario_eur,
        concepto_actual=linea.concepto,
        cantidad_actual=linea.cantidad,
        unidad_actual=linea.unidad,
        precio_actual=linea.precio_unitario_eur,
    )
    linea.concepto = valores["concepto"]
    linea.cantidad = valores["cantidad"]
    linea.unidad = valores["unidad"]
    linea.precio_unitario_eur = valores["precio_unitario_eur"]
    linea.monto_eur = valores["monto_eur"]
    linea.actualizado_en = datetime.now()
    db.flush()

    recalcular_precio_cotizacion(db, cotizacion)
    from modelos.cotizacion_modelo import aplicar_estado_automatico_cotizacion
    aplicar_estado_automatico_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(linea)
    db.refresh(cotizacion)
    return linea, cotizacion


def eliminar_linea_cotizacion(
    db: Session,
    cotizacion_id: int,
    linea_id: int,
) -> Cotizacion:
    cotizacion = obtener_cotizacion_activa(db, cotizacion_id)
    linea = db.query(CotizacionLinea).filter(
        CotizacionLinea.id == linea_id,
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).first()
    if linea is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")

    ahora = datetime.now()
    linea.eliminado_en = ahora
    linea.actualizado_en = ahora
    db.flush()
    recalcular_precio_cotizacion(db, cotizacion)
    from modelos.cotizacion_modelo import aplicar_estado_automatico_cotizacion
    aplicar_estado_automatico_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(cotizacion)
    return cotizacion
