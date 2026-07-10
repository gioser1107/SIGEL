import { useCallback, useEffect, useState } from 'react';
import { TablaDatos, BotonAccionTabla, PaginacionTabla } from '../../../../components/admin';
import Boton from '../../../../components/ui/Boton/Boton';
import { usePaginacionListado } from '../../../../hooks/usePaginacionListado';
import { listarBancos } from '../../../../services/bancos';
import type { Banco } from '../../../../types/pagos';
import type { PropsSeccionPagos } from '../types';
import { mensajeError } from '../utils/mensajeError';
import PanelCrearBanco from './CrearBanco/PanelCrearBanco';
import PanelEditarBanco from './EditarBanco/PanelEditarBanco';
import ModalEliminarBanco from './EliminarBanco/ModalEliminarBanco';
import { columnasBancos } from './components/columnasBancos';

export default function Bancos({
  activo,
  puedeCrear,
  puedeEditar,
  puedeBorrar,
  onExito,
  onError,
}: PropsSeccionPagos) {
  const [datos, setDatos] = useState<Banco[]>([]);
  const [cargando, setCargando] = useState(false);
  const [panelCrearAbierto, setPanelCrearAbierto] = useState(false);
  const [panelEditarAbierto, setPanelEditarAbierto] = useState(false);
  const [bancoActivo, setBancoActivo] = useState<Banco | null>(null);
  const [bancoAEliminar, setBancoAEliminar] = useState<Banco | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, limite } = usePaginacionListado();

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarBancos({ pagina, limite });
      setDatos(respuesta.items);
      setTotal(respuesta.total);
    } catch (err) {
      onError(mensajeError(err, 'bancos'));
    } finally {
      setCargando(false);
    }
  }, [onError, pagina, limite, setTotal]);

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
            + Nuevo banco
          </Boton>
        )}
      </div>

      <TablaDatos
        columnas={columnasBancos}
        datos={datos}
        cargando={cargando}
        mensajeVacio="No hay bancos registrados."
        idFila={(b) => b.id}
        onFilaClick={puedeEditar ? (b) => { setBancoActivo(b); setPanelEditarAbierto(true); } : undefined}
        accionesFila={
          hayAcciones
            ? (b) => (
                <>
                  {puedeEditar && (
                    <BotonAccionTabla
                      accion="editar"
                      onClick={(e) => { e.stopPropagation(); setBancoActivo(b); setPanelEditarAbierto(true); }}
                    />
                  )}
                  {puedeBorrar && (
                    <BotonAccionTabla
                      accion="eliminar"
                      onClick={(e) => { e.stopPropagation(); setBancoAEliminar(b); }}
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

      <PanelCrearBanco
        abierto={panelCrearAbierto}
        onCerrar={() => setPanelCrearAbierto(false)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <PanelEditarBanco
        abierto={panelEditarAbierto}
        banco={bancoActivo}
        onCerrar={() => { setPanelEditarAbierto(false); setBancoActivo(null); }}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
      />

      <ModalEliminarBanco
        abierto={Boolean(bancoAEliminar)}
        banco={bancoAEliminar}
        onCerrar={() => setBancoAEliminar(null)}
        onExito={onExito}
        onError={onError}
        onRecargar={recargar}
        onCerrarEdicion={() => {
          if (bancoActivo?.id === bancoAEliminar?.id) {
            setPanelEditarAbierto(false);
            setBancoActivo(null);
          }
        }}
      />
    </>
  );
}
