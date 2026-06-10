from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.cliente_modelo import Cliente
from modelos.cotizacion_linea_modelo import CotizacionLinea
from modelos.cotizacion_modelo import Cotizacion
from modelos.destino_modelo import Destino
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.nombre_utilidad import nombre_completo_de
from utilidades.cliente_utilidad import es_rol_cliente, obtener_cliente_por_usuario_id
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


def _linea_a_dict(linea: CotizacionLinea) -> dict:
    return {
        "id": linea.id,
        "cotizacion_id": linea.cotizacion_id,
        "categoria": linea.categoria,
        "monto_eur": float(linea.monto_eur),
        "descripcion": linea.descripcion,
    }


def _recalcular_precio_cotizacion(db: Session, cotizacion: Cotizacion) -> None:
    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion.id,
        CotizacionLinea.eliminado_en.is_(None),
    ).all()
    if not lineas:
        return
    total = sum(float(l.monto_eur) for l in lineas)
    cotizacion.precio_cotizado_eur = Decimal(str(total))
    cotizacion.actualizado_en = datetime.now()


def _cotizacion_a_dict(db: Session, cotizacion: Cotizacion, incluir_lineas: bool = False) -> dict:
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
        resultado["lineas"] = [_linea_a_dict(l) for l in lineas]

    return resultado


def _validar_acceso_cotizacion(usuario_actual: dict, cotizacion: Cotizacion, db: Session) -> None:
    if not es_rol_cliente(usuario_actual.get("rol", "")):
        return
    cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
    if cliente is None or cotizacion.cliente_id != cliente.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta cotización")


@router.get("")
def listar_cotizaciones(
    estado: str | None = Query(default=None),
    cliente_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    consulta = db.query(Cotizacion).filter(Cotizacion.eliminado_en.is_(None))

    if es_rol_cliente(usuario_actual.get("rol", "")):
        cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
        if cliente is None:
            return []
        consulta = consulta.filter(Cotizacion.cliente_id == cliente.id)
    elif cliente_id is not None:
        consulta = consulta.filter(Cotizacion.cliente_id == cliente_id)

    if estado is not None:
        consulta = consulta.filter(Cotizacion.estado == estado)

    consulta = consulta.order_by(Cotizacion.creado_en.desc())
    return [_cotizacion_a_dict(db, c) for c in consulta.all()]


@router.get("/{cotizacion_id}")
def obtener_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    _validar_acceso_cotizacion(usuario_actual, cotizacion, db)
    incluir_lineas = not es_rol_cliente(usuario_actual.get("rol", "")) or cotizacion.estado in ("pendiente", "aceptada")
    return _cotizacion_a_dict(db, cotizacion, incluir_lineas=incluir_lineas)


@router.post("")
def crear_cotizacion(
    datos: DatosCotizacionCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_COTIZACIONES)),
):
    _obtener_destino_activo(db, datos.destino_id)

    if es_rol_cliente(usuario_actual.get("rol", "")):
        cliente = obtener_cliente_por_usuario_id(db, usuario_actual["id"])
        if cliente is None:
            raise HTTPException(status_code=400, detail="Tu cuenta no está vinculada a un cliente")
        cliente_id = cliente.id
        precio = None
        estado = "solicitada"
    else:
        if datos.cliente_id is None:
            raise HTTPException(status_code=400, detail="cliente_id es requerido")
        _obtener_cliente_activo(db, datos.cliente_id)
        cliente_id = datos.cliente_id
        precio = datos.precio_cotizado_eur
        estado = datos.estado

    ahora = datetime.now()
    nueva_cotizacion = Cotizacion(
        cliente_id=cliente_id,
        destino_id=datos.destino_id,
        requisitos=datos.requisitos,
        precio_cotizado_eur=precio,
        valida_hasta=datos.valida_hasta,
        estado=estado,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nueva_cotizacion)
    db.commit()
    db.refresh(nueva_cotizacion)

    registrar_evento(
        db,
        modulo="cotizaciones",
        accion="INSERT",
        resumen=f"Cotización creada (cliente {cliente_id}, destino {datos.destino_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="cotizaciones",
        registro_id=nueva_cotizacion.id,
        detalle={"cliente_id": cliente_id, "destino_id": datos.destino_id, "estado": estado},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Cotización creada con éxito",
        "cotizacion": _cotizacion_a_dict(db, nueva_cotizacion),
    }


@router.put("/{cotizacion_id}")
def actualizar_cotizacion(
    cotizacion_id: int,
    datos: DatosCotizacionActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    _validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    es_cliente = es_rol_cliente(usuario_actual.get("rol", ""))

    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(
            status_code=400,
            detail="No se puede modificar una cotización aceptada o cancelada",
        )

    if es_cliente:
        if datos.estado is not None and datos.estado != "cancelada":
            raise HTTPException(status_code=403, detail="Solo puedes cancelar tu solicitud")
        if datos.estado == "cancelada" and cotizacion.estado != "solicitada":
            raise HTTPException(status_code=400, detail="Solo puedes cancelar cotizaciones solicitadas")
        if datos.precio_cotizado_eur is not None or datos.valida_hasta is not None:
            raise HTTPException(status_code=403, detail="No puedes modificar precio ni vigencia")
        if datos.requisitos is not None and cotizacion.estado != "solicitada":
            raise HTTPException(status_code=400, detail="Solo puedes editar requisitos en estado solicitada")
    else:
        if datos.precio_cotizado_eur is not None:
            cotizacion.precio_cotizado_eur = datos.precio_cotizado_eur
        if datos.valida_hasta is not None:
            cotizacion.valida_hasta = datos.valida_hasta

    if datos.requisitos is not None:
        cotizacion.requisitos = datos.requisitos
    if datos.estado is not None:
        cotizacion.estado = datos.estado

    cotizacion.actualizado_en = datetime.now()
    db.commit()
    db.refresh(cotizacion)

    accion_bitacora = "UPDATE"
    if datos.estado is not None and datos.estado == "cancelada":
        accion_bitacora = "ANULAR"

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
        "cotizacion": _cotizacion_a_dict(db, cotizacion),
    }


@router.delete("/{cotizacion_id}")
def eliminar_cotizacion(
    cotizacion_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_COTIZACIONES)),
):
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden eliminar cotizaciones")

    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    ahora = datetime.now()
    cotizacion.eliminado_en = ahora
    cotizacion.actualizado_en = ahora
    cotizacion.estado = "cancelada"
    db.commit()

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
def listar_lineas_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    _validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).order_by(CotizacionLinea.id).all()

    return [_linea_a_dict(l) for l in lineas]


@router.get("/{cotizacion_id}/lineas/resumen")
def resumen_lineas_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_COTIZACIONES)),
):
    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    _validar_acceso_cotizacion(usuario_actual, cotizacion, db)

    lineas = db.query(CotizacionLinea).filter(
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).all()

    por_categoria: dict[str, float] = {}
    for linea in lineas:
        cat = linea.categoria
        por_categoria[cat] = por_categoria.get(cat, 0) + float(linea.monto_eur)

    total = sum(por_categoria.values())
    return {
        "cotizacion_id": cotizacion_id,
        "total_eur": total,
        "por_categoria": [{"categoria": k, "monto_eur": v} for k, v in por_categoria.items()],
    }


@router.post("/{cotizacion_id}/lineas")
def crear_linea_cotizacion(
    cotizacion_id: int,
    datos: DatosLineaCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden editar el desglose")

    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(status_code=400, detail="No se puede modificar el desglose en este estado")

    ahora = datetime.now()
    nueva_linea = CotizacionLinea(
        cotizacion_id=cotizacion_id,
        categoria=datos.categoria,
        monto_eur=datos.monto_eur,
        descripcion=datos.descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_linea)
    _recalcular_precio_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(nueva_linea)

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
        "linea": _linea_a_dict(nueva_linea),
        "cotizacion": _cotizacion_a_dict(db, cotizacion),
    }


@router.put("/{cotizacion_id}/lineas/{linea_id}")
def actualizar_linea_cotizacion(
    cotizacion_id: int,
    linea_id: int,
    datos: DatosLineaActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden editar el desglose")

    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
    if cotizacion.estado in ("aceptada", "cancelada"):
        raise HTTPException(status_code=400, detail="No se puede modificar el desglose en este estado")

    linea = db.query(CotizacionLinea).filter(
        CotizacionLinea.id == linea_id,
        CotizacionLinea.cotizacion_id == cotizacion_id,
        CotizacionLinea.eliminado_en.is_(None),
    ).first()
    if linea is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")

    if datos.categoria is not None:
        linea.categoria = datos.categoria
    if datos.monto_eur is not None:
        linea.monto_eur = datos.monto_eur
    if datos.descripcion is not None:
        linea.descripcion = datos.descripcion
    linea.actualizado_en = datetime.now()

    _recalcular_precio_cotizacion(db, cotizacion)
    db.commit()
    db.refresh(linea)

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
        "linea": _linea_a_dict(linea),
        "cotizacion": _cotizacion_a_dict(db, cotizacion),
    }


@router.delete("/{cotizacion_id}/lineas/{linea_id}")
def eliminar_linea_cotizacion(
    cotizacion_id: int,
    linea_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_COTIZACIONES)),
):
    if es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Los clientes no pueden editar el desglose")

    cotizacion = _obtener_cotizacion_activa(db, cotizacion_id)
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
    _recalcular_precio_cotizacion(db, cotizacion)
    db.commit()

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
        "cotizacion": _cotizacion_a_dict(db, cotizacion),
    }
