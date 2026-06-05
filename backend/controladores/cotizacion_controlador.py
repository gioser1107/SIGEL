from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.cliente_modelo import Cliente
from modelos.cotizacion_modelo import Cotizacion
from modelos.destino_modelo import Destino

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])


class DatosCotizacionCrear(BaseModel):
    cliente_id: int
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


def _obtener_cliente_activo(db: Session, cliente_id: int) -> Cliente:
    consulta = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    )
    cliente = consulta.first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


def _obtener_destino_activo(db: Session, destino_id: int) -> Destino:
    consulta = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.eliminado_en.is_(None),
    )
    destino = consulta.first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return destino


def _obtener_cotizacion_activa(db: Session, cotizacion_id: int) -> Cotizacion:
    consulta = db.query(Cotizacion).filter(
        Cotizacion.id == cotizacion_id,
        Cotizacion.eliminado_en.is_(None),
    )
    cotizacion = consulta.first()
    if cotizacion is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cotizacion


def _cotizacion_a_dict(db: Session, cotizacion: Cotizacion) -> dict:
    cliente = db.query(Cliente).filter(Cliente.id == cotizacion.cliente_id).first()
    destino = db.query(Destino).filter(Destino.id == cotizacion.destino_id).first()

    precio = cotizacion.precio_cotizado_eur
    precio_float = float(precio) if precio is not None else None

    return {
        "id": cotizacion.id,
        "cliente_id": cotizacion.cliente_id,
        "cliente_nombre": cliente.nombre_completo if cliente is not None else None,
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


@router.get("")
def listar_cotizaciones(
    estado: str | None = Query(default=None),
    cliente_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    consulta = db.query(Cotizacion).filter(Cotizacion.eliminado_en.is_(None))

    if estado is not None:
        consulta = consulta.filter(Cotizacion.estado == estado)
    if cliente_id is not None:
        consulta = consulta.filter(Cotizacion.cliente_id == cliente_id)

    consulta = consulta.order_by(Cotizacion.creado_en.desc())
    lista = consulta.all()

    resultado = []
    for cotizacion in lista:
        resultado.append(_cotizacion_a_dict(db, cotizacion))

    return resultado


@router.get("/{cotizacion_id}")
def obtener_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    return _cotizacion_a_dict(db, cotizacion)


@router.post("")
def crear_cotizacion(
    datos: DatosCotizacionCrear,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_cliente_activo(db, datos.cliente_id)
    _obtener_destino_activo(db, datos.destino_id)

    ahora = datetime.now()
    nueva_cotizacion = Cotizacion(
        cliente_id=datos.cliente_id,
        destino_id=datos.destino_id,
        requisitos=datos.requisitos,
        precio_cotizado_eur=datos.precio_cotizado_eur,
        valida_hasta=datos.valida_hasta,
        estado=datos.estado,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nueva_cotizacion)
    db.commit()
    db.refresh(nueva_cotizacion)

    return {
        "mensaje": "Cotización creada con éxito",
        "cotizacion": _cotizacion_a_dict(db, nueva_cotizacion),
    }


@router.put("/{cotizacion_id}")
def actualizar_cotizacion(
    cotizacion_id: int,
    datos: DatosCotizacionActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)

    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(
            status_code=400,
            detail="No se puede modificar una cotización aceptada o cancelada",
        )

    if datos.requisitos is not None:
        cotizacion.requisitos = datos.requisitos
    if datos.precio_cotizado_eur is not None:
        cotizacion.precio_cotizado_eur = datos.precio_cotizado_eur
    if datos.valida_hasta is not None:
        cotizacion.valida_hasta = datos.valida_hasta
    if datos.estado is not None:
        cotizacion.estado = datos.estado

    cotizacion.actualizado_en = datetime.now()
    db.commit()
    db.refresh(cotizacion)

    return {
        "mensaje": "Cotización actualizada con éxito",
        "cotizacion": _cotizacion_a_dict(db, cotizacion),
    }


@router.delete("/{cotizacion_id}")
def eliminar_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    ahora = datetime.now()
    cotizacion.eliminado_en = ahora
    cotizacion.actualizado_en = ahora
    cotizacion.estado = "cancelada"
    db.commit()

    return {
        "mensaje": "Cotización cancelada con éxito",
        "cotizacion_id": cotizacion_id,
    }
