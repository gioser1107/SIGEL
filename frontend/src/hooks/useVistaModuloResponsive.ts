import { useEffect, useRef, useState } from 'react';
import type { VistaModulo } from '../components/admin';

const QUERY_MOVIL = '(max-width: 640px)';

/**
 * Devuelve vista='tarjetas' en pantallas ≤640 px y 'tabla' en el resto.
 * El usuario puede sobreescribir la vista con setVista.
 */
export function useVistaModuloResponsive(): [VistaModulo, (vista: VistaModulo) => void] {
  // Siempre empieza en 'tabla' para que el orden de hooks sea estable en SSR/HMR
  const [vista, setVista] = useState<VistaModulo>('tabla');
  // Rastrea si el usuario cambió la vista manualmente
  const manualRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia(QUERY_MOVIL);

    function sincronizar(esMovil: boolean) {
      if (manualRef.current) return; // respeta la elección del usuario
      setVista(esMovil ? 'tarjetas' : 'tabla');
    }

    sincronizar(media.matches);

    function handleChange(e: MediaQueryListEvent) {
      manualRef.current = false; // si cambia el tamaño, vuelve a auto
      sincronizar(e.matches);
    }

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  function setVistaManual(v: VistaModulo) {
    manualRef.current = true;
    setVista(v);
  }

  return [vista, setVistaManual];
}
