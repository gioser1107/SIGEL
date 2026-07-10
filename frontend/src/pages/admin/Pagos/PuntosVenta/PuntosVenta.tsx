import { useCallback, useEffect, useState } from 'react';
import { TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import { listarBancosParaSelect } from '../../../../services/bancos';
import { listarPuntosVenta } from '../../../../services/puntosVenta';
import type { Banco, PuntoVenta } from '../../../../types/pagos';
import type { PropsSeccionPagos } from '../types';
import { mensajeError } from '../utils/mensajeError';
import PanelCrearPuntoVenta from './CrearPuntoVenta/PanelCrearPuntoVenta';
import PanelEditarPuntoVenta from './EditarPuntoVenta/PanelEditarPuntoVenta';
import ModalEliminarPuntoVenta from './EliminarPuntoVenta/ModalEliminarPuntoVenta';
import { columnasPuntosVenta } from './components/columnasPuntosVenta';

export default function PuntosVenta({
  activo,
  puedeCrear,
  puedeEditar,
  puedeBorrar,
  onExito,
  onError,
}: PropsSeccionPagos) {
  const [datos, setDatos] = useState<PuntoVenta[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtroBanco, setFiltroBanco] = useState('');
  const [panelCrearAbierto, setPanelCrearAbierto] = useState(false);
  const [panelEditarAbierto, setPanelEditarAbierto] = useState(false);
  const [puntoVentaActivo, setPuntoVentaActivo] = useState<PuntoVenta | null>(null);
  const [puntoVentaAEliminar, setPuntoVentaAEliminar] = useState<PuntoVenta | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [puntos, bancosData] = await Promise.all([
        listarPuntosVenta({
          ...(filtroBanco ? { banco_id: Number(filtroBanco) } : {}),
          pagina,
          limite,
        }),
        listarBancosParaSelect(),
      ]);
      setDatos(puntos.items);
      setTotal(puntos.total);
      setBancos(bancosData);
    } catch (err) {
      onError(mensajeError(err, 'puntos de venta'));
    } finally {
      setCargando(false);
    }
  }, [filtroBanco, onError, pagina, limite, setTotal]);

  useEffect(() => {
    if (activo) recargar();
  }, [activo, recargar]);

  const hayAcciones = puedeEditar || puedeBorrar;
  if (!activo) return null;

  return (
    <>
      <div className="pagos-admin__toolbar">
        {puedeCrear && (
          <Boton variante="primario" tamano="sm" onClick={() => setPanelCrearAbierto(true)}>
            + Nuevo TPV
          </Boton>
        )}
        <select
          className="drawer-form__input pagos-admin__filtro-select"
          value={filtroBanco}
          onChange={(e) => { setFiltroBanco(e.target.value); reiniciarPagina(); }}
          aria-label="Filtrar por banco"
        >
          <option value="">Todos los bancos</option>
          {bancos.map((b) => (
            <option key={b.id} value={b.id}>{b.codigo} — {b.nombre}</option>
          ))}
        </select>
      </div>

      <TablaDatos
        columnas={columnasPuntosVenta}
        datos={datos}
        cargando={cargando}
        mensajeVacio="No hay puntos de venta registrados."
        idFila={(p) => p.id}
        onFilaClick={puedeEditar ? (p) => { setPuntoVentaActivo(p); setPanelEditarAbierto(true); } : undefined}
        accionesFila={
          hayAcciones
            ? (p) => (
                <>
                  {puedeEditar && (
                    <BotonAccionTabla
                      accion="editar"
                      onClick={(e) => { e.stopPropagation(); setPuntoVentaActivo(p); setPanelEditarAbierto(true); }}
                    />
                  )}
                  {puedeBorrar && (
                    <BotonAccionTabla
                      accion="eliminar"
                      onClick={(e) => { e.stopPropagation(); setPuntoVentaAEliminar(p); }}
                    />
                  )}
                </>
              )
            : undefined
        }
      />

      <PaginacionTabla
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        limite={limite}
        onPaginaChange={irPagina}
      />

      <PanelCrearPuntoVenta
        abierto={panelCrearAbierto}
        bancos={bancos}
        onCerrar={() => setPanelCrearAbierto(false)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <PanelEditarPuntoVenta
        abierto={panelEditarAbierto}
        puntoVenta={puntoVentaActivo}
        bancos={bancos}
        onCerrar={() => { setPanelEditarAbierto(false); setPuntoVentaActivo(null); }}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <ModalEliminarPuntoVenta
        abierto={Boolean(puntoVentaAEliminar)}
        puntoVenta={puntoVentaAEliminar}
        onCerrar={() => setPuntoVentaAEliminar(null)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
        onCerrarEdicion={() => {
          if (puntoVentaActivo?.id === puntoVentaAEliminar?.id) {
            setPanelEditarAbierto(false);
            setPuntoVentaActivo(null);
          }
        }}
      />
    </>
  );
}
