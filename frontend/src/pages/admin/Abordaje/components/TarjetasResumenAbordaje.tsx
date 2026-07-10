import type { ResumenAbordaje } from '../../../../types/abordaje';

interface PropsTarjetasResumenAbordaje {
  resumen: ResumenAbordaje;
}

export default function TarjetasResumenAbordaje({ resumen }: PropsTarjetasResumenAbordaje) {
  const tarjetas = [
    { id: 'total', etiqueta: 'Pasajeros', valor: resumen.total_pasajeros, clase: 'abordaje-resumen__tarjeta--total' },
    { id: 'pendientes', etiqueta: 'Pendientes', valor: resumen.pendientes, clase: 'abordaje-resumen__tarjeta--pendiente' },
    { id: 'abordados', etiqueta: 'Abordados', valor: resumen.abordados, clase: 'abordaje-resumen__tarjeta--abordado' },
    { id: 'no_presentados', etiqueta: 'No presentados', valor: resumen.no_presentados, clase: 'abordaje-resumen__tarjeta--ausente' },
  ];

  return (
    <div className="abordaje-resumen">
      {tarjetas.map((t) => (
        <article key={t.id} className={`abordaje-resumen__tarjeta ${t.clase}`}>
          <span className="abordaje-resumen__valor">{t.valor}</span>
          <span className="abordaje-resumen__etiqueta">{t.etiqueta}</span>
        </article>
      ))}
    </div>
  );
}
