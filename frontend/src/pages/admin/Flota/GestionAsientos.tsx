import { useEffect, useState } from 'react';
import { PanelDeslizable } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import { actualizarAsiento, crearAsiento, eliminarAsiento, obtenerAsientos } from '../../../services/asientos';
import type { Asiento } from '../../../types/asiento';
import type { UnidadTransporte } from '../../../types/unidad';
import { sanitizarNumeroAsiento, validarFormularioAsiento } from '../../../utils/validacionesFormulario';

interface GestionAsientosProps {
  abierto: boolean;
  onCerrar: () => void;
  unidad: UnidadTransporte | null;
}

export default function GestionAsientos({ abierto, onCerrar, unidad }: GestionAsientosProps) {
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario rápido para añadir
  const [nuevoNum, setNuevoNum] = useState('');
  const [nuevaPos, setNuevaPos] = useState<'ventana' | 'pasillo' | 'medio' | 'otro'>('otro');

  // Modal de edición de asiento
  const [asientoEditando, setAsientoEditando] = useState<Asiento | null>(null);
  const [editNum, setEditNum] = useState('');
  const [editPos, setEditPos] = useState<'ventana' | 'pasillo' | 'medio' | 'otro'>('otro');

  const cargarAsientos = async () => {
    if (!unidad) return;
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerAsientos({ unidad_id: unidad.id });
      setAsientos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los asientos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (abierto && unidad) {
      cargarAsientos();
      setNuevoNum('');
      setNuevaPos('otro');
      setAsientoEditando(null);
    }
  }, [abierto, unidad]);

  const agregarAsiento = async () => {
    if (!unidad) return;
    const errorAsiento = validarFormularioAsiento(nuevoNum, nuevaPos);
    if (errorAsiento) {
      setError(errorAsiento);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await crearAsiento({
        unidad_id: unidad.id,
        numero: nuevoNum,
        posicion: nuevaPos,
      });
      setNuevoNum('');
      await cargarAsientos();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al agregar asiento');
      setCargando(false);
    }
  };

  const abrirModalEditar = (asiento: Asiento) => {
    setAsientoEditando(asiento);
    setEditNum(asiento.numero);
    setEditPos(asiento.posicion);
  };

  const cerrarModalEditar = () => {
    setAsientoEditando(null);
  };

  const guardarEdicionAsiento = async () => {
    if (!asientoEditando) return;
    const errorAsiento = validarFormularioAsiento(editNum, editPos);
    if (errorAsiento) {
      alert(errorAsiento);
      return;
    }
    setCargando(true);
    try {
      await actualizarAsiento(asientoEditando.id, {
        numero: editNum,
        posicion: editPos,
      });
      await cargarAsientos();
      cerrarModalEditar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar asiento');
      setCargando(false);
    }
  };

  const quitarAsiento = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este asiento? Las reservas futuras asignadas a este asiento podrían verse afectadas.')) return;
    setCargando(true);
    try {
      await eliminarAsiento(id);
      await cargarAsientos();
      if (asientoEditando?.id === id) cerrarModalEditar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar asiento');
      setCargando(false);
    }
  };

  const generarSecuencia = async () => {
    if (!unidad) return;
    if (asientos.length > 0) {
      if (!window.confirm('Esto añadirá asientos secuencialmente hasta completar la capacidad de la unidad. ¿Continuar?')) {
        return;
      }
    }
    const faltantes = unidad.capacidad - asientos.length;
    if (faltantes <= 0) {
      alert('La unidad ya tiene todos los asientos registrados.');
      return;
    }

    setCargando(true);
    try {
      const maxActual = asientos.reduce((max, a) => {
        const num = parseInt(a.numero, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);

      const promesas = [];
      for (let i = 1; i <= faltantes; i++) {
        const numSec = (maxActual + i).toString();
        // Asignación simple de posición simulando 4 columnas (Ventana, Pasillo, Pasillo, Ventana)
        const rem = (maxActual + i) % 4;
        let pos: 'ventana' | 'pasillo' | 'medio' | 'otro' = 'pasillo';
        if (rem === 1 || rem === 0) pos = 'ventana';

        promesas.push(crearAsiento({
          unidad_id: unidad.id,
          numero: numSec,
          posicion: pos,
        }));
      }

      await Promise.all(promesas);
      await cargarAsientos();
    } catch (e) {
      alert('Hubo un error al generar asientos: ' + (e instanceof Error ? e.message : ''));
      await cargarAsientos();
    }
  };

  return (
    <>
      <PanelDeslizable
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={`Asientos: ${unidad?.placa || ''}`}
        subtitulo="Visualiza, agrega o elimina los asientos de esta unidad."
        pie={
          <Boton variante="secundario" tamano="sm" onClick={onCerrar}>
            Cerrar
          </Boton>
        }
      >
        <div className="gestion-asientos">
          {error && (
            <div className="flota__error" role="alert">
              {error}
            </div>
          )}

          <div className="gestion-asientos__guia">
            <div className="gestion-asientos__guia-titulo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Guía de Ayuda para Encargados
            </div>
            <p className="gestion-asientos__guia-texto">
              Cada asiento registrado aquí debe corresponder a un puesto físico real en el autobús. 
              <strong> Estos son los asientos que los clientes podrán seleccionar</strong> al hacer una reserva. 
              Asegúrate de que la cantidad total de asientos no exceda la capacidad máxima ({unidad?.capacidad || 0} pax). 
              Haz clic en un asiento del mapa para <strong>editarlo o eliminarlo</strong>.
            </p>
          </div>

          <div className="gestion-asientos__info">
            <div className="gestion-asientos__info-item">
              <span>Modelo</span>
              <strong>{unidad?.modelo || '—'}</strong>
            </div>
            <div className="gestion-asientos__info-item">
              <span>Capacidad máx.</span>
              <strong>{unidad?.capacidad || 0} pax</strong>
            </div>
            <div className="gestion-asientos__info-item">
              <span>Registrados</span>
              <strong>
                <span style={{ color: asientos.length > (unidad?.capacidad || 0) ? 'var(--color-error, #dc2626)' : 'inherit' }}>
                  {asientos.length}
                </span>
              </strong>
            </div>
          </div>

          <div className="gestion-asientos__acciones">
            <Boton
              variante="primario"
              tamano="sm"
              onClick={generarSecuencia}
              disabled={cargando || (unidad ? asientos.length >= unidad.capacidad : true)}
            >
              Autocompletar asientos faltantes
            </Boton>
          </div>

          {cargando && asientos.length === 0 ? (
            <p className="drawer-form__intro">Cargando mapa de asientos...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Mapa de Asientos Visual */}
              <div className="gestion-asientos__mapa">
                <svg className="gestion-asientos__volante" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                  <line x1="12" y1="2" x2="12" y2="10"></line>
                  <line x1="2.27" y1="15" x2="10.27" y2="13"></line>
                  <line x1="21.73" y1="15" x2="13.73" y2="13"></line>
                </svg>

                <div className="gestion-asientos__grid">
                  {asientos.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>
                      No hay asientos registrados para esta unidad.
                    </div>
                  )}
                  {Array.from({ length: Math.ceil(asientos.length / 4) }, (_, i) => asientos.slice(i * 4, i * 4 + 4)).map((fila, i) => (
                    <div key={i} className="gestion-asientos__fila">
                      <div className="gestion-asientos__pareja">
                        {fila[0] && (
                          <div className="gestion-asientos__asiento" onClick={() => abrirModalEditar(fila[0])}>
                            <span className="gestion-asientos__asiento-num">{fila[0].numero}</span>
                            <span className="gestion-asientos__asiento-pos">{fila[0].posicion === 'ventana' ? 'V' : fila[0].posicion === 'pasillo' ? 'P' : fila[0].posicion === 'medio' ? 'M' : 'O'}</span>
                          </div>
                        )}
                        {fila[1] && (
                          <div className="gestion-asientos__asiento" onClick={() => abrirModalEditar(fila[1])}>
                            <span className="gestion-asientos__asiento-num">{fila[1].numero}</span>
                            <span className="gestion-asientos__asiento-pos">{fila[1].posicion === 'ventana' ? 'V' : fila[1].posicion === 'pasillo' ? 'P' : fila[1].posicion === 'medio' ? 'M' : 'O'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="gestion-asientos__pasillo-espacio">
                        {i === 0 && <span className="gestion-asientos__pasillo-label">PASILLO</span>}
                      </div>

                      <div className="gestion-asientos__pareja">
                        {fila[2] && (
                          <div className="gestion-asientos__asiento" onClick={() => abrirModalEditar(fila[2])}>
                            <span className="gestion-asientos__asiento-num">{fila[2].numero}</span>
                            <span className="gestion-asientos__asiento-pos">{fila[2].posicion === 'ventana' ? 'V' : fila[2].posicion === 'pasillo' ? 'P' : fila[2].posicion === 'medio' ? 'M' : 'O'}</span>
                          </div>
                        )}
                        {fila[3] && (
                          <div className="gestion-asientos__asiento" onClick={() => abrirModalEditar(fila[3])}>
                            <span className="gestion-asientos__asiento-num">{fila[3].numero}</span>
                            <span className="gestion-asientos__asiento-pos">{fila[3].posicion === 'ventana' ? 'V' : fila[3].posicion === 'pasillo' ? 'P' : fila[3].posicion === 'medio' ? 'M' : 'O'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Añadir Asiento Manual */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <p className="drawer-form__intro" style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Añadir un asiento extra manualmente</p>
                <div className="drawer-form__fila-2">
                  <div className="drawer-form__campo">
                    <label className="drawer-form__label">Número de asiento</label>
                    <input
                      className="drawer-form__input"
                      type="text"
                      placeholder="Ej: 1A, VIP..."
                      value={nuevoNum}
                      maxLength={10}
                      onChange={(e) => setNuevoNum(sanitizarNumeroAsiento(e.target.value))}
                    />
                  </div>
                  <div className="drawer-form__campo">
                    <label className="drawer-form__label">Posición</label>
                    <select
                      className="drawer-form__input"
                      value={nuevaPos}
                      onChange={(e) => setNuevaPos(e.target.value as any)}
                    >
                      <option value="ventana">Ventana</option>
                      <option value="pasillo">Pasillo</option>
                      <option value="medio">Medio</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <Boton variante="secundario" tamano="sm" onClick={agregarAsiento} disabled={!nuevoNum.trim() || cargando}>
                    Añadir al mapa
                  </Boton>
                </div>
              </div>

            </div>
          )}
        </div>
      </PanelDeslizable>

      {/* Modal Editar Asiento */}
      {asientoEditando && (
        <div className="flota-modal__superposicion" onClick={cerrarModalEditar} role="presentation">
          <div className="flota-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flota-modal__header">
              <div>
                <h3 className="flota-modal__titulo">Editar Asiento {asientoEditando.numero}</h3>
                <p className="flota-modal__subtitulo">Modifica sus datos o elimínalo de la unidad.</p>
              </div>
              <button className="flota-modal__cerrar" onClick={cerrarModalEditar} aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="flota-modal__cuerpo">
              <div className="flota-modal__campo">
                <label className="flota-modal__label">Número de asiento</label>
                <input
                  className="flota-modal__input"
                  type="text"
                  value={editNum}
                  maxLength={10}
                  onChange={(e) => setEditNum(sanitizarNumeroAsiento(e.target.value))}
                />
              </div>
              <div className="flota-modal__campo">
                <label className="flota-modal__label">Posición</label>
                <select
                  className="flota-modal__input"
                  value={editPos}
                  onChange={(e) => setEditPos(e.target.value as any)}
                >
                  <option value="ventana">Ventana</option>
                  <option value="pasillo">Pasillo</option>
                  <option value="medio">Medio</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="flota-modal__acciones" style={{ justifyContent: 'space-between' }}>
              <Boton variante="peligro" tamano="sm" onClick={() => quitarAsiento(asientoEditando.id)} disabled={cargando}>
                Eliminar asiento
              </Boton>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Boton variante="secundario" tamano="sm" onClick={cerrarModalEditar} disabled={cargando}>
                  Cancelar
                </Boton>
                <Boton variante="primario" tamano="sm" onClick={guardarEdicionAsiento} disabled={cargando || !editNum.trim()}>
                  Guardar cambios
                </Boton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
