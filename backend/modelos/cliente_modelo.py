from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Session

from database import Base
from modelos.ciudad_modelo import Ciudad
from modelos.estado_modelo import Estado
from modelos.rol_modelo import Rol

if TYPE_CHECKING:
    from modelos.usuario_modelo import Usuario


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(BigInteger, primary_key=True, index=True)
    usuario_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, unique=True, index=True)
    tipo_cliente = Column(String(20), nullable=False)
    tipo_documento = Column(String(20), nullable=False)
    numero_documento = Column(String(40), nullable=False, index=True)
    nombre = Column(String(80), nullable=False)
    apellido = Column(String(80), nullable=False)
    razon_social = Column(String(160), nullable=True)
    telefono = Column(String(30), nullable=True)
    telefono_secundario = Column(String(30), nullable=True)
    direccion = Column(String(255), nullable=True)
    ciudad_id = Column(BigInteger, ForeignKey("ciudades.id"), nullable=True, index=True)
    estado_id = Column(BigInteger, ForeignKey("estados.id"), nullable=True, index=True)
    notas = Column(Text, nullable=True)
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    actualizado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def obtener_rol_cliente(db: Session) -> Rol | None:
    consulta = db.query(Rol).filter(
        Rol.nombre == "Cliente",
        Rol.eliminado_en.is_(None),
    )
    return consulta.first()


def obtener_cliente_por_usuario_id(db: Session, usuario_id: int) -> Cliente | None:
    return db.query(Cliente).filter(
        Cliente.usuario_id == usuario_id,
        Cliente.eliminado_en.is_(None),
    ).first()


def es_rol_cliente(nombre_rol: str) -> bool:
    return nombre_rol == "Cliente"


def cliente_a_dict(
    cliente: Cliente,
    usuario: Usuario | None = None,
    estado: Estado | None = None,
    ciudad: Ciudad | None = None,
) -> dict:
    correo = usuario.correo if usuario is not None else None
    nombre_estado = estado.nombre if estado is not None else None
    nombre_ciudad = ciudad.nombre if ciudad is not None else None

    return {
        "id": cliente.id,
        "cliente_id": cliente.id,
        "usuario_id": cliente.usuario_id,
        "correo": correo,
        "tipo_cliente": cliente.tipo_cliente,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "razon_social": cliente.razon_social,
        "telefono": cliente.telefono,
        "telefono_secundario": cliente.telefono_secundario,
        "direccion": cliente.direccion,
        "estado_id": cliente.estado_id,
        "estado": nombre_estado,
        "ciudad_id": cliente.ciudad_id,
        "ciudad": nombre_ciudad,
        "notas": cliente.notas,
        "creado_por": cliente.creado_por,
        "actualizado_por": cliente.actualizado_por,
    }


def buscar_cliente_activo(db: Session, cliente_id: int) -> Cliente | None:
    consulta = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    )
    return consulta.first()


def buscar_usuario_cliente(db: Session, cliente: Cliente) -> Usuario | None:
    from modelos.usuario_modelo import Usuario

    if cliente.usuario_id is None:
        return None

    consulta = db.query(Usuario).filter(
        Usuario.id == cliente.usuario_id,
        Usuario.eliminado_en.is_(None),
    )
    return consulta.first()


def buscar_estado(db: Session, estado_id: int | None) -> Estado | None:
    if estado_id is None:
        return None

    consulta = db.query(Estado).filter(
        Estado.id == estado_id,
        Estado.eliminado_en.is_(None),
    )
    return consulta.first()


def buscar_ciudad(db: Session, ciudad_id: int | None) -> Ciudad | None:
    if ciudad_id is None:
        return None

    consulta = db.query(Ciudad).filter(
        Ciudad.id == ciudad_id,
        Ciudad.eliminado_en.is_(None),
    )
    return consulta.first()


def validar_ubicacion(db: Session, estado_id: int | None, ciudad_id: int | None) -> None:
    estado = buscar_estado(db, estado_id)
    ciudad = buscar_ciudad(db, ciudad_id)

    if estado_id is not None and estado is None:
        raise HTTPException(status_code=400, detail="El estado seleccionado no existe")

    if ciudad_id is not None and ciudad is None:
        raise HTTPException(status_code=400, detail="La ciudad seleccionada no existe")

    if estado is not None and ciudad is not None and ciudad.estado_id != estado.id:
        raise HTTPException(
            status_code=400,
            detail="La ciudad seleccionada no pertenece al estado indicado",
        )


def cliente_respuesta(db: Session, cliente: Cliente, usuario: Usuario | None) -> dict:
    estado = buscar_estado(db, cliente.estado_id)
    ciudad = buscar_ciudad(db, cliente.ciudad_id)
    return cliente_a_dict(cliente, usuario, estado, ciudad)


def validar_documento_no_repetido(
    db: Session,
    tipo_documento: str,
    numero_documento: str,
    cliente_id_actual: int | None = None,
) -> None:
    consulta = db.query(Cliente).filter(
        Cliente.tipo_documento == tipo_documento,
        Cliente.numero_documento == numero_documento,
        Cliente.eliminado_en.is_(None),
    )
    cliente_existente = consulta.first()

    if cliente_existente is not None and cliente_existente.id != cliente_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un cliente con ese documento",
        )


def listar_clientes(db: Session) -> list[dict]:
    consulta = db.query(Cliente).filter(Cliente.eliminado_en.is_(None))
    lista = consulta.all()

    resultado = []
    for cliente in lista:
        usuario = buscar_usuario_cliente(db, cliente)
        resultado.append(cliente_respuesta(db, cliente, usuario))

    return resultado


def obtener_cliente(db: Session, cliente_id: int) -> dict:
    cliente = buscar_cliente_activo(db, cliente_id)

    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = buscar_usuario_cliente(db, cliente)

    return {"cliente": cliente_respuesta(db, cliente, usuario)}


def crear_cliente(db: Session, datos, usuario_actual_id: int) -> dict:
    validar_documento_no_repetido(
        db,
        datos.tipo_documento,
        datos.numero_documento,
    )
    validar_ubicacion(db, datos.estado_id, datos.ciudad_id)

    ahora = datetime.now()

    nuevo_cliente = Cliente(
        usuario_id=None,
        tipo_cliente=datos.tipo_cliente,
        tipo_documento=datos.tipo_documento,
        numero_documento=datos.numero_documento,
        nombre=datos.nombre,
        apellido=datos.apellido,
        razon_social=datos.razon_social,
        telefono=datos.telefono,
        telefono_secundario=datos.telefono_secundario,
        direccion=datos.direccion,
        estado_id=datos.estado_id,
        ciudad_id=datos.ciudad_id,
        notas=datos.notas,
        creado_por=usuario_actual_id,
        actualizado_por=usuario_actual_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)

    return {
        "mensaje": "Cliente registrado con éxito",
        "cliente": cliente_respuesta(db, nuevo_cliente, None),
    }


def actualizar_cliente(db: Session, cliente_id: int, datos, usuario_actual_id: int) -> dict:
    cliente = buscar_cliente_activo(db, cliente_id)

    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = buscar_usuario_cliente(db, cliente)

    if datos.nombre is not None:
        cliente.nombre = datos.nombre
        if usuario is not None:
            usuario.nombre = datos.nombre

    if datos.apellido is not None:
        cliente.apellido = datos.apellido
        if usuario is not None:
            usuario.apellido = datos.apellido

    tipo_documento_final = datos.tipo_documento or cliente.tipo_documento
    numero_documento_final = datos.numero_documento or cliente.numero_documento
    if (
        tipo_documento_final != cliente.tipo_documento
        or numero_documento_final != cliente.numero_documento
    ):
        validar_documento_no_repetido(
            db,
            tipo_documento_final,
            numero_documento_final,
            cliente.id,
        )
        cliente.tipo_documento = tipo_documento_final
        cliente.numero_documento = numero_documento_final

    if datos.tipo_cliente is not None:
        cliente.tipo_cliente = datos.tipo_cliente

    if datos.razon_social is not None:
        cliente.razon_social = datos.razon_social

    if datos.telefono is not None:
        cliente.telefono = datos.telefono
        if usuario is not None:
            usuario.telefono = datos.telefono

    if datos.telefono_secundario is not None:
        cliente.telefono_secundario = datos.telefono_secundario

    if datos.direccion is not None:
        cliente.direccion = datos.direccion

    estado_id_final = datos.estado_id if datos.estado_id is not None else cliente.estado_id
    ciudad_id_final = datos.ciudad_id if datos.ciudad_id is not None else cliente.ciudad_id
    if estado_id_final != cliente.estado_id or ciudad_id_final != cliente.ciudad_id:
        validar_ubicacion(db, estado_id_final, ciudad_id_final)
        cliente.estado_id = estado_id_final
        cliente.ciudad_id = ciudad_id_final

    if datos.notas is not None:
        cliente.notas = datos.notas

    cliente.actualizado_en = datetime.now()
    cliente.actualizado_por = usuario_actual_id
    if usuario is not None:
        usuario.actualizado_en = datetime.now()
    db.commit()
    db.refresh(cliente)
    if usuario is not None:
        db.refresh(usuario)

    return {
        "mensaje": "Cliente actualizado con éxito",
        "cliente": cliente_respuesta(db, cliente, usuario),
    }


def desactivar_cliente(db: Session, cliente_id: int, usuario_actual_id: int) -> dict:
    cliente = buscar_cliente_activo(db, cliente_id)

    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = buscar_usuario_cliente(db, cliente)
    ahora = datetime.now()
    cliente.eliminado_en = ahora
    cliente.actualizado_en = ahora
    cliente.actualizado_por = usuario_actual_id
    if usuario is not None:
        usuario.eliminado_en = ahora
        usuario.actualizado_en = ahora
    db.commit()

    return {
        "mensaje": "Cliente desactivado con éxito",
        "cliente_id": cliente_id,
    }
