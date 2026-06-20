from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario
from utilidades.contrasena_utilidad import hashear_contrasena, verificar_contrasena
from utilidades.usuario_respuesta_utilidad import usuario_a_dict


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
