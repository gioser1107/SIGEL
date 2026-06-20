from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from dependencias.auth_dependencia import obtener_permisos_del_rol
from modelos.cliente_modelo import Cliente
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario
from utilidades.cliente_utilidad import (
    buscar_ciudad,
    buscar_estado,
    cliente_a_dict,
    obtener_cliente_por_usuario_id,
    obtener_rol_cliente,
    validar_ubicacion,
)
from utilidades.contrasena_utilidad import hashear_contrasena, verificar_contrasena
from utilidades.jwt_utilidad import crear_token
from utilidades.usuario_respuesta_utilidad import usuario_a_dict


def iniciar_sesion(db: Session, correo: str, contrasena: str) -> dict:
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
    estado = buscar_estado(db, datos.estado_id)
    ciudad = buscar_ciudad(db, datos.ciudad_id)

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

    db.commit()
    db.refresh(nuevo_cliente)
    db.refresh(nuevo_usuario)

    token, expira_en_segundos = crear_token(
        nuevo_usuario.id,
        nuevo_usuario.correo,
        nuevo_usuario.rol_id,
    )

    cliente_dict = cliente_a_dict(nuevo_cliente, nuevo_usuario, estado, ciudad)
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
