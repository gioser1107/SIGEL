import { EtiquetaEstado } from '../../../../components/admin';
import type { Columna } from '../../../../components/admin';
import type { EntradaBitacora } from '../../../../types/bitacora';
import { ETIQUETA_ACCION, ETIQUETA_MODULO } from '../constants';
import {
  etiquetaUsuario,
  formatFechaHora,
  resolverVarianteAccion,
} from '../utils/formatearBitacora';

// Construye la definición de columnas de la tabla de bitácora (sin columna IP)
export function columnasBitacora(): Columna<EntradaBitacora>[] {
  return [
    {
      id: 'creado_en',
      encabezado: 'Fecha / Hora',
      accessor: (fila) => (
        <span className="bit-tabla__fecha">{formatFechaHora(fila.creado_en)}</span>
      ),
      ordenable: false,
      ancho: '150px',
    },
    {
      id: 'modulo',
      encabezado: 'Módulo',
      accessor: (fila) => (
        <EtiquetaEstado
          etiqueta={ETIQUETA_MODULO[fila.modulo] ?? fila.modulo}
          variante="info"
        />
      ),
      ancho: '130px',
    },
    {
      id: 'accion',
      encabezado: 'Acción',
      accessor: (fila) => (
        <EtiquetaEstado
          etiqueta={ETIQUETA_ACCION[fila.accion] ?? fila.accion}
          variante={resolverVarianteAccion(fila.accion)}
        />
      ),
      ancho: '140px',
    },
    {
      id: 'tabla_afectada',
      encabezado: 'Tabla',
      accessor: (fila) => (
        <span className="bit-tabla__texto-secundario">
          {fila.tabla_afectada ?? '—'}
        </span>
      ),
      ancho: '140px',
    },
    {
      id: 'registro_id',
      encabezado: 'Registro',
      accessor: (fila) => (
        <span className="bit-tabla__texto-secundario">
          {fila.registro_id ?? '—'}
        </span>
      ),
      ancho: '90px',
    },
    {
      id: 'resumen',
      encabezado: 'Resumen',
      accessor: (fila) => (
        <span className="bit-tabla__resumen" title={fila.resumen}>
          {fila.resumen}
        </span>
      ),
    },
    {
      id: 'usuario',
      encabezado: 'Usuario',
      accessor: (fila) => (
        <span className="bit-tabla__usuario-nombre">{etiquetaUsuario(fila)}</span>
      ),
      ancho: '160px',
    },
  ];
}
