import hashlib
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import Session

from database import Base
from modelos.cliente_modelo import (
    Cliente,
    obtener_cliente_por_usuario_id,
    obtener_rol_cliente,
    validar_ubicacion,
)
from modelos.punto_recogida_modelo import asignar_puntos_a_cliente
from modelos.cliente_modelo import cliente_respuesta
from modelos.rol_modelo import Rol

directorio_backend = Path(__file__).resolve().parent.parent
load_dotenv(directorio_backend / ".env")

ALGORITMO_JWT = "HS256"
SECRETO_JWT = os.getenv("JWT_SECRETO", "secreto-temporal-cambiar-en-env")
EXPIRACION_MINUTOS = int(os.getenv("JWT_EXPIRACION_MINUTOS", "480"))


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(BigInteger, primary_key=True, index=True)
    rol_id = Column(BigInteger, ForeignKey("roles.id"), nullable=False, index=True)
    correo = Column(String(320), unique=True, nullable=False, index=True)
    hash_contrasena = Column(String(255), nullable=False)
    nombre = Column(String(80), nullable=False)
    apellido = Column(String(80), nullable=False)
    telefono = Column(String(30), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def nombre_completo_de(nombre: str | None, apellido: str | None) -> str:
    return f"{nombre or ''} {apellido or ''}".strip()


def hashear_contrasena(contrasena: str) -> str:
    return hashlib.sha256(contrasena.encode("utf-8")).hexdigest()


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    hash_ingresado = hashear_contrasena(contrasena)
    return hash_ingresado == hash_guardado


def usuario_a_dict(usuario: Usuario, nombre_rol: str) -> dict:
    return {
        "id": usuario.id,
        "rol_id": usuario.rol_id,
        "rol": nombre_rol,
        "correo": usuario.correo,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "telefono": usuario.telefono,
    }


def crear_token(usuario_id: int, correo: str, rol_id: int) -> tuple[str, int]:
    ahora = datetime.now(timezone.utc)
    expiracion = ahora + timedelta(minutes=EXPIRACION_MINUTOS)
    expira_en_segundos = EXPIRACION_MINUTOS * 60

    payload = {
        "sub": str(usuario_id),
        "correo": correo,
        "rol_id": rol_id,
        "iat": int(ahora.timestamp()),
        "exp": int(expiracion.timestamp()),
    }

    token = jwt.encode(payload, SECRETO_JWT, algorithm=ALGORITMO_JWT)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token, expira_en_segundos


def verificar_token(token: str) -> dict:
    payload = jwt.decode(token, SECRETO_JWT, algorithms=[ALGORITMO_JWT])
    return payload


def obtener_nombre_rol(db: Session, rol_id: int) -> str:
    rol = db.query(Rol).filter(Rol.id == rol_id).first()
    return rol.nombre if rol is not None else ""


def buscar_usuario_activo(db: Session, usuario_id: int) -> Usuario:
    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.eliminado_en.is_(None),
    ).first()
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


def usuario_a_dict_con_rol(db: Session, usuario: Usuario) -> dict:
    nombre_rol = obtener_nombre_rol(db, usuario.rol_id)
    return usuario_a_dict(usuario, nombre_rol)


def listar_usuarios(db: Session) -> list[dict]:
    usuarios = db.query(Usuario).filter(Usuario.eliminado_en.is_(None)).all()
    return [usuario_a_dict_con_rol(db, usuario) for usuario in usuarios]


def actualizar_mi_perfil(
    db: Session,
    usuario_id: int,
    nombre: str | None,
    apellido: str | None,
    telefono: str | None,
) -> dict:
    usuario = buscar_usuario_activo(db, usuario_id)

    if nombre is not None:
        usuario.nombre = nombre
    if apellido is not None:
        usuario.apellido = apellido
    if telefono is not None:
        usuario.telefono = telefono

    usuario.actualizado_en = datetime.now()
    db.commit()
    db.refresh(usuario)
    return usuario_a_dict_con_rol(db, usuario)


def cambiar_mi_contrasena(
    db: Session,
    usuario_id: int,
    contrasena_actual: str,
    contrasena_nueva: str,
) -> None:
    usuario = buscar_usuario_activo(db, usuario_id)

    if not verificar_contrasena(contrasena_actual, usuario.hash_contrasena):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

    usuario.hash_contrasena = hashear_contrasena(contrasena_nueva)
    usuario.actualizado_en = datetime.now()
    db.commit()


def crear_usuario(
    db: Session,
    nombre: str,
    apellido: str,
    correo: str,
    contrasena: str,
    rol_id: int,
    telefono: str | None,
) -> dict:
    usuario_existente = db.query(Usuario).filter(Usuario.correo == correo).first()
    if usuario_existente is not None and usuario_existente.eliminado_en is None:
        raise HTTPException(
            status_code=400,
            detail="El correo ya está registrado en el sistema",
        )

    rol = db.query(Rol).filter(
        Rol.id == rol_id,
        Rol.eliminado_en.is_(None),
    ).first()
    if rol is None:
        raise HTTPException(status_code=400, detail="El rol seleccionado no existe")

    ahora = datetime.now()
    nuevo_usuario = Usuario(
        rol_id=rol_id,
        correo=correo,
        hash_contrasena=hashear_contrasena(contrasena),
        nombre=nombre,
        apellido=apellido,
        telefono=telefono,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return usuario_a_dict(nuevo_usuario, rol.nombre)


def actualizar_usuario(
    db: Session,
    usuario_id: int,
    nombre: str | None,
    apellido: str | None,
    correo: str | None,
    telefono: str | None,
) -> dict:
    usuario = buscar_usuario_activo(db, usuario_id)

    if correo is not None and correo != usuario.correo:
        otro = db.query(Usuario).filter(Usuario.correo == correo).first()
        if otro is not None and otro.id != usuario_id and otro.eliminado_en is None:
            raise HTTPException(
                status_code=400,
                detail="El correo ya está en uso por otro usuario",
            )
        usuario.correo = correo

    if nombre is not None:
        usuario.nombre = nombre
    if apellido is not None:
        usuario.apellido = apellido
    if telefono is not None:
        usuario.telefono = telefono

    usuario.actualizado_en = datetime.now()
    db.commit()
    db.refresh(usuario)
    return usuario_a_dict_con_rol(db, usuario)


def asignar_rol_a_usuario(db: Session, usuario_id: int, rol_id: int) -> dict:
    usuario = buscar_usuario_activo(db, usuario_id)

    rol = db.query(Rol).filter(
        Rol.id == rol_id,
        Rol.eliminado_en.is_(None),
    ).first()
    if rol is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    usuario.rol_id = rol_id
    usuario.actualizado_en = datetime.now()
    db.commit()
    db.refresh(usuario)
    return usuario_a_dict(usuario, rol.nombre)


def resetear_contrasena_de_usuario(
    db: Session,
    usuario_id: int,
    contrasena_nueva: str,
) -> None:
    usuario = buscar_usuario_activo(db, usuario_id)
    usuario.hash_contrasena = hashear_contrasena(contrasena_nueva)
    usuario.actualizado_en = datetime.now()
    db.commit()


def eliminar_usuario(db: Session, usuario_id: int, usuario_sesion_id: int) -> None:
    if usuario_sesion_id == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propia cuenta mientras estás en sesión",
        )

    usuario = buscar_usuario_activo(db, usuario_id)
    ahora = datetime.now()
    usuario.eliminado_en = ahora
    usuario.actualizado_en = ahora
    db.commit()


def iniciar_sesion(db: Session, correo: str, contrasena: str) -> dict:
    from dependencias.auth_dependencia import obtener_permisos_del_rol

    consulta = db.query(Usuario).filter(
        Usuario.correo == correo,
        Usuario.eliminado_en.is_(None),
    )
    usuario = consulta.first()

    if usuario is None:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    contrasena_valida = verificar_contrasena(contrasena, usuario.hash_contrasena)
    if not contrasena_valida:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    consulta_rol = db.query(Rol).filter(Rol.id == usuario.rol_id)
    rol = consulta_rol.first()
    nombre_rol = rol.nombre if rol is not None else ""

    token, expira_en_segundos = crear_token(usuario.id, usuario.correo, usuario.rol_id)

    usuario_dict = usuario_a_dict(usuario, nombre_rol)
    usuario_dict["permisos"] = obtener_permisos_del_rol(db, usuario.rol_id)
    cliente = obtener_cliente_por_usuario_id(db, usuario.id)
    usuario_dict["cliente_id"] = cliente.id if cliente is not None else None

    return {
        "mensaje": "Sesión iniciada con éxito",
        "token": token,
        "tipo_token": "Bearer",
        "expira_en_segundos": expira_en_segundos,
        "usuario": usuario_dict,
    }


def registrar_cliente_portal(db: Session, datos) -> dict:
    from dependencias.auth_dependencia import obtener_permisos_del_rol

    rol_cliente = obtener_rol_cliente(db)
    if rol_cliente is None:
        raise HTTPException(status_code=500, detail="El rol Cliente no existe en el sistema")

    consulta_correo = db.query(Usuario).filter(Usuario.correo == datos.correo)
    existente = consulta_correo.first()

    if existente is not None and existente.eliminado_en is None:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    consulta_documento = db.query(Cliente).filter(
        Cliente.tipo_documento == datos.tipo_documento,
        Cliente.numero_documento == datos.numero_documento,
        Cliente.eliminado_en.is_(None),
    )
    cliente_existente = consulta_documento.first()

    if cliente_existente is not None and cliente_existente.usuario_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Ese cliente ya tiene una cuenta registrada",
        )

    validar_ubicacion(db, datos.estado_id, datos.ciudad_id)

    ahora = datetime.now()
    hash_contrasena = hashear_contrasena(datos.contrasena)

    nuevo_usuario = Usuario(
        rol_id=rol_cliente.id,
        correo=datos.correo,
        hash_contrasena=hash_contrasena,
        nombre=datos.nombre,
        apellido=datos.apellido,
        telefono=datos.telefono,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_usuario)
    db.flush()

    if cliente_existente is None:
        nuevo_cliente = Cliente(
            usuario_id=nuevo_usuario.id,
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
            creado_por=nuevo_usuario.id,
            actualizado_por=nuevo_usuario.id,
            creado_en=ahora,
            actualizado_en=ahora,
        )

        db.add(nuevo_cliente)
    else:
        nuevo_cliente = cliente_existente
        nuevo_cliente.usuario_id = nuevo_usuario.id
        nuevo_cliente.nombre = datos.nombre
        nuevo_cliente.apellido = datos.apellido
        nuevo_cliente.razon_social = datos.razon_social
        nuevo_cliente.telefono = datos.telefono
        nuevo_cliente.telefono_secundario = datos.telefono_secundario
        nuevo_cliente.direccion = datos.direccion
        nuevo_cliente.estado_id = datos.estado_id
        nuevo_cliente.ciudad_id = datos.ciudad_id
        nuevo_cliente.actualizado_por = nuevo_usuario.id
        nuevo_cliente.actualizado_en = ahora

        if nuevo_cliente.creado_por is None:
            nuevo_cliente.creado_por = nuevo_usuario.id

    db.flush()

    punto_ids = getattr(datos, "punto_recogida_ids", None)
    puntos_nuevos = getattr(datos, "puntos_recogida", None)
    if punto_ids or puntos_nuevos:
        asignar_puntos_a_cliente(
            db,
            nuevo_cliente.id,
            punto_recogida_ids=punto_ids,
            puntos_nuevos=puntos_nuevos,
            creado_por_usuario_id=nuevo_usuario.id,
        )

    db.commit()
    db.refresh(nuevo_cliente)
    db.refresh(nuevo_usuario)

    token, expira_en_segundos = crear_token(
        nuevo_usuario.id,
        nuevo_usuario.correo,
        nuevo_usuario.rol_id,
    )

    cliente_dict = cliente_respuesta(db, nuevo_cliente, nuevo_usuario)
    cliente_dict["rol"] = rol_cliente.nombre
    cliente_dict["permisos"] = obtener_permisos_del_rol(db, nuevo_usuario.rol_id)
    cliente_dict["cliente_id"] = nuevo_cliente.id

    usuario_dict = usuario_a_dict(nuevo_usuario, rol_cliente.nombre)
    usuario_dict["permisos"] = cliente_dict["permisos"]
    usuario_dict["cliente_id"] = nuevo_cliente.id

    return {
        "mensaje": "Cuenta de cliente creada con éxito",
        "token": token,
        "tipo_token": "Bearer",
        "expira_en_segundos": expira_en_segundos,
        "cliente": cliente_dict,
        "usuario": usuario_dict,
    }
