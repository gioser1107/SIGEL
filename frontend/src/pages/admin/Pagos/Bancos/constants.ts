export interface FormularioBanco {
  codigo: string;
  nombre: string;
  activo: boolean;
}

export const FORM_BANCO_VACIO: FormularioBanco = {
  codigo: '',
  nombre: '',
  activo: true,
};

export function bancoAFormulario(b: { codigo: string; nombre: string; activo?: boolean }): FormularioBanco {
  return { codigo: b.codigo, nombre: b.nombre, activo: b.activo !== false };
}

export function validarFormularioBanco(form: FormularioBanco): string | null {
  const codigo = form.codigo.trim();
  const nombre = form.nombre.trim();
  if (!codigo || !nombre) return 'Completa código y nombre.';
  if (!/^\d{4}$/.test(codigo)) {
    return 'El código del banco debe ser de 4 dígitos (ejemplo: 0102).';
  }
  if (nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  return null;
}
