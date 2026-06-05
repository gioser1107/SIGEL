from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.ciudad_modelo import Ciudad
from modelos.cliente_modelo import Cliente
from modelos.estado_modelo import Estado
from modelos.usuario_modelo import Usuario
from utilidades.cliente_utilidad import cliente_a_dict, obtener_rol_cliente
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_CLIENTES,
    PERMISO_CREAR_CLIENTES,
    PERMISO_EDITAR_CLIENTES,
    PERMISO_LEER_CLIENTES,
)

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class DatosClienteNuevo(BaseModel):
    nombre_completo: str
    tipo_cliente: str = "natural"
    tipo_documento: str
    numero_documento: str
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None
    notas: str | None = None


class DatosClienteActualizar(BaseModel):
    nombre_completo: str | None = None
    tipo_cliente: str | None = None
    tipo_documento: str | None = None
    numero_documento: str | None = None
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None
    notas: str | None = None


def buscar_cliente_activo(db: Session, cliente_id: int) -> Cliente | None:
    consulta = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    )
    return consulta.first()


def buscar_usuario_cliente(db: Session, cliente: Cliente) -> Usuario | None:
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


@router.get("/")
def listar_clientes(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    """Lista fichas de clientes registradas. Usado por ATC/Admin."""
    consulta = db.query(Cliente).filter(Cliente.eliminado_en.is_(None))
    lista = consulta.all()

    resultado = []
    for cliente in lista:
        usuario = buscar_usuario_cliente(db, cliente)
        resultado.append(cliente_respuesta(db, cliente, usuario))

    return resultado


@router.get("/{cliente_id}")
def obtener_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    cliente = buscar_cliente_activo(db, cliente_id)

    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = buscar_usuario_cliente(db, cliente)

    return {"cliente": cliente_respuesta(db, cliente, usuario)}


@router.post("/")
def crear_cliente_desde_admin(
    datos: DatosClienteNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_CLIENTES)),
):
    """ATC o Admin registra una ficha de cliente sin obligarlo a tener usuario."""
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
        nombre_completo=datos.nombre_completo,
        razon_social=datos.razon_social,
        telefono=datos.telefono,
        telefono_secundario=datos.telefono_secundario,
        direccion=datos.direccion,
        estado_id=datos.estado_id,
        ciudad_id=datos.ciudad_id,
        notas=datos.notas,
        creado_por=usuario_actual["id"],
        actualizado_por=usuario_actual["id"],
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


@router.put("/{cliente_id}")
def actualizar_cliente(
    cliente_id: int,
    datos: DatosClienteActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_CLIENTES)),
):
    cliente = buscar_cliente_activo(db, cliente_id)

    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = buscar_usuario_cliente(db, cliente)

    if datos.nombre_completo is not None:
        cliente.nombre_completo = datos.nombre_completo
        if usuario is not None:
            usuario.nombre_completo = datos.nombre_completo

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
    cliente.actualizado_por = usuario_actual["id"]
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


@router.delete("/{cliente_id}")
def desactivar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_CLIENTES)),
):
    cliente = buscar_cliente_activo(db, cliente_id)

    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    usuario = buscar_usuario_cliente(db, cliente)
    ahora = datetime.now()
    cliente.eliminado_en = ahora
    cliente.actualizado_en = ahora
    cliente.actualizado_por = usuario_actual["id"]
    if usuario is not None:
        usuario.eliminado_en = ahora
        usuario.actualizado_en = ahora
    db.commit()

    return {
        "mensaje": "Cliente desactivado con éxito",
        "cliente_id": cliente_id,
    }
