import { useEffect, useRef, useState } from 'react';
import type { VistaModulo } from '../components/admin';

const QUERY_MOVIL = '(max-width: 640px)';

export function useVistaModuloResponsive(): [VistaModulo, (vista: VistaModulo) => void] {
  const [vista, setVista] = useState<VistaModulo>('tabla');
  const manualRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia(QUERY_MOVIL);

    function sincronizar(esMovil: boolean) {
      if (manualRef.current) return;
      setVista(esMovil ? 'tarjetas' : 'tabla');
    }

    sincronizar(media.matches);

    function alCambiarTamano(e: MediaQueryListEvent) {
      manualRef.current = false;
      sincronizar(e.matches);
    }

    media.addEventListener('change', alCambiarTamano);
    return () => media.removeEventListener('change', alCambiarTamano);
  }, []);

  function setVistaManual(v: VistaModulo) {
    manualRef.current = true;
    setVista(v);
  }

  return [vista, setVistaManual];
}
