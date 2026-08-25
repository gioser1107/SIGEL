from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text, or_
from sqlalchemy.orm import Session

from database import Base
from modelos.ciudad_modelo import Ciudad
from modelos.estado_modelo import Estado
from modelos.punto_recogida_modelo import asignar_puntos_a_cliente, listar_puntos_por_cliente
from modelos.rol_modelo import Rol
from utilidades.paginacion import offset_pagina, respuesta_paginada
from utilidades.persistencia import _confirmar_transaccion, _persistir
from utilidades.validaciones import ValidadorEntrada, normalizar_datos_cliente, validar_datos_cliente_entrada

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


def _candidatos_cliente_sin_usuario(db: Session, usuario) -> list[Cliente]:
    """Fichas en clientes creadas desde admin sin usuario vinculado."""
    consulta = db.query(Cliente).filter(
        Cliente.eliminado_en.is_(None),
        Cliente.usuario_id.is_(None),
        Cliente.nombre == usuario.nombre.strip(),
        Cliente.apellido == usuario.apellido.strip(),
    )
    candidatos = consulta.all()
    if len(candidatos) <= 1:
        return candidatos

    telefono = (usuario.telefono or "").strip()
    if telefono:
        filtrados = [
            c for c in candidatos
            if not (c.telefono or "").strip() or (c.telefono or "").strip() == telefono
        ]
        if len(filtrados) == 1:
            return filtrados

    return candidatos


def asegurar_perfil_cliente_usuario(db: Session, usuario, rol_nombre: str) -> Cliente | None:
    """
    Garantiza que un usuario con rol Cliente tenga ficha en la tabla clientes.
    Vincula automáticamente fichas huérfanas (creadas en admin) o crea una mínima.
    """
    if not es_rol_cliente(rol_nombre):
        return None

    vinculado = obtener_cliente_por_usuario_id(db, usuario.id)
    if vinculado is not None:
        return vinculado

    ahora = datetime.now()
    candidatos = _candidatos_cliente_sin_usuario(db, usuario)

    if len(candidatos) == 1:
        cliente = candidatos[0]
        cliente.usuario_id = usuario.id
        cliente.actualizado_en = ahora
        if cliente.actualizado_por is None:
            cliente.actualizado_por = usuario.id
        _confirmar_transaccion(db)
        db.refresh(cliente)
        return cliente

    numero_documento = f"USR{usuario.id:08d}"
    existente_doc = db.query(Cliente).filter(
        Cliente.tipo_documento == "V",
        Cliente.numero_documento == numero_documento,
        Cliente.eliminado_en.is_(None),
    ).first()
    if existente_doc is not None:
        if existente_doc.usuario_id is None:
            existente_doc.usuario_id = usuario.id
            existente_doc.actualizado_en = ahora
            _confirmar_transaccion(db)
            db.refresh(existente_doc)
            return existente_doc
        if existente_doc.usuario_id == usuario.id:
            return existente_doc

    nuevo = Cliente(
        usuario_id=usuario.id,
        tipo_cliente="natural",
        tipo_documento="V",
        numero_documento=numero_documento,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        telefono=usuario.telefono,
        creado_por=usuario.id,
        actualizado_por=usuario.id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    _confirmar_transaccion(db)
    db.refresh(nuevo)
    return nuevo


def resolver_cliente_id_portal(db: Session, usuario_id: int, rol_nombre: str) -> int | None:
    from modelos.usuario_modelo import Usuario

    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.eliminado_en.is_(None),
    ).first()
    if usuario is None:
        return None
    cliente = asegurar_perfil_cliente_usuario(db, usuario, rol_nombre)
    return cliente.id if cliente is not None else None


def es_rol_cliente(nombre_rol: str) -> bool:
    return (nombre_rol or "").strip().lower() == "cliente"


def requiere_sesion_cliente_portal(usuario_actual: dict) -> int:
    """Valida sesión del portal cliente: rol Cliente y perfil vinculado en clientes."""
    rol = (usuario_actual.get("rol") or "").strip()
    if not es_rol_cliente(rol):
        raise HTTPException(
            status_code=403,
            detail=(
                f"Este recurso es solo para clientes. "
                f"Tu rol actual es «{rol or 'sin rol'}». "
                f"Cierra sesión e inicia con una cuenta de cliente."
            ),
        )

    cliente_id = usuario_actual.get("cliente_id")
    if cliente_id is None:
        raise HTTPException(
            status_code=403,
            detail=(
                "Tu cuenta no tiene un perfil de cliente vinculado. "
                "Regístrate en el portal o contacta a soporte para activar tu acceso."
            ),
        )
    return int(cliente_id)


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
    respuesta = cliente_a_dict(cliente, usuario, estado, ciudad)
    respuesta["puntos_recogida"] = listar_puntos_por_cliente(db, cliente.id)
    return respuesta


def buscar_cliente_por_documento(
    db: Session,
    tipo_documento: str,
    numero_documento: str,
) -> Cliente | None:
    return db.query(Cliente).filter(
        Cliente.tipo_documento == tipo_documento,
        Cliente.numero_documento == numero_documento.strip(),
        Cliente.eliminado_en.is_(None),
    ).first()


def buscar_cliente_por_documento_respuesta(
    db: Session,
    tipo_documento: str,
    numero_documento: str,
) -> dict | None:
    cliente = buscar_cliente_por_documento(db, tipo_documento, numero_documento)
    if cliente is None:
        return None
    usuario = buscar_usuario_cliente(db, cliente)
    return {"cliente": cliente_respuesta(db, cliente, usuario)}


def registrar_cliente_para_reserva(
    db: Session,
    datos,
    creado_por_usuario_id: int | None,
) -> Cliente:
    validar_datos_cliente_entrada(datos, parcial=False)
    campos = normalizar_datos_cliente(datos)
    tipo_documento = campos["tipo_documento"]
    numero_documento = campos["numero_documento"]
    if not numero_documento:
        raise HTTPException(status_code=422, detail="numero_documento: es obligatorio")

    validar_ubicacion(db, datos.estado_id, datos.ciudad_id)

    cliente_existente = buscar_cliente_por_documento(db, tipo_documento, numero_documento)
    if cliente_existente is not None:
        punto_ids = getattr(datos, "punto_recogida_ids", None)
        puntos_nuevos = getattr(datos, "puntos_recogida", None)
        if punto_ids or puntos_nuevos:
            asignar_puntos_a_cliente(
                db,
                cliente_existente.id,
                punto_recogida_ids=punto_ids,
                puntos_nuevos=puntos_nuevos,
                creado_por_usuario_id=creado_por_usuario_id,
            )
        return cliente_existente

    ahora = datetime.now()
    nuevo_cliente = Cliente(
        usuario_id=None,
        tipo_cliente=campos["tipo_cliente"],
        tipo_documento=tipo_documento,
        numero_documento=numero_documento,
        nombre=campos["nombre"],
        apellido=campos["apellido"],
        razon_social=campos["razon_social"] or getattr(datos, "razon_social", None),
        telefono=ValidadorEntrada.telefono(getattr(datos, "telefono", None), "telefono") or None,
        telefono_secundario=ValidadorEntrada.telefono(
            getattr(datos, "telefono_secundario", None),
            "telefono_secundario",
        ) or None,
        direccion=getattr(datos, "direccion", None),
        estado_id=getattr(datos, "estado_id", None),
        ciudad_id=getattr(datos, "ciudad_id", None),
        notas=getattr(datos, "notas", None),
        creado_por=creado_por_usuario_id,
        actualizado_por=creado_por_usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_cliente)
    db.flush()

    punto_ids = getattr(datos, "punto_recogida_ids", None)
    puntos_nuevos = getattr(datos, "puntos_recogida", None)
    if punto_ids or puntos_nuevos:
        asignar_puntos_a_cliente(
            db,
            nuevo_cliente.id,
            punto_recogida_ids=punto_ids,
            puntos_nuevos=puntos_nuevos,
            creado_por_usuario_id=creado_por_usuario_id,
        )

    return nuevo_cliente


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


def listar_clientes(
    db: Session,
    pagina: int = 1,
    limite: int = 10,
    buscar: str | None = None,
) -> dict:
    consulta = db.query(Cliente).filter(Cliente.eliminado_en.is_(None))

    if buscar is not None and buscar.strip():
        termino = f"%{buscar.strip()}%"
        consulta = consulta.filter(
            or_(
                Cliente.nombre.ilike(termino),
                Cliente.apellido.ilike(termino),
                Cliente.numero_documento.ilike(termino),
                Cliente.telefono.ilike(termino),
                Cliente.razon_social.ilike(termino),
            )
        )

    total = consulta.count()
    clientes = (
        consulta.order_by(Cliente.apellido.asc(), Cliente.nombre.asc())
        .offset(offset_pagina(pagina, limite))
        .limit(limite)
        .all()
    )

    items = []
    for cliente in clientes:
        usuario = buscar_usuario_cliente(db, cliente)
        items.append(cliente_respuesta(db, cliente, usuario))

    return respuesta_paginada(items, total, pagina, limite)


def obtener_cliente(db: Session, cliente_id: int) -> dict:
    cliente = buscar_cliente_activo(db, cliente_id)

    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = buscar_usuario_cliente(db, cliente)

    return {"cliente": cliente_respuesta(db, cliente, usuario)}


def crear_cliente(db: Session, datos, usuario_actual_id: int) -> dict:
    validar_datos_cliente_entrada(datos, parcial=False)
    campos = normalizar_datos_cliente(datos)
    validar_documento_no_repetido(
        db,
        campos["tipo_documento"],
        campos["numero_documento"],
    )
    validar_ubicacion(db, datos.estado_id, datos.ciudad_id)

    ahora = datetime.now()

    nuevo_cliente = Cliente(
        usuario_id=None,
        tipo_cliente=campos["tipo_cliente"],
        tipo_documento=campos["tipo_documento"],
        numero_documento=campos["numero_documento"],
        nombre=campos["nombre"],
        apellido=campos["apellido"],
        razon_social=campos["razon_social"] or datos.razon_social,
        telefono=ValidadorEntrada.telefono(datos.telefono, "telefono") or None,
        telefono_secundario=ValidadorEntrada.telefono(datos.telefono_secundario, "telefono_secundario") or None,
        direccion=(datos.direccion or "").strip() or None,
        estado_id=datos.estado_id,
        ciudad_id=datos.ciudad_id,
        notas=datos.notas,
        creado_por=usuario_actual_id,
        actualizado_por=usuario_actual_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_cliente)
    db.flush()

    punto_ids = getattr(datos, "punto_recogida_ids", None)
    puntos_nuevos = getattr(datos, "puntos_recogida", None)
    if punto_ids or puntos_nuevos:
        asignar_puntos_a_cliente(
            db,
            nuevo_cliente.id,
            punto_recogida_ids=punto_ids,
            puntos_nuevos=puntos_nuevos,
            creado_por_usuario_id=usuario_actual_id,
        )

    _confirmar_transaccion(db)
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
        nombre = ValidadorEntrada.nombre_persona(datos.nombre, "nombre")
        cliente.nombre = nombre
        if usuario is not None:
            usuario.nombre = nombre

    if datos.apellido is not None:
        apellido = ValidadorEntrada.nombre_persona(datos.apellido, "apellido")
        cliente.apellido = apellido
        if usuario is not None:
            usuario.apellido = apellido

    tipo_documento_final = datos.tipo_documento or cliente.tipo_documento
    numero_documento_final = datos.numero_documento or cliente.numero_documento
    if datos.tipo_documento is not None:
        tipo_documento_final = ValidadorEntrada.tipo_documento(datos.tipo_documento)
    if datos.numero_documento is not None:
        numero_documento_final = ValidadorEntrada.numero_documento(
            tipo_documento_final,
            datos.numero_documento,
        )
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
        cliente.tipo_cliente = ValidadorEntrada.tipo_cliente(datos.tipo_cliente)

    if datos.razon_social is not None:
        cliente.razon_social = ValidadorEntrada.nombre_entidad(
            datos.razon_social,
            "razon_social",
            obligatorio=cliente.tipo_cliente == "juridico",
        )

    if datos.telefono is not None:
        cliente.telefono = ValidadorEntrada.telefono(datos.telefono, "telefono")
        if usuario is not None:
            usuario.telefono = cliente.telefono

    if datos.telefono_secundario is not None:
        cliente.telefono_secundario = ValidadorEntrada.telefono(
            datos.telefono_secundario,
            "telefono_secundario",
        )

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

    punto_ids = getattr(datos, "punto_recogida_ids", None)
    puntos_nuevos = getattr(datos, "puntos_recogida", None)
    if punto_ids or puntos_nuevos:
        asignar_puntos_a_cliente(
            db,
            cliente.id,
            punto_recogida_ids=punto_ids,
            puntos_nuevos=puntos_nuevos,
            creado_por_usuario_id=usuario_actual_id,
        )

    cliente.actualizado_en = datetime.now()
    cliente.actualizado_por = usuario_actual_id
    if usuario is not None:
        usuario.actualizado_en = datetime.now()
    _confirmar_transaccion(db)
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
    _confirmar_transaccion(db)

    return {
        "mensaje": "Cliente desactivado con éxito",
        "cliente_id": cliente_id,
    }
