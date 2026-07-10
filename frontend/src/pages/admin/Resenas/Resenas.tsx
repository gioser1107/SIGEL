import { useCallback, useEffect, useMemo, useState } from 'react';
import { CabeceraModulo, EtiquetaEstado, TablaDatos, BotonAccionTabla } from '../../../components/admin';
import type { Columna } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import useAutenticacion from '../../../hooks/useAutenticacion';
import {
  alternarVisibilidadResena,
  eliminarResena,
  listarResenasAdmin,
} from '../../../services/resenas';
import type { Resena } from '../../../types/resenas';
import './Resenas.css';

const MODULO = 'resenas';

function truncar(texto: string | null, max = 80): string {
  if (!texto) return '—';
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ModuloResenas() {
  const { puedeEditar, puedeBorrar } = useAutenticacion();
  const puedeModerar = puedeEditar(MODULO);
  const puedeEliminar = puedeBorrar(MODULO);

  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [resenaAEliminar, setResenaAEliminar] = useState<Resena | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setResenas(await listarResenasAdmin());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reseñas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const manejarAlternarVisibilidad = async (resena: Resena) => {
    setError(null);
    setExito(null);
    try {
      const respuesta = await alternarVisibilidadResena(resena.id);
      setResenas((prev) =>
        prev.map((r) => (r.id === resena.id ? respuesta.resena : r))
      );
      setExito(
        respuesta.resena.publico
          ? 'Reseña visible en la landing'
          : 'Reseña oculta de la landing'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la visibilidad');
    }
  };

  const confirmarEliminar = async () => {
    if (!resenaAEliminar) return;
    setEliminando(true);
    setError(null);
    setExito(null);
    try {
      await eliminarResena(resenaAEliminar.id);
      setResenas((prev) => prev.filter((r) => r.id !== resenaAEliminar.id));
      setExito('Reseña eliminada');
      setResenaAEliminar(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la reseña');
    } finally {
      setEliminando(false);
    }
  };

  const columnas: Columna<Resena>[] = useMemo(
    () => [
      {
        id: 'cliente',
        encabezado: 'Cliente',
        accessor: (r) => <strong>{r.nombre_cliente}</strong>,
      },
      {
        id: 'destino',
        encabezado: 'Destino',
        accessor: (r) => r.destino_titulo,
      },
      {
        id: 'calificacion',
        encabezado: 'Calificación',
        accessor: (r) => (
          <span className="resenas-admin__calificacion">
            {'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}
            <span className="resenas-admin__nota">{r.calificacion}/5</span>
          </span>
        ),
      },
      {
        id: 'comentario',
        encabezado: 'Comentario',
        accessor: (r) => <span title={r.comentario ?? undefined}>{truncar(r.comentario)}</span>,
      },
      {
        id: 'visible',
        encabezado: 'Visible',
        accessor: (r) => (
          <EtiquetaEstado
            etiqueta={r.publico ? 'Pública' : 'Privada'}
            variante={r.publico ? 'exito' : 'neutro'}
          />
        ),
      },
      {
        id: 'fecha',
        encabezado: 'Fecha',
        accessor: (r) => formatearFecha(r.creado_en),
      },
    ],
    []
  );

  const hayAcciones = puedeModerar || puedeEliminar;

  return (
    <div className="resenas-admin">
      <CabeceraModulo
        migaja="Administración"
        titulo="Moderación de reseñas"
        contador={resenas.length}
        descripcion="Consulta, oculta o elimina reseñas de clientes. No se puede editar el texto."
      />

      {error && <div className="resenas-admin__alerta resenas-admin__alerta--error">{error}</div>}
      {exito && <div className="resenas-admin__alerta resenas-admin__alerta--exito">{exito}</div>}

      <TablaDatos
        columnas={columnas}
        datos={resenas}
        cargando={cargando}
        mensajeVacio="No hay reseñas registradas."
        idFila={(r) => r.id}
        accionesFila={
          hayAcciones
            ? (r) => (
                <>
                  {puedeModerar && (
                    <BotonAccionTabla
                      accion={r.publico ? 'ocultar' : 'mostrar'}
                      onClick={(e) => {
                        e.stopPropagation();
                        manejarAlternarVisibilidad(r);
                      }}
                    />
                  )}
                  {puedeEliminar && (
                    <BotonAccionTabla
                      accion="eliminar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResenaAEliminar(r);
                      }}
                    />
                  )}
                </>
              )
            : undefined
        }
      />

      {resenaAEliminar && (
        <div className="resenas-admin__modal-overlay" role="dialog" aria-modal="true">
          <div className="resenas-admin__modal">
            <h3>¿Eliminar reseña?</h3>
            <p>
              Se eliminará la reseña de <strong>{resenaAEliminar.nombre_cliente}</strong> sobre{' '}
              <strong>{resenaAEliminar.destino_titulo}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="resenas-admin__modal-acciones">
              <Boton
                variante="secundario"
                tamano="sm"
                onClick={() => setResenaAEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </Boton>
              <Boton variante="primario" tamano="sm" onClick={confirmarEliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
