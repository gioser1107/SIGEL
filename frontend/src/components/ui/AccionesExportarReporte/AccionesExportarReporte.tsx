import { useState } from 'react';
import BtnImprimirReporte from '../BtnImprimirReporte/BtnImprimirReporte';
import Boton from '../Boton/Boton';
import './AccionesExportarReporte.css';

interface AccionesExportarReporteProps {
  deshabilitado?: boolean;
  claseZona?: string;
  alExportarExcel: () => void;
}

function IconoExcel() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

export default function AccionesExportarReporte({
  deshabilitado = false,
  claseZona,
  alExportarExcel,
}: AccionesExportarReporteProps) {
  const [exportando, setExportando] = useState(false);

  function manejarExcel() {
    if (deshabilitado || exportando) return;
    setExportando(true);
    try {
      alExportarExcel();
    } catch {
      window.alert('No se pudo generar el Excel. Intenta de nuevo.');
    } finally {
      window.setTimeout(() => setExportando(false), 0);
    }
  }

  return (
    <div className="acciones-exportar-reporte no-imprimir">
      <BtnImprimirReporte
        etiqueta="Exportar PDF"
        claseZona={claseZona}
        deshabilitado={deshabilitado}
      />
      <Boton
        type="button"
        variante="secundario"
        tamano="sm"
        className="acciones-exportar-reporte__excel"
        onClick={manejarExcel}
        disabled={deshabilitado || exportando}
        aria-label="Exportar Excel"
      >
        <IconoExcel />
        Exportar Excel
      </Boton>
    </div>
  );
}
