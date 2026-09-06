import { useEffect, useMemo, useState } from 'react';
import { obtenerCotizaciones } from '../services/cotizaciones';
import { obtenerViajes } from '../services/viajes';
import { LIMITE_PAGINA_MAX } from '../types/paginacion';
import type { Cotizacion } from '../types/cotizacion';
import type { Viaje } from '../types/viaje';

const DIAS_PROXIMOS = 7;
const LIMITE_LISTA = 5;

export interface DashboardAdminData {
  viajesActivos: number;
  cotizacionesPendientes: number;
  proximasSalidas: number;
  montoCotizacionesActivas: number;
  proximosViajes: Viaje[];
  cotizacionesRecientes: Cotizacion[];
  destinosTop: { nombre: string; total: number }[];
  cargando: boolean;
  error: string | null;
}

function calcularDestinosTop(cotizaciones: Cotizacion[], limite: number) {
  const conteo: Record<string, number> = {};
  for (const c of cotizaciones) {
    const nombre = c.destino_nombre?.trim() || 'Destino no asignado';
    conteo[nombre] = (conteo[nombre] ?? 0) + 1;
  }
  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([nombre, total]) => ({ nombre, total }));
}

export function useDashboardAdmin(): DashboardAdminData {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const [v, c] = await Promise.all([
          obtenerViajes({ pagina: 1, limite: LIMITE_PAGINA_MAX }),
          obtenerCotizaciones({ pagina: 1, limite: LIMITE_PAGINA_MAX }),
        ]);
        if (!activo) return;
        setViajes(v.items);
        setCotizaciones(c.items);
        setError(null);
      } catch (e) {
        if (!activo) return;
        setError(e instanceof Error ? e.message : 'Error al cargar dashboard');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => { activo = false; };
  }, []);

  const proximosFiltrados = useMemo(() => {
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() + DIAS_PROXIMOS);
    fin.setHours(23, 59, 59, 999);

    return viajes
      .filter((v) => {
        const fecha = new Date(v.fecha_salida);
        return fecha >= hoy && fecha <= fin;
      })
      .sort((a, b) => new Date(a.fecha_salida).getTime() - new Date(b.fecha_salida).getTime());
  }, [viajes]);

  const viajesActivos = viajes.filter((v) =>
    v.estado === 'planificado' || v.estado === 'en_curso',
  ).length;

  const cotizacionesPendientes = cotizaciones.filter((c) =>
    c.estado === 'solicitada' || c.estado === 'pendiente',
  ).length;

  const montoCotizacionesActivas = cotizaciones
    .filter((c) => ['solicitada', 'pendiente', 'aceptada'].includes(c.estado))
    .reduce((s, c) => s + (c.precio_cotizado_eur ?? 0), 0);

  const cotizacionesRecientes = [...cotizaciones]
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
    .slice(0, LIMITE_LISTA);

  const destinosTop = calcularDestinosTop(cotizaciones, LIMITE_LISTA);

  return {
    viajesActivos,
    cotizacionesPendientes,
    proximasSalidas: proximosFiltrados.length,
    montoCotizacionesActivas,
    proximosViajes: proximosFiltrados.slice(0, LIMITE_LISTA),
    cotizacionesRecientes,
    destinosTop,
    cargando,
    error,
  };
}
