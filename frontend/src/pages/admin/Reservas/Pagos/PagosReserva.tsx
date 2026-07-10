import useAutenticacion from '../../../../hooks/useAutenticacion';

import ResumenPagosReservaCard from './components/ResumenPagosReserva';

import TablaPagosReserva from './components/TablaPagosReserva';

import { MODULO_PAGOS } from './constants';

import usePagosReserva from './hooks/usePagosReserva';

import PanelRegistrarPago from './RegistrarPago/PanelRegistrarPago';

import './PagosReserva.css';



interface PagosReservaProps {

  reservaId: number;

  activo?: boolean;

  mostrarFormulario?: boolean;

}



export default function PagosReserva({

  reservaId,

  activo = true,

  mostrarFormulario = true,

}: PagosReservaProps) {

  const { puedeLeer, puedeCrear, puedeEditar, puedeBorrar } = useAutenticacion();

  const puedeLeerPagos = puedeLeer(MODULO_PAGOS);



  const {

    catalogo,

    resumen,

    pagos,

    tasaDelDia,

    sinTasa,

    tasaNoEsDelDia,

    cargando,

    error,

    recargar,

    setError,

  } = usePagosReserva({

    reservaId,

    activo,

    puedeLeer: puedeLeerPagos,

  });



  const tasaValor =

    tasaDelDia?.valor ?? catalogo?.tasa_eur_reciente?.valor ?? undefined;



  if (!puedeLeerPagos) {

    return <p className="pagos-reserva__sin-permiso">No tienes permiso para ver los pagos.</p>;

  }



  return (

    <div className="pagos-reserva">

      {error && (

        <div className="pagos-reserva__error" role="alert">

          {error}

          <button type="button" className="pagos-reserva__error-cerrar" onClick={() => setError(null)}>

            Cerrar

          </button>

        </div>

      )}



      {cargando && !resumen && <p className="pagos-reserva__cargando">Cargando pagos…</p>}



      {resumen && <ResumenPagosReservaCard resumen={resumen} tasaValor={tasaValor} />}



      {mostrarFormulario && puedeCrear(MODULO_PAGOS) && catalogo && resumen && (

        <PanelRegistrarPago

          reservaId={reservaId}

          catalogo={catalogo}

          resumen={resumen}

          tasaDelDia={tasaDelDia}

          sinTasa={sinTasa}

          tasaNoEsDelDia={tasaNoEsDelDia}

          onRegistrado={recargar}

          onError={setError}

        />

      )}



      <h4 className="pagos-reserva__seccion-titulo">Pagos registrados</h4>

      <TablaPagosReserva

        reservaId={reservaId}

        pagos={pagos}

        cargando={cargando}

        puedeEditar={puedeEditar(MODULO_PAGOS)}

        puedeBorrar={puedeBorrar(MODULO_PAGOS)}

        onActualizado={recargar}

        onError={setError}

      />

    </div>

  );

}


