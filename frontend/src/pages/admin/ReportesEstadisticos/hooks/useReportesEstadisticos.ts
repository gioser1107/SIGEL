import { useCallback, useEffect, useState } from 'react';
import { ErrorApi } from '../../../../services/api';
import { obtenerReporteEstadistico } from '../../../../services/reportesEstadisticos';
import type { ReporteEstadistico } from '../../../../types/reportesEstadisticos';

import { esFechaFutura, fechaHoyIso, MENSAJE_FECHA_NO_FUTURA } from '../../../../utils/validacionesFormulario';

function isoHoy(): string {
  return fechaHoyIso();
}

function isoInicioAnio(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function isoInicioMes(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-01`;
}

export function useReportesEstadisticos() {
  const [desde, setDesde] = useState(isoInicioAnio);
  const [hasta, setHasta] = useState(isoHoy);
  const [reporte, setReporte] = useState<ReporteEstadistico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(async (fechaDesde: string, fechaHasta: string) => {
    if (esFechaFutura(fechaDesde) || esFechaFutura(fechaHasta)) {
      setError(MENSAJE_FECHA_NO_FUTURA);
      setReporte(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerReporteEstadistico(fechaDesde, fechaHasta);
      setReporte(data);
    } catch (err) {
      setReporte(null);
      setError(
        err instanceof ErrorApi || err instanceof Error
          ? err.message
          : 'No se pudo cargar el reporte estadístico.',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void consultar(isoInicioAnio(), isoHoy());
  }, [consultar]);

  function aplicarConsulta() {
    void consultar(desde, hasta);
  }

  function aplicarAtajo(tipo: 'anio' | 'mes' | 'hoy') {
    const nuevoDesde = tipo === 'anio' ? isoInicioAnio() : tipo === 'mes' ? isoInicioMes() : isoHoy();
    const nuevoHasta = isoHoy();
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    void consultar(nuevoDesde, nuevoHasta);
  }

  return {
    desde,
    hasta,
    setDesde,
    setHasta,
    reporte,
    cargando,
    error,
    aplicarConsulta,
    aplicarAtajo,
  };
}
