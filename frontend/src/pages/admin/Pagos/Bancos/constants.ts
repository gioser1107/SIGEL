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
  if (!/^[A-Za-z0-9_\-]{1,10}$/.test(codigo)) {
    return 'Código: máx. 10 caracteres (letras, números, guión).';
  }
  if (nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  return null;
}
