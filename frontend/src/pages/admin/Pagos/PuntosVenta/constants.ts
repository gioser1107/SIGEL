export interface FormularioPuntoVenta {
  banco_id: string;
  codigo: string;
  nombre: string;
  numero_terminal: string;
  activo: boolean;
}

export const FORM_PUNTO_VENTA_VACIO: FormularioPuntoVenta = {
  banco_id: '',
  codigo: '',
  nombre: '',
  numero_terminal: '',
  activo: true,
};

export function puntoVentaAFormulario(p: {
  banco_id: number;
  codigo: string;
  nombre: string;
  numero_terminal: string;
  activo?: boolean;
}): FormularioPuntoVenta {
  return {
    banco_id: String(p.banco_id),
    codigo: p.codigo,
    nombre: p.nombre,
    numero_terminal: p.numero_terminal,
    activo: p.activo !== false,
  };
}

export function validarFormularioPuntoVenta(form: FormularioPuntoVenta): string | null {
  const codigo = form.codigo.trim();
  const nombre = form.nombre.trim();
  const terminal = form.numero_terminal.trim();
  if (!form.banco_id || !codigo || !nombre || !terminal) {
    return 'Completa banco, código, nombre y número de terminal.';
  }
  if (!/^[A-Za-z0-9_\-]{1,30}$/.test(codigo)) {
    return 'Código: letras, números o guiones (máx. 30).';
  }
  if (nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  return null;
}
