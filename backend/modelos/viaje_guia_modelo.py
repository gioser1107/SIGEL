from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import Session

from database import Base
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario, nombre_completo_de


class ViajeGuia(Base):
    __tablename__ = "viajes_guias"

    id = Column(BigInteger, primary_key=True, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    usuario_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=False, index=True)
    es_principal = Column(Boolean, nullable=False, default=False)
    notas = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def validar_usuario_es_guia(db: Session, usuario_id: int) -> Usuario:
    fila = (
        db.query(Usuario, Rol)
        .join(Rol, Rol.id == Usuario.rol_id)
        .filter(
            Usuario.id == usuario_id,
            Usuario.eliminado_en.is_(None),
            Rol.eliminado_en.is_(None),
        )
        .first()
    )
    if fila is None:
        raise HTTPException(status_code=404, detail=f"Guía {usuario_id} no encontrado")
    usuario, rol = fila
    if rol.nombre != "Guia":
        raise HTTPException(
            status_code=400,
            detail=f"El usuario {usuario_id} no tiene rol de Guía",
        )
    return usuario


def listar_guias_disponibles(db: Session) -> list[dict]:
    filas = (
        db.query(Usuario)
        .join(Rol, Rol.id == Usuario.rol_id)
        .filter(
            Usuario.eliminado_en.is_(None),
            Rol.eliminado_en.is_(None),
            Rol.nombre == "Guia",
        )
        .order_by(Usuario.apellido.asc(), Usuario.nombre.asc())
        .all()
    )
    return [
        {
            "id": guia.id,
            "nombre": nombre_completo_de(guia.nombre, guia.apellido),
            "correo": guia.correo,
            "telefono": guia.telefono,
        }
        for guia in filas
    ]


def _guia_item_dict(vinculo: ViajeGuia, usuario: Usuario) -> dict:
    return {
        "id": usuario.id,
        "nombre": nombre_completo_de(usuario.nombre, usuario.apellido),
        "correo": usuario.correo,
        "telefono": usuario.telefono,
        "es_principal": bool(vinculo.es_principal),
        "notas": vinculo.notas,
    }


def _filas_guias_activas(db: Session, viaje_id: int) -> list[tuple[ViajeGuia, Usuario]]:
    return (
        db.query(ViajeGuia, Usuario)
        .join(Usuario, Usuario.id == ViajeGuia.usuario_id)
        .filter(
            ViajeGuia.viaje_id == viaje_id,
            ViajeGuia.eliminado_en.is_(None),
            Usuario.eliminado_en.is_(None),
        )
        .order_by(ViajeGuia.es_principal.desc(), Usuario.apellido.asc(), Usuario.nombre.asc())
        .all()
    )


def guias_en_respuesta_viaje(db: Session, viaje_id: int) -> dict:
    filas = _filas_guias_activas(db, viaje_id)
    guias = [_guia_item_dict(vinculo, usuario) for vinculo, usuario in filas]

    principal = next((g for g in guias if g["es_principal"]), None)
    if principal is None and guias:
        principal = guias[0]

    return {
        "guias": guias,
        "guia_principal_id": principal["id"] if principal else None,
        "guia_principal_nombre": principal["nombre"] if principal else None,
        "guia_id": principal["id"] if principal else None,
        "guia_nombre": principal["nombre"] if principal else None,
    }


def _validar_viaje_existe(db: Session, viaje_id: int, editable: bool = False):
    from modelos.viaje_modelo import Viaje

    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
    ).first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if editable and viaje.estado in ("finalizado", "cancelado"):
        raise HTTPException(
            status_code=400,
            detail="No se puede modificar un viaje finalizado o cancelado",
        )
    return viaje


def listar_guias_viaje(db: Session, viaje_id: int) -> dict:
    _validar_viaje_existe(db, viaje_id)
    info = guias_en_respuesta_viaje(db, viaje_id)
    return {
        "viaje_id": viaje_id,
        "total": len(info["guias"]),
        **info,
    }


def _normalizar_guias_ids(
    guias_ids: list[int] | None,
    guia_principal_id: int | None,
    guia_id_legacy: int | None,
) -> tuple[list[int], int | None]:
    ids: list[int] = []

    if guias_ids is not None:
        ids = list(dict.fromkeys(guias_ids))
    elif guia_id_legacy is not None:
        ids = [guia_id_legacy]

    principal = guia_principal_id if guia_principal_id is not None else guia_id_legacy
    if principal is None and len(ids) == 1:
        principal = ids[0]
    if principal is not None and principal not in ids:
        raise HTTPException(
            status_code=400,
            detail="El guía principal debe estar incluido en la lista de guías",
        )
    if principal is None and len(ids) > 1:
        raise HTTPException(
            status_code=400,
            detail="Indique guia_principal_id cuando asigne más de un guía",
        )

    return ids, principal


def guardar_guias_viaje(
    db: Session,
    viaje_id: int,
    guias_ids: list[int] | None = None,
    guia_principal_id: int | None = None,
    guia_id_legacy: int | None = None,
) -> dict:
    _validar_viaje_existe(db, viaje_id, editable=True)
    ids, principal = _normalizar_guias_ids(guias_ids, guia_principal_id, guia_id_legacy)

    for usuario_id in ids:
        validar_usuario_es_guia(db, usuario_id)

    ahora = datetime.now()
    db.query(ViajeGuia).filter(ViajeGuia.viaje_id == viaje_id).delete(synchronize_session=False)

    for usuario_id in ids:
        db.add(
            ViajeGuia(
                viaje_id=viaje_id,
                usuario_id=usuario_id,
                es_principal=usuario_id == principal,
                creado_en=ahora,
                actualizado_en=ahora,
            )
        )

    db.commit()
    return listar_guias_viaje(db, viaje_id)


def asignar_guias_si_provisto(
    db: Session,
    viaje_id: int,
    guias_ids: list[int] | None,
    guia_principal_id: int | None,
    guia_id_legacy: int | None,
) -> None:
    if guias_ids is None and guia_id_legacy is None:
        return
    guardar_guias_viaje(
        db,
        viaje_id,
        guias_ids=guias_ids if guias_ids is not None else ([] if guia_id_legacy is None else None),
        guia_principal_id=guia_principal_id,
        guia_id_legacy=guia_id_legacy,
    )
