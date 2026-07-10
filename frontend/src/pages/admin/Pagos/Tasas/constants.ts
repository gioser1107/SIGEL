import { fechaHoyIso } from '../constants';

export interface FormularioTasa {
  fecha: string;
  valor: string;
  moneda_id: string;
}

export function formTasaVacio(monedas: { id: number; codigo: string }[], fecha = fechaHoyIso()): FormularioTasa {
  const eur = monedas.find((m) => m.codigo === 'EUR');
  return { fecha, valor: '', moneda_id: eur ? String(eur.id) : '' };
}

export function tasaAFormulario(t: { fecha: string; valor: number; moneda: { id: number } }): FormularioTasa {
  return { fecha: t.fecha, valor: String(t.valor), moneda_id: String(t.moneda.id) };
}

export function validarFormularioTasa(form: FormularioTasa): string | null {
  const valor = Number(form.valor);
  if (!form.fecha || !form.moneda_id) return 'Completa fecha y moneda.';
  if (!form.fecha.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Fecha no válida.';
  if (!Number.isFinite(valor) || valor <= 0) return 'El valor debe ser mayor a cero.';
  return null;
}
