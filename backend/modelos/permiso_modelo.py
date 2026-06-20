PERMISO_CREAR_USUARIOS = "crear_usuarios"
PERMISO_LEER_USUARIOS = "leer_usuarios"
PERMISO_EDITAR_USUARIOS = "editar_usuarios"
PERMISO_BORRAR_USUARIOS = "borrar_usuarios"

PERMISO_CREAR_PERMISOS = "crear_permisos"
PERMISO_LEER_PERMISOS = "leer_permisos"
PERMISO_EDITAR_PERMISOS = "editar_permisos"
PERMISO_BORRAR_PERMISOS = "borrar_permisos"

PERMISO_CREAR_ROLES = "crear_roles"
PERMISO_LEER_ROLES = "leer_roles"
PERMISO_EDITAR_ROLES = "editar_roles"
PERMISO_BORRAR_ROLES = "borrar_roles"

PERMISO_CREAR_REPORTES_PAGO = "crear_reportes_pago"
PERMISO_LEER_REPORTES_PAGO = "leer_reportes_pago"
PERMISO_EDITAR_REPORTES_PAGO = "editar_reportes_pago"
PERMISO_BORRAR_REPORTES_PAGO = "borrar_reportes_pago"

PERMISO_CREAR_CONCILIACION = "crear_conciliacion"
PERMISO_LEER_CONCILIACION = "leer_conciliacion"
PERMISO_EDITAR_CONCILIACION = "editar_conciliacion"
PERMISO_BORRAR_CONCILIACION = "borrar_conciliacion"

PERMISO_CREAR_COTIZACIONES = "crear_cotizaciones"
PERMISO_LEER_COTIZACIONES = "leer_cotizaciones"
PERMISO_EDITAR_COTIZACIONES = "editar_cotizaciones"
PERMISO_BORRAR_COTIZACIONES = "borrar_cotizaciones"

PERMISO_CREAR_PLANIFICACION = "crear_planificacion"
PERMISO_LEER_PLANIFICACION = "leer_planificacion"
PERMISO_EDITAR_PLANIFICACION = "editar_planificacion"
PERMISO_BORRAR_PLANIFICACION = "borrar_planificacion"

PERMISO_CREAR_TRANSPORTE_FLOTA = "crear_transporte_flota"
PERMISO_LEER_TRANSPORTE_FLOTA = "leer_transporte_flota"
PERMISO_EDITAR_TRANSPORTE_FLOTA = "editar_transporte_flota"
PERMISO_BORRAR_TRANSPORTE_FLOTA = "borrar_transporte_flota"

PERMISO_CREAR_RESERVAS = "crear_reservas"
PERMISO_LEER_RESERVAS = "leer_reservas"
PERMISO_EDITAR_RESERVAS = "editar_reservas"
PERMISO_BORRAR_RESERVAS = "borrar_reservas"

PERMISO_CREAR_DESTINOS = "crear_destinos"
PERMISO_LEER_DESTINOS = "leer_destinos"
PERMISO_EDITAR_DESTINOS = "editar_destinos"
PERMISO_BORRAR_DESTINOS = "borrar_destinos"

PERMISO_CREAR_BITACORA = "crear_bitacora"
PERMISO_LEER_BITACORA = "leer_bitacora"
PERMISO_EDITAR_BITACORA = "editar_bitacora"
PERMISO_BORRAR_BITACORA = "borrar_bitacora"

PERMISO_CREAR_ABORDAJE = "crear_abordaje"
PERMISO_LEER_ABORDAJE = "leer_abordaje"
PERMISO_EDITAR_ABORDAJE = "editar_abordaje"
PERMISO_BORRAR_ABORDAJE = "borrar_abordaje"

PERMISO_CREAR_CLIENTES = "crear_clientes"
PERMISO_LEER_CLIENTES = "leer_clientes"
PERMISO_EDITAR_CLIENTES = "editar_clientes"
PERMISO_BORRAR_CLIENTES = "borrar_clientes"

PERMISO_CREAR_PUNTOS_RECOGIDA = "crear_puntos_recogida"
PERMISO_LEER_PUNTOS_RECOGIDA = "leer_puntos_recogida"
PERMISO_EDITAR_PUNTOS_RECOGIDA = "editar_puntos_recogida"
PERMISO_BORRAR_PUNTOS_RECOGIDA = "borrar_puntos_recogida"

PERMISO_CREAR_RESENAS = "crear_resenas"
PERMISO_LEER_RESENAS = "leer_resenas"
PERMISO_EDITAR_RESENAS = "editar_resenas"
PERMISO_BORRAR_RESENAS = "borrar_resenas"

NOMBRE_ROL_CLIENTE = "Cliente"

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Text
from sqlalchemy.orm import Session

from database import Base
from utilidades.paginacion import paginar_consulta, respuesta_paginada


class Permiso(Base):
    __tablename__ = "permisos"

    id = Column(BigInteger, primary_key=True, index=True)
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def permiso_a_dict(permiso: Permiso) -> dict:
    return {
        "id": permiso.id,
        "descripcion": permiso.descripcion,
    }


def obtener_permiso_activo(db: Session, permiso_id: int) -> Permiso:
    permiso = db.query(Permiso).filter(
        Permiso.id == permiso_id,
        Permiso.eliminado_en.is_(None),
    ).first()
    if permiso is None:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")
    return permiso


def listar_permisos(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    consulta = (
        db.query(Permiso)
        .filter(Permiso.eliminado_en.is_(None))
        .order_by(Permiso.descripcion.asc())
    )
    permisos, total = paginar_consulta(consulta, pagina, limite)
    items = [permiso_a_dict(permiso) for permiso in permisos]
    return respuesta_paginada(items, total, pagina, limite)


def crear_permiso(db: Session, descripcion: str) -> Permiso:
    ahora = datetime.now()
    nuevo_permiso = Permiso(
        descripcion=descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_permiso)
    db.commit()
    db.refresh(nuevo_permiso)
    return nuevo_permiso


def actualizar_permiso(db: Session, permiso_id: int, descripcion: str) -> Permiso:
    permiso = obtener_permiso_activo(db, permiso_id)
    permiso.descripcion = descripcion
    permiso.actualizado_en = datetime.now()
    db.commit()
    db.refresh(permiso)
    return permiso


def eliminar_permiso(db: Session, permiso_id: int) -> None:
    permiso = obtener_permiso_activo(db, permiso_id)
    ahora = datetime.now()
    permiso.eliminado_en = ahora
    permiso.actualizado_en = ahora
    db.commit()
