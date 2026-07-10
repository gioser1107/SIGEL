export interface FormularioMetodoPago {
  codigo: string;
  nombre: string;
  moneda_id: string;
}

export const FORM_METODO_PAGO_VACIO: FormularioMetodoPago = {
  codigo: '',
  nombre: '',
  moneda_id: '',
};

export function metodoPagoAFormulario(m: { codigo: string; nombre: string; moneda: { id: number } }): FormularioMetodoPago {
  return { codigo: m.codigo, nombre: m.nombre, moneda_id: String(m.moneda.id) };
}

export function validarFormularioMetodoPago(form: FormularioMetodoPago): string | null {
  const codigo = form.codigo.trim();
  const nombre = form.nombre.trim();
  if (!codigo || !nombre || !form.moneda_id) return 'Completa código, nombre y moneda.';
  if (!/^[A-Za-z0-9_\-]{1,20}$/.test(codigo)) {
    return 'Código: letras, números o guiones (máx. 20).';
  }
  if (nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  return null;
}
