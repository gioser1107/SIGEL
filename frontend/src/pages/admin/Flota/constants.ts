import type { DatosUnidadCrear } from '../../../types/unidad';
import { validarFormularioUnidad } from '../../../utils/validacionesFormulario';

export function validarUnidadForm(form: DatosUnidadCrear): string | null {
  return validarFormularioUnidad(form);
}
