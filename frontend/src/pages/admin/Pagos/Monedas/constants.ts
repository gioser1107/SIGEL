export interface FormularioMoneda {
  codigo: string;
  nombre: string;
  simbolo: string;
}

export const FORM_MONEDA_VACIO: FormularioMoneda = {
  codigo: '',
  nombre: '',
  simbolo: '',
};

export function monedaAFormulario(m: { codigo: string; nombre: string; simbolo: string }): FormularioMoneda {
  return { codigo: m.codigo, nombre: m.nombre, simbolo: m.simbolo };
}

export function validarFormularioMoneda(form: FormularioMoneda): string | null {
  const codigo = form.codigo.trim();
  const nombre = form.nombre.trim();
  const simbolo = form.simbolo.trim();
  if (!codigo || !nombre || !simbolo) return 'Completa código, nombre y símbolo.';
  if (!/^[A-Z]{3}$/.test(codigo)) return 'Código ISO de 3 letras (ej: EUR, USD, VES).';
  if (nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (simbolo.length < 1 || simbolo.length > 5) return 'Símbolo: entre 1 y 5 caracteres.';
  return null;
}
