import { useMemo, useState } from 'react';
import { CabeceraModulo } from '../../../components/admin';
import useAutenticacion from '../../../hooks/useAutenticacion';
import BandejaPagos from './Bandeja/BandejaPagos';
import Bancos from './Bancos/Bancos';
import MetodosPago from './MetodosPago/MetodosPago';
import Monedas from './Monedas/Monedas';
import NavLateralPagos from './components/NavLateralPagos';
import PuntosVenta from './PuntosVenta/PuntosVenta';
import Tasas from './Tasas/Tasas';
import { MODULO, metaSeccionPagos } from './constants';
import type { SeccionPagos } from './types';
import '../Cotizaciones/Cotizaciones.css';
import './ModuloPagos.css';

export default function ModuloPagos() {
  const { puedeLeer, puedeCrear, puedeEditar, puedeBorrar } = useAutenticacion();
  const [seccion, setSeccion] = useState<SeccionPagos>('bandeja');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const puedeLeerPagos = puedeLeer(MODULO);
  const puedeCrearPagos = puedeCrear(MODULO);
  const puedeEditarPagos = puedeEditar(MODULO);
  const puedeBorrarPagos = puedeBorrar(MODULO);

  const meta = metaSeccionPagos(seccion);

  const propsSeccion = useMemo(
    () => ({
      puedeCrear: puedeCrearPagos,
      puedeEditar: puedeEditarPagos,
      puedeBorrar: puedeBorrarPagos,
      onExito: (mensaje: string) => {
        setExito(mensaje);
        setError(null);
      },
      onError: (mensaje: string) => {
        setError(mensaje);
        setExito(null);
      },
    }),
    [puedeCrearPagos, puedeEditarPagos, puedeBorrarPagos]
  );

  if (!puedeLeerPagos) {
    return (
      <div className="pagos-admin">
        <CabeceraModulo
          migaja="TravelBqto / Admin"
          titulo="Pagos"
          descripcion="No tienes permiso para acceder al módulo de pagos."
        />
      </div>
    );
  }

  return (
    <div className="pagos-admin">
      <CabeceraModulo
        migaja="TravelBqto / Admin"
        titulo="Pagos"
        descripcion="Validación de pagos y configuración de catálogos financieros."
      />

      {error && <div className="cotizaciones__error" role="alert">{error}</div>}
      {exito && <div className="pagos-admin__alerta-exito" role="status">{exito}</div>}

      <div className="pagos-admin__layout">
        <NavLateralPagos seccion={seccion} onChange={setSeccion} />

        <main className="pagos-admin__contenido">
          <header className="pagos-admin__seccion-cabecera">
            <h2 className="pagos-admin__seccion-titulo">{meta.titulo}</h2>
            <p className="pagos-admin__seccion-desc">{meta.descripcion}</p>
          </header>

          <BandejaPagos activo={seccion === 'bandeja'} {...propsSeccion} />
          <Monedas activo={seccion === 'monedas'} {...propsSeccion} />
          <MetodosPago activo={seccion === 'metodos'} {...propsSeccion} />
          <Tasas activo={seccion === 'tasas'} {...propsSeccion} />
          <Bancos activo={seccion === 'bancos'} {...propsSeccion} />
          <PuntosVenta activo={seccion === 'puntos_venta'} {...propsSeccion} />
        </main>
      </div>
    </div>
  );
}
