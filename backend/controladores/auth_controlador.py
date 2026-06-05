from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import (
    obtener_permisos_del_rol,
    obtener_usuario_actual,
)
from modelos.ciudad_modelo import Ciudad
from modelos.cliente_modelo import Cliente
from modelos.estado_modelo import Estado
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario
from utilidades.cliente_utilidad import cliente_a_dict, obtener_rol_cliente
from utilidades.contrasena_utilidad import hashear_contrasena, verificar_contrasena
from utilidades.jwt_utilidad import crear_token
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.usuario_respuesta_utilidad import usuario_a_dict

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class DatosLogin(BaseModel):
    correo: str
    contrasena: str


class DatosRegistroCliente(BaseModel):
    nombre_completo: str
    correo: str
    contrasena: str
    tipo_cliente: str = "natural"
    tipo_documento: str
    numero_documento: str
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None


@router.post("/login")
def iniciar_sesion(datos: DatosLogin, request: Request, db: Session = Depends(get_db)):
    consulta = db.query(Usuario).filter(
        Usuario.correo == datos.correo,
        Usuario.eliminado_en.is_(None),
    )
    usuario = consulta.first()

    if usuario is None:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    contrasena_valida = verificar_contrasena(datos.contrasena, usuario.hash_contrasena)
    if not contrasena_valida:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    consulta_rol = db.query(Rol).filter(Rol.id == usuario.rol_id)
    rol = consulta_rol.first()
    nombre_rol = rol.nombre if rol is not None else ""

    token, expira_en_segundos = crear_token(usuario.id, usuario.correo, usuario.rol_id)

    usuario_dict = usuario_a_dict(usuario, nombre_rol)
    usuario_dict["permisos"] = obtener_permisos_del_rol(db, usuario.rol_id)

    registrar_evento(
        db,
        modulo="seguridad",
        accion="LOGIN",
        resumen="Inicio de sesión",
        usuario_id=usuario.id,
        tabla_afectada="usuarios",
        registro_id=usuario.id,
        detalle={"correo": usuario.correo, "rol": nombre_rol},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Sesión iniciada con éxito",
        "token": token,
        "tipo_token": "Bearer",
        "expira_en_segundos": expira_en_segundos,
        "usuario": usuario_dict,
    }


@router.post("/registro")
def registrar_cliente_portal(datos: DatosRegistroCliente, db: Session = Depends(get_db)):
    """Registro público: el cliente crea su propia cuenta para el portal web."""
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

    estado = None
    ciudad = None
    if datos.estado_id is not None:
        consulta_estado = db.query(Estado).filter(
            Estado.id == datos.estado_id,
            Estado.eliminado_en.is_(None),
        )
        estado = consulta_estado.first()

        if estado is None:
            raise HTTPException(status_code=400, detail="El estado seleccionado no existe")

    if datos.ciudad_id is not None:
        consulta_ciudad = db.query(Ciudad).filter(
            Ciudad.id == datos.ciudad_id,
            Ciudad.eliminado_en.is_(None),
        )
        ciudad = consulta_ciudad.first()

        if ciudad is None:
            raise HTTPException(status_code=400, detail="La ciudad seleccionada no existe")

    if estado is not None and ciudad is not None and ciudad.estado_id != estado.id:
        raise HTTPException(
            status_code=400,
            detail="La ciudad seleccionada no pertenece al estado indicado",
        )

    ahora = datetime.now()
    hash_contrasena = hashear_contrasena(datos.contrasena)

    nuevo_usuario = Usuario(
        rol_id=rol_cliente.id,
        correo=datos.correo,
        hash_contrasena=hash_contrasena,
        nombre_completo=datos.nombre_completo,
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
            nombre_completo=datos.nombre_completo,
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
        nuevo_cliente.nombre_completo = datos.nombre_completo
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

    return {
        "mensaje": "Cuenta de cliente creada con éxito",
        "token": token,
        "tipo_token": "Bearer",
        "expira_en_segundos": expira_en_segundos,
        "cliente": cliente_dict,
    }


@router.get("/perfil")
def obtener_perfil(usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Devuelve el usuario autenticado y sus permisos (para menús del frontend)."""
    return {
        "mensaje": "Sesión activa",
        "usuario": usuario_actual,
    }
