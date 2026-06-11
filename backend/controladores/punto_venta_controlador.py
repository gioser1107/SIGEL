from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.banco_modelo import Banco
from modelos.pago_modelo import Pago
from modelos.punto_venta_modelo import PuntoVenta
from utilidades.pago_utilidad import banco_a_dict, punto_venta_a_dict
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_LEER_REPORTES_PAGO,
)

router = APIRouter(prefix="/puntos-venta", tags=["Puntos de venta"])


class DatosPuntoVentaNuevo(BaseModel):
    banco_id: int
    codigo: str
    nombre: str
    numero_terminal: str | None = None
    activo: bool = True


class DatosPuntoVentaActualizar(BaseModel):
    banco_id: int | None = None
    codigo: str | None = None
    nombre: str | None = None
    numero_terminal: str | None = None
    activo: bool | None = None


def _buscar_punto_activo(db: Session, punto_id: int) -> PuntoVenta:
    punto = db.query(PuntoVenta).filter(
        PuntoVenta.id == punto_id,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto de venta no encontrado")
    return punto


def _validar_banco(db: Session, banco_id: int) -> Banco:
    banco = db.query(Banco).filter(
        Banco.id == banco_id,
        Banco.eliminado_en.is_(None),
        Banco.activo.is_(True),
    ).first()
    if not banco:
        raise HTTPException(status_code=400, detail="Banco invalido")
    return banco


def _punto_a_respuesta(db: Session, punto: PuntoVenta) -> dict:
    resultado = punto_venta_a_dict(punto)
    banco = db.query(Banco).filter(Banco.id == punto.banco_id).first()
    if banco:
        resultado["banco"] = banco_a_dict(banco)
    return resultado


@router.get("")
def listar_puntos_venta(
    banco_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    consulta = db.query(PuntoVenta).filter(PuntoVenta.eliminado_en.is_(None))
    if banco_id is not None:
        consulta = consulta.filter(PuntoVenta.banco_id == banco_id)

    puntos = consulta.order_by(PuntoVenta.nombre).all()
    return [_punto_a_respuesta(db, p) for p in puntos]


@router.get("/{punto_id}")
def obtener_punto_venta(
    punto_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_REPORTES_PAGO)),
):
    punto = _buscar_punto_activo(db, punto_id)
    return _punto_a_respuesta(db, punto)


@router.post("")
def crear_punto_venta(
    datos: DatosPuntoVentaNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_REPORTES_PAGO)),
):
    _validar_banco(db, datos.banco_id)
    codigo = datos.codigo.strip()
    existe = db.query(PuntoVenta).filter(PuntoVenta.codigo == codigo, PuntoVenta.eliminado_en.is_(None)).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un punto de venta con ese codigo")

    ahora = datetime.now()
    nuevo = PuntoVenta(
        banco_id=datos.banco_id,
        codigo=codigo,
        nombre=datos.nombre.strip(),
        numero_terminal=datos.numero_terminal,
        activo=datos.activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Punto de venta creado", "punto_venta": _punto_a_respuesta(db, nuevo)}


@router.put("/{punto_id}")
def actualizar_punto_venta(
    punto_id: int,
    datos: DatosPuntoVentaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_REPORTES_PAGO)),
):
    punto = _buscar_punto_activo(db, punto_id)

    if datos.banco_id is not None:
        _validar_banco(db, datos.banco_id)
        punto.banco_id = datos.banco_id

    if datos.codigo is not None:
        codigo = datos.codigo.strip()
        repetido = db.query(PuntoVenta).filter(
            PuntoVenta.codigo == codigo,
            PuntoVenta.id != punto_id,
            PuntoVenta.eliminado_en.is_(None),
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro punto de venta con ese codigo")
        punto.codigo = codigo

    if datos.nombre is not None:
        punto.nombre = datos.nombre.strip()

    if datos.numero_terminal is not None:
        punto.numero_terminal = datos.numero_terminal

    if datos.activo is not None:
        punto.activo = datos.activo

    punto.actualizado_en = datetime.now()
    db.commit()
    db.refresh(punto)
    return {"mensaje": "Punto de venta actualizado", "punto_venta": _punto_a_respuesta(db, punto)}


@router.delete("/{punto_id}")
def eliminar_punto_venta(
    punto_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_REPORTES_PAGO)),
):
    punto = _buscar_punto_activo(db, punto_id)
    en_pago = db.query(Pago).filter(Pago.punto_venta_id == punto_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el punto de venta tiene pagos registrados")

    ahora = datetime.now()
    punto.eliminado_en = ahora
    punto.actualizado_en = ahora
    db.commit()
    return {"mensaje": "Punto de venta eliminado"}
