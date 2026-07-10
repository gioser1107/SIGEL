import Boton from '../../ui/Boton/Boton';
import './PaginacionTabla.css';

interface PropsPaginacionTabla {
  pagina: number;
  totalPaginas: number;
  total: number;
  limite?: number;
  onPaginaChange: (pagina: number) => void;
}

export default function PaginacionTabla({
  pagina,
  totalPaginas,
  total,
  limite = 10,
  onPaginaChange,
}: PropsPaginacionTabla) {
  if (total <= 0) return null;

  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);

  return (
    <div className="paginacion-tabla">
      <span className="paginacion-tabla__info">
        Mostrando {desde}–{hasta} de {total} · Página {pagina} de {totalPaginas}
      </span>
      <div className="paginacion-tabla__botones">
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
        >
          Anterior
        </Boton>
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
        >
          Siguiente
        </Boton>
      </div>
    </div>
  );
}
