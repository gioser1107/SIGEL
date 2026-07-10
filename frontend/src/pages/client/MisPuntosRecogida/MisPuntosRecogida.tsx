import { useRef, useState } from 'react';
import { CabeceraModulo } from '../../../components/admin';
import PuntosRecogidaEditor, {
  type PuntosRecogidaEditorHandle,
} from '../../../components/puntos-recogida/PuntosRecogidaEditor';
import Boton from '../../../components/ui/Boton/Boton';
import '../../../components/puntos-recogida/puntos-recogida.css';
import './MisPuntosRecogida.css';

export default function MisPuntosRecogida() {
  const editorRef = useRef<PuntosRecogidaEditorHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(0);

  return (
    <div className="mis-puntos">
      <CabeceraModulo
        titulo="Mis puntos de recogida"
        contador={cantidad}
        descripcion="Registra los domicilios donde la agencia puede pasar a recogerte (tu casa, casa de un familiar, etc.)."
        acciones={
          <Boton
            variante="primario"
            tamano="sm"
            onClick={() => editorRef.current?.abrirAgregar()}
          >
            + Agregar domicilio
          </Boton>
        }
      />

      {error && (
        <div className="mis-puntos__error" role="alert">
          {error}
        </div>
      )}

      <PuntosRecogidaEditor
        ref={editorRef}
        mode="profile"
        ocultarBotonAgregar
        onError={setError}
        onPuntosChange={setCantidad}
      />
    </div>
  );
}
