import { useCallback, useEffect, useState } from 'react';
import { CabeceraModulo, ModalConfirmacion } from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import { ErrorApi } from '../../../services/api';
import {
  consultarEstadoBases,
  crearRespaldo,
  descargarRespaldo,
  listarRespaldos,
  restaurarRespaldo,
  type EstadoBase,
  type GrupoRespaldo,
} from '../../../services/respaldos';
import './Respaldos.css';

function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function etiquetaTipo(tipo: string): string {
  if (tipo === 'seguridad') return 'Seguridad';
  if (tipo === 'negocio') return 'Negocio';
  return tipo;
}

function ChipBase({ estado, titulo }: { estado?: EstadoBase; titulo: string }) {
  const ok = estado?.disponible;
  return (
    <article className={`respaldos__chip ${ok ? 'respaldos__chip--ok' : 'respaldos__chip--error'}`}>
      <p className="respaldos__chip-titulo">{titulo}</p>
      <p className="respaldos__chip-nombre">{estado?.nombre ?? '…'}</p>
      <p className="respaldos__chip-estado">{ok ? 'En línea' : 'Sin conexión'}</p>
    </article>
  );
}

export default function Respaldos() {
  const [seguridad, setSeguridad] = useState<EstadoBase>();
  const [negocio, setNegocio] = useState<EstadoBase>();
  const [grupos, setGrupos] = useState<GrupoRespaldo[]>([]);
  const [retencion, setRetencion] = useState(7);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [archivoARestaurar, setArchivoARestaurar] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    const [estado, listado] = await Promise.all([consultarEstadoBases(), listarRespaldos()]);
    setSeguridad(estado.seguridad);
    setNegocio(estado.negocio);
    setGrupos(listado.respaldos);
    setRetencion(listado.retencion_dias);
  }, []);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    cargar()
      .catch((err) => {
        if (!vivo) return;
        setError(err instanceof ErrorApi || err instanceof Error ? err.message : 'No se pudieron leer los respaldos');
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [cargar]);

  async function generar() {
    setGenerando(true);
    setError(null);
    setAviso(null);
    try {
      const resultado = await crearRespaldo();
      setAviso(`Respaldo ${resultado.marca} generado (${resultado.metodo}).`);
      await cargar();
    } catch (err) {
      setError(err instanceof ErrorApi || err instanceof Error ? err.message : 'No se pudo generar el respaldo');
    } finally {
      setGenerando(false);
    }
  }

  async function restaurar() {
    if (!archivoARestaurar) return;
    setRestaurando(true);
    setError(null);
    setAviso(null);
    try {
      const resultado = await restaurarRespaldo(archivoARestaurar);
      setAviso(resultado.mensaje);
      setArchivoARestaurar(null);
      await cargar();
    } catch (err) {
      setError(err instanceof ErrorApi || err instanceof Error ? err.message : 'No se pudo restaurar el respaldo');
    } finally {
      setRestaurando(false);
    }
  }

  async function descargar(archivo: string) {
    setError(null);
    try {
      await descargarRespaldo(archivo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo');
    }
  }

  return (
    <div className="respaldos">
      <CabeceraModulo
        migaja="Configuración"
        titulo="Respaldos de base de datos"
        contador={grupos.length}
        descripcion="Dos bases MySQL: seguridad y negocio. Generar y descargar no borra data. Restaurar reemplaza SOLO la base de ese archivo."
        acciones={
          <Boton variante="primario" onClick={generar} disabled={generando}>
            {generando ? 'Generando…' : 'Generar respaldo ahora'}
          </Boton>
        }
      />

      <section className="respaldos__chips">
        <ChipBase titulo="Base de seguridad" estado={seguridad} />
        <ChipBase titulo="Base de negocio" estado={negocio} />
        <article className="respaldos__chip">
          <p className="respaldos__chip-titulo">Retención</p>
          <p className="respaldos__chip-nombre">{retencion} días</p>
          <p className="respaldos__chip-estado">Los archivos viejos se borran solos</p>
        </article>
      </section>

      {error && <div className="respaldos__alerta respaldos__alerta--error">{error}</div>}
      {aviso && <div className="respaldos__alerta respaldos__alerta--ok">{aviso}</div>}

      {cargando ? (
        <p className="respaldos__vacio">Cargando respaldos…</p>
      ) : grupos.length === 0 ? (
        <p className="respaldos__vacio">Aún no hay respaldos. Genera el primero para la defensa y el cron diario.</p>
      ) : (
        <div className="respaldos__lista">
          {grupos.map((grupo) => (
            <article key={grupo.marca} className="respaldos__grupo">
              <header className="respaldos__grupo-cabecera">
                <h2>Respaldo {grupo.marca}</h2>
                <span>{grupo.archivos[0]?.creado_en?.replace('T', ' ') ?? ''}</span>
              </header>
              <ul>
                {grupo.archivos.map((archivo) => (
                  <li key={archivo.archivo}>
                    <div>
                      <strong>{etiquetaTipo(archivo.tipo)}</strong>
                      <span>{archivo.archivo}</span>
                    </div>
                    <div className="respaldos__grupo-acciones">
                      <span>{formatearBytes(archivo.bytes)}</span>
                      <Boton variante="secundario" tamano="sm" onClick={() => descargar(archivo.archivo)}>
                        Descargar
                      </Boton>
                      <Boton variante="peligro" tamano="sm" onClick={() => setArchivoARestaurar(archivo.archivo)}>
                        Restaurar
                      </Boton>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <ModalConfirmacion
        abierto={archivoARestaurar != null}
        titulo="Restaurar respaldo"
        mensaje={`Esto reemplaza la base de ${archivoARestaurar ?? ''}. En travelbqto.kontrolaonline.com no lo uses salvo que el docente lo pida y el archivo sea el que acabas de generar.`}
        textoConfirmar="Sí, restaurar"
        variante="peligro"
        cargando={restaurando}
        onConfirmar={() => void restaurar()}
        onCancelar={() => setArchivoARestaurar(null)}
      />
    </div>
  );
}
