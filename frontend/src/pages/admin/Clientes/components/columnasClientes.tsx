import { EtiquetaEstado } from '../../../../components/admin';
import type { Columna } from '../../../../components/admin';
import type { Cliente } from '../../../../types/cliente';
import { nombreCompleto } from '../../../../utils/nombrePersona';
import { ETIQUETA_TIPO } from '../constants';
import './TablaClientes.css';

export const columnasClientes: Columna<Cliente>[] = [
  {
    id: 'nombre',
    encabezado: 'Cliente',
    accessor: (c) => (
      <div className="clientes__tabla-nombre">
        <strong>{nombreCompleto(c.nombre, c.apellido)}</strong>
        {c.razon_social && <span className="clientes__tabla-razon">{c.razon_social}</span>}
        {!c.usuario_id && <span className="clientes__tabla-sin-cuenta">Sin cuenta de portal</span>}
      </div>
    ),
  },
  {
    id: 'documento',
    encabezado: 'Documento',
    accessor: (c) => (
      <span className="clientes__tabla-documento">
        {c.tipo_documento}-{c.numero_documento}
      </span>
    ),
  },
  {
    id: 'tipo',
    encabezado: 'Tipo',
    accessor: (c) => (
      <EtiquetaEstado
        etiqueta={ETIQUETA_TIPO[c.tipo_cliente] ?? c.tipo_cliente}
        variante={c.tipo_cliente === 'juridico' ? 'info' : 'neutro'}
      />
    ),
  },
  {
    id: 'ubicacion',
    encabezado: 'Ubicación',
    accessor: (c) => (
      <span className="clientes__tabla-ubicacion">
        {c.ciudad && c.estado ? `${c.ciudad}, ${c.estado}` : '—'}
      </span>
    ),
  },
  {
    id: 'puntos',
    encabezado: 'Puntos',
    accessor: (c) => {
      const n = c.puntos_recogida?.length ?? 0;
      return n > 0 ? `${n} punto${n === 1 ? '' : 's'}` : '—';
    },
  },
  {
    id: 'telefono',
    encabezado: 'Teléfono',
    accessor: (c) => c.telefono ?? '—',
  },
];
