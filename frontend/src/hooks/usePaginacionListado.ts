import { useCallback, useState } from 'react';
import { LIMITE_PAGINA_DEFAULT } from '../types/paginacion';
import { totalPaginas as calcularTotalPaginas } from '../utils/paginacionApi';

export function usePaginacionListado(limite = LIMITE_PAGINA_DEFAULT) {
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPaginas = calcularTotalPaginas(total, limite);

  const irPagina = useCallback(
    (nuevaPagina: number) => {
      setPagina(() => {
        const max = calcularTotalPaginas(total, limite);
        return Math.max(1, Math.min(max || 1, nuevaPagina));
      });
    },
    [total, limite],
  );

  const reiniciarPagina = useCallback(() => setPagina(1), []);

  return {
    pagina,
    setPagina,
    total,
    setTotal,
    totalPaginas,
    irPagina,
    reiniciarPagina,
    limite,
  };
}
