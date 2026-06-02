from modelos.usuario_modelo import Usuario


def usuario_a_dict(usuario: Usuario, nombre_rol: str) -> dict:
    return {
        "id": usuario.id,
        "rol_id": usuario.rol_id,
        "rol": nombre_rol,
        "correo": usuario.correo,
        "nombre_completo": usuario.nombre_completo,
        "telefono": usuario.telefono,
    }
