import type { Cliente } from '../../../../types/cliente';
import {
  armarTelefonoCliente,
  parsearTelefonoCliente,
  type FormularioCliente,
} from '../../../../utils/validacionesCliente';

export function clienteAFormulario(cliente: Cliente): FormularioCliente {
  const tel = parsearTelefonoCliente(cliente.telefono);
  const telSec = parsearTelefonoCliente(cliente.telefono_secundario);

  return {
    tipo_cliente: cliente.tipo_cliente,
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    razon_social: cliente.razon_social ?? '',
    telefono_prefijo: tel.prefijo,
    telefono_numero: tel.numero,
    telefono_fijo: tel.fijo,
    telefono_sec_prefijo: telSec.prefijo,
    telefono_sec_numero: telSec.numero,
    telefono_sec_fijo: telSec.fijo,
    direccion: cliente.direccion ?? '',
    estado_id: cliente.estado_id ? String(cliente.estado_id) : '',
    ciudad_id: cliente.ciudad_id ? String(cliente.ciudad_id) : '',
    notas: cliente.notas ?? '',
  };
}

export function formularioAPayload(form: FormularioCliente) {
  return {
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    tipo_cliente: form.tipo_cliente,
    tipo_documento: form.tipo_documento,
    numero_documento: form.numero_documento.trim(),
    razon_social: form.tipo_cliente === 'juridico' ? form.razon_social.trim() : null,
    telefono: armarTelefonoCliente({
      prefijo: form.telefono_prefijo,
      numero: form.telefono_numero,
      fijo: form.telefono_fijo,
    }),
    telefono_secundario: armarTelefonoCliente({
      prefijo: form.telefono_sec_prefijo,
      numero: form.telefono_sec_numero,
      fijo: form.telefono_sec_fijo,
    }),
    direccion: form.direccion.trim() || undefined,
    estado_id: Number(form.estado_id),
    ciudad_id: Number(form.ciudad_id),
    notas: form.notas.trim() || undefined,
  };
}
