from sqlalchemy.orm import Session

from modelos.ciudad_modelo import Ciudad
from modelos.cliente_modelo import Cliente
from modelos.estado_modelo import Estado
from modelos.rol_modelo import Rol
from modelos.usuario_modelo import Usuario


def obtener_rol_cliente(db: Session) -> Rol | None:
    consulta = db.query(Rol).filter(
        Rol.nombre == "Cliente",
        Rol.eliminado_en.is_(None),
    )
    return consulta.first()


def cliente_a_dict(
    cliente: Cliente,
    usuario: Usuario | None = None,
    estado: Estado | None = None,
    ciudad: Ciudad | None = None,
) -> dict:
    """Devuelve la ficha comercial del cliente y, si existe, su cuenta de acceso."""
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
        "nombre_completo": cliente.nombre_completo,
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
