import { nombreCompleto } from '../../../../utils/nombrePersona';
import type { Cliente } from '../../../../types/cliente';

export function nombreVisibleCliente(c: Pick<Cliente, 'nombre' | 'apellido' | 'razon_social' | 'tipo_cliente'>): string {
  if (c.tipo_cliente === 'juridico' && c.razon_social?.trim()) {
    return c.razon_social.trim();
  }
  return nombreCompleto(c.nombre, c.apellido) || 'Cliente';
}

export function inicialesCliente(c: Pick<Cliente, 'nombre' | 'apellido' | 'razon_social' | 'tipo_cliente'>): string {
  if (c.tipo_cliente === 'juridico' && c.razon_social?.trim()) {
    const partes = c.razon_social.trim().split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return c.razon_social.trim().slice(0, 2).toUpperCase();
  }
  const n = c.nombre.trim().charAt(0);
  const a = c.apellido.trim().charAt(0);
  return `${n}${a}`.toUpperCase() || 'CL';
}
