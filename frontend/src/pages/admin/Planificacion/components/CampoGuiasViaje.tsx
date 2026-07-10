import SelectBuscadorMulti from './SelectBuscadorMulti';

interface PropsCampoGuiasViaje {
  guiasIds: number[];
  guiaPrincipalId: number | null;
  guiasOpciones: { id: number; etiqueta: string }[];
  cargando?: boolean;
  onChange: (guiasIds: number[], guiaPrincipalId: number | null) => void;
}

export default function CampoGuiasViaje({
  guiasIds,
  guiaPrincipalId,
  guiasOpciones,
  cargando = false,
  onChange,
}: PropsCampoGuiasViaje) {
  const seleccionados = guiasOpciones.filter((g) => guiasIds.includes(g.id));
  const mostrarPrincipal = guiasIds.length > 1;

  function actualizarGuias(nuevos: number[]) {
    let principal = guiaPrincipalId;
    if (nuevos.length === 0) {
      principal = null;
    } else if (nuevos.length === 1) {
      principal = nuevos[0];
    } else if (principal != null && !nuevos.includes(principal)) {
      principal = null;
    }
    onChange(nuevos, principal);
  }

  return (
    <div className="plan-guias-campo">
      <div className="drawer-form__campo">
        <span className="drawer-form__label">Guías asignados</span>
        <p className="plan-guias-campo__ayuda">
          Busca y selecciona uno o varios guías. Si hay más de uno, indica cuál es el principal.
        </p>
        {cargando ? (
          <p className="plan-guias-campo__cargando">Cargando guías…</p>
        ) : guiasOpciones.length === 0 ? (
          <p className="plan-guias-campo__vacio">No hay guías disponibles para asignar.</p>
        ) : (
          <SelectBuscadorMulti
            opciones={guiasOpciones.map((g) => ({
              id: g.id,
              etiqueta: g.etiqueta,
              busqueda: g.etiqueta,
            }))}
            valoresSeleccionados={guiasIds}
            onChange={actualizarGuias}
            placeholder="Buscar guía por nombre…"
            deshabilitado={cargando}
          />
        )}
      </div>

      {mostrarPrincipal && (
        <div className="drawer-form__campo">
          <label className="drawer-form__label" htmlFor="select-guia-principal">
            Guía principal <span className="drawer-form__req">*</span>
          </label>
          <select
            id="select-guia-principal"
            className="drawer-form__input"
            value={guiaPrincipalId ?? ''}
            disabled={cargando}
            onChange={(e) =>
              onChange(guiasIds, e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Selecciona el guía principal</option>
            {seleccionados.map((g) => (
              <option key={g.id} value={g.id}>
                {g.etiqueta}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
