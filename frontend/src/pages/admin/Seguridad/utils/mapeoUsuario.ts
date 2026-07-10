import type { UsuarioSistema } from '../../../../types/seguridad';
import { parsearTelefonoVe } from '../../../../utils/validacionesFormulario';
import type { FormularioUsuario } from '../constants';

export function usuarioAFormulario(usuario: UsuarioSistema): FormularioUsuario {
  const { codigo, numero } = parsearTelefonoVe(usuario.telefono);
  return {
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    correo: usuario.correo,
    telefono_codigo: codigo,
    telefono_numero: numero,
    contrasena: '',
    rol_id: String(usuario.rol_id),
  };
}
