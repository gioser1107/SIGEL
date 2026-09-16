import { useEffect, useState } from 'react';
import FormularioClienteCampos from '../../../Clientes/components/FormularioClienteCampos';
import { listarCiudadesPorEstado, listarEstados } from '../../../../../services/ubicaciones';
import type { CiudadUbicacion, EstadoUbicacion } from '../../../../../types/cliente';
import type { FormularioCliente, ErroresFormularioCliente } from '../../../../../utils/validacionesCliente';

interface Props {
  idTemporal: number;
  form: FormularioCliente;
  errores: ErroresFormularioCliente;
  onChange: (actualizador: (prev: FormularioCliente) => FormularioCliente) => void;
  onLimpiarError: (campo: keyof ErroresFormularioCliente) => void;
}

export default function FichaAcompananteNueva({
  idTemporal,
  form,
  errores,
  onChange,
  onLimpiarError,
}: Props) {
  const [estados, setEstados] = useState<EstadoUbicacion[]>([]);
  const [ciudades, setCiudades] = useState<CiudadUbicacion[]>([]);
  const [cargandoEstados, setCargandoEstados] = useState(true);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);

  useEffect(() => {
    setCargandoEstados(true);
    listarEstados()
      .then(setEstados)
      .catch(() => setEstados([]))
      .finally(() => setCargandoEstados(false));
  }, []);

  useEffect(() => {
    if (!form.estado_id) {
      setCiudades([]);
      return;
    }
    setCargandoCiudades(true);
    listarCiudadesPorEstado(Number(form.estado_id))
      .then((res) => setCiudades(res.ciudades))
      .catch(() => setCiudades([]))
      .finally(() => setCargandoCiudades(false));
  }, [form.estado_id]);

  return (
    <FormularioClienteCampos
      idPrefijo={`admin-nuevo-${idTemporal}`}
      ocultarIntro
      variante="acompanante"
      form={form}
      erroresForm={errores}
      estados={estados}
      ciudades={ciudades}
      cargandoEstados={cargandoEstados}
      cargandoCiudades={cargandoCiudades}
      onChange={onChange}
      onLimpiarError={onLimpiarError}
    />
  );
}
