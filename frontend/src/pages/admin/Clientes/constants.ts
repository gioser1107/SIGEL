import type { PestaniaFiltro, PestaniaPanel } from '../../../components/admin';
import type { FormularioCliente } from '../../../utils/validacionesCliente';

export const MODULO = 'clientes';

export const PESTANIAS: PestaniaFiltro[] = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'natural', etiqueta: 'Personas' },
  { id: 'juridico', etiqueta: 'Empresas' },
];

export const TIPOS_DOCUMENTO = ['V', 'E', 'J', 'G', 'P', 'otro'] as const;

export const ETIQUETA_TIPO: Record<string, string> = {
  natural: 'Persona natural',
  juridico: 'Empresa',
};

export const PESTANIAS_PANEL: PestaniaPanel[] = [
  { id: 'ficha', etiqueta: 'Ficha' },
  { id: 'editar', etiqueta: 'Editar' },
];

export const FORM_VACIO: FormularioCliente = {
  tipo_cliente: 'natural',
  tipo_documento: 'V',
  numero_documento: '',
  nombre: '',
  apellido: '',
  razon_social: '',
  telefono_prefijo: '',
  telefono_numero: '',
  telefono_fijo: '',
  telefono_sec_prefijo: '',
  telefono_sec_numero: '',
  telefono_sec_fijo: '',
  direccion: '',
  estado_id: '',
  ciudad_id: '',
  notas: '',
};
