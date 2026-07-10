import { useMemo } from 'react';
import type { Permiso } from '../../../../types/seguridad';
import {
  ACCIONES_PERMISO,
  agruparPermisosPorModulo,
  etiquetaAccion,
} from '../../../../utils/permisosModulos';
import './MatrizPermisosRol.css';

interface MatrizPermisosRolProps {
  permisos: Permiso[];
  seleccionados: Set<number>;
  onAlternar: (permisoId: number) => void;
}

export default function MatrizPermisosRol({
  permisos,
  seleccionados,
  onAlternar,
}: MatrizPermisosRolProps) {
  const { filas, sueltos } = useMemo(
    () => agruparPermisosPorModulo(permisos),
    [permisos]
  );

  if (permisos.length === 0) {
    return <p className="drawer-form__intro">No hay permisos disponibles.</p>;
  }

  return (
    <div className="seguridad__matriz-permisos">
      <div className="seguridad__matriz-contenedor">
        <table className="seguridad__matriz">
          <thead>
            <tr>
              <th className="seguridad__matriz-th seguridad__matriz-th--modulo">Módulo</th>
              {ACCIONES_PERMISO.map((accion) => (
                <th key={accion} className="seguridad__matriz-th seguridad__matriz-th--accion">
                  {etiquetaAccion(accion)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.modulo} className="seguridad__matriz-fila">
                <td className="seguridad__matriz-celda seguridad__matriz-celda--modulo">
                  {fila.etiqueta}
                </td>
                {ACCIONES_PERMISO.map((accion) => {
                  const permiso = fila.celdas[accion];
                  return (
                    <td key={accion} className="seguridad__matriz-celda seguridad__matriz-celda--accion">
                      {permiso ? (
                        <label className="seguridad__matriz-casilla" title={permiso.descripcion}>
                          <input
                            type="checkbox"
                            checked={seleccionados.has(permiso.id)}
                            onChange={() => onAlternar(permiso.id)}
                            aria-label={`${fila.etiqueta} — ${etiquetaAccion(accion)}`}
                          />
                        </label>
                      ) : (
                        <span className="seguridad__matriz-vacio" aria-hidden="true">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sueltos.length > 0 && (
        <div className="seguridad__permisos-sueltos">
          <p className="cot-drawer__acciones-titulo">Otros permisos</p>
          <div className="seguridad__permisos-lista">
            {sueltos.map((p) => (
              <label key={p.id} className="seguridad__permiso-item">
                <input
                  type="checkbox"
                  checked={seleccionados.has(p.id)}
                  onChange={() => onAlternar(p.id)}
                />
                <span className="seguridad__permiso-nombre">{p.descripcion}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
