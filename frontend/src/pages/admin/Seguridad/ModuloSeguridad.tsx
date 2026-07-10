import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CabeceraModulo,
  PestaniasFiltro,
  TablaDatos,
  BotonAccionTabla,
  PaginacionTabla,
} from '../../../components/admin';
import Boton from '../../../components/ui/Boton/Boton';
import useAutenticacion from '../../../hooks/useAutenticacion';
import { usePaginacionListado } from '../../../hooks/usePaginacionListado';
import type { Permiso, Rol, SeccionSeguridad, UsuarioSistema } from '../../../types/seguridad';
import { columnasPermisos } from './components/columnasPermisos';
import { columnasRoles } from './components/columnasRoles';
import { columnasUsuarios } from './components/columnasUsuarios';
import { ETIQUETAS_SECCION, MODULOS_SEGURIDAD } from './constants';
import useDatosSeguridad from './hooks/useDatosSeguridad';
import PanelCrearPermiso from './Permisos/CrearPermiso/PanelCrearPermiso';
import PanelEditarPermiso from './Permisos/EditarPermiso/PanelEditarPermiso';
import ModalEliminarPermiso from './Permisos/EliminarPermiso/ModalEliminarPermiso';
import PanelCrearRol from './Roles/CrearRol/PanelCrearRol';
import PanelEditarRol from './Roles/EditarRol/PanelEditarRol';
import ModalEliminarRol from './Roles/EliminarRol/ModalEliminarRol';
import PanelCrearUsuario from './Usuarios/CrearUsuario/PanelCrearUsuario';
import PanelEditarUsuario from './Usuarios/EditarUsuario/PanelEditarUsuario';
import ModalEliminarUsuario from './Usuarios/EliminarUsuario/ModalEliminarUsuario';
import '../Cotizaciones/Cotizaciones.css';
import './ModuloSeguridad.css';

interface ModuloSeguridadProps {
  seccionInicial: SeccionSeguridad;
}

export default function ModuloSeguridad({ seccionInicial }: ModuloSeguridadProps) {
  const { puedeModulo, puedeLeer, puedeCrear, puedeEditar, puedeBorrar } = useAutenticacion();

  const seccionesDisponibles = useMemo(() => {
    const lista: { id: SeccionSeguridad; etiqueta: string }[] = [];
    if (puedeModulo(MODULOS_SEGURIDAD.usuarios)) {
      lista.push({ id: 'usuarios', etiqueta: ETIQUETAS_SECCION.usuarios });
    }
    if (puedeModulo(MODULOS_SEGURIDAD.roles)) {
      lista.push({ id: 'roles', etiqueta: ETIQUETAS_SECCION.roles });
    }
    if (puedeModulo(MODULOS_SEGURIDAD.permisos)) {
      lista.push({ id: 'permisos', etiqueta: ETIQUETAS_SECCION.permisos });
    }
    return lista;
  }, [puedeModulo]);

  const [seccion, setSeccion] = useState<SeccionSeguridad>(seccionInicial);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const { pagina, setTotal, total, totalPaginas, irPagina, reiniciarPagina, limite } = usePaginacionListado();

  const establecerError = useCallback((mensaje: string) => setError(mensaje), []);
  const { usuarios, roles, permisos, rolesCatalogo, permisosCatalogo, cargando, cargarDatos } = useDatosSeguridad({
    puedeLeer,
    onError: establecerError,
    seccion,
    pagina,
    limite,
    setTotal,
  });

  const puedeCrearUsuario = puedeCrear(MODULOS_SEGURIDAD.usuarios);
  const puedeEditarUsuario = puedeEditar(MODULOS_SEGURIDAD.usuarios);
  const puedeEliminarUsuario = puedeBorrar(MODULOS_SEGURIDAD.usuarios);
  const hayAccionesUsuario = puedeEditarUsuario || puedeEliminarUsuario;

  const puedeCrearRol = puedeCrear(MODULOS_SEGURIDAD.roles);
  const puedeEditarRol = puedeEditar(MODULOS_SEGURIDAD.roles);
  const puedeEliminarRol = puedeBorrar(MODULOS_SEGURIDAD.roles);
  const hayAccionesRol = puedeEditarRol || puedeEliminarRol;

  const puedeCrearPermiso = puedeCrear(MODULOS_SEGURIDAD.permisos);
  const puedeEditarPermiso = puedeEditar(MODULOS_SEGURIDAD.permisos);
  const puedeEliminarPermiso = puedeBorrar(MODULOS_SEGURIDAD.permisos);
  const hayAccionesPermiso = puedeEditarPermiso || puedeEliminarPermiso;

  const [panelCrearUsuarioAbierto, setPanelCrearUsuarioAbierto] = useState(false);
  const [panelEditarUsuarioAbierto, setPanelEditarUsuarioAbierto] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState<UsuarioSistema | null>(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioSistema | null>(null);
  const [confirmUsuarioAbierto, setConfirmUsuarioAbierto] = useState(false);

  const [panelCrearRolAbierto, setPanelCrearRolAbierto] = useState(false);
  const [panelEditarRolAbierto, setPanelEditarRolAbierto] = useState(false);
  const [rolActivo, setRolActivo] = useState<Rol | null>(null);
  const [rolAEliminar, setRolAEliminar] = useState<Rol | null>(null);
  const [confirmRolAbierto, setConfirmRolAbierto] = useState(false);

  const [panelCrearPermisoAbierto, setPanelCrearPermisoAbierto] = useState(false);
  const [panelEditarPermisoAbierto, setPanelEditarPermisoAbierto] = useState(false);
  const [permisoActivo, setPermisoActivo] = useState<Permiso | null>(null);
  const [permisoAEliminar, setPermisoAEliminar] = useState<Permiso | null>(null);
  const [confirmPermisoAbierto, setConfirmPermisoAbierto] = useState(false);

  useEffect(() => {
    if (!seccionesDisponibles.some((s) => s.id === seccion) && seccionesDisponibles.length > 0) {
      setSeccion(seccionesDisponibles[0].id);
    }
  }, [seccionesDisponibles, seccion]);

  useEffect(() => {
    reiniciarPagina();
  }, [seccion, reiniciarPagina]);

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  const rolesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.nombre.toLowerCase().includes(q) ||
        r.descripcion.toLowerCase().includes(q)
    );
  }, [roles, busqueda]);

  const permisosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return permisos;
    return permisos.filter((p) => p.descripcion.toLowerCase().includes(q));
  }, [permisos, busqueda]);

  function abrirCrearUsuario() {
    if (!puedeCrearUsuario) return;
    setPanelCrearUsuarioAbierto(true);
  }

  function abrirEditarUsuario(usuario: UsuarioSistema) {
    if (!puedeEditarUsuario) return;
    setUsuarioActivo(usuario);
    setPanelEditarUsuarioAbierto(true);
  }

  function pedirEliminarUsuario(usuario: UsuarioSistema) {
    if (!puedeEliminarUsuario) return;
    setUsuarioAEliminar(usuario);
    setConfirmUsuarioAbierto(true);
  }

  function alEliminarUsuarioExito() {
    setExito('Registro eliminado correctamente.');
    setConfirmUsuarioAbierto(false);
    const idEliminado = usuarioAEliminar?.id;
    setUsuarioAEliminar(null);
    if (usuarioActivo?.id === idEliminado) {
      setPanelEditarUsuarioAbierto(false);
      setUsuarioActivo(null);
    }
    cargarDatos();
  }

  function abrirCrearRol() {
    if (!puedeCrearRol) return;
    setPanelCrearRolAbierto(true);
  }

  function abrirEditarRol(rol: Rol) {
    if (!puedeEditarRol) return;
    setRolActivo(rol);
    setPanelEditarRolAbierto(true);
  }

  function alCrearRolExito(nuevoRol: Rol) {
    setRolActivo(nuevoRol);
    setPanelEditarRolAbierto(true);
  }

  function pedirEliminarRol(rol: Rol) {
    if (!puedeEliminarRol) return;
    setRolAEliminar(rol);
    setConfirmRolAbierto(true);
  }

  function alEliminarRolExito() {
    setExito('Registro eliminado correctamente.');
    setConfirmRolAbierto(false);
    const idEliminado = rolAEliminar?.id;
    setRolAEliminar(null);
    if (rolActivo?.id === idEliminado) {
      setPanelEditarRolAbierto(false);
      setRolActivo(null);
    }
    cargarDatos();
  }

  function abrirCrearPermiso() {
    if (!puedeCrearPermiso) return;
    setPanelCrearPermisoAbierto(true);
  }

  function abrirEditarPermiso(permiso: Permiso) {
    if (!puedeEditarPermiso) return;
    setPermisoActivo(permiso);
    setPanelEditarPermisoAbierto(true);
  }

  function pedirEliminarPermiso(permiso: Permiso) {
    if (!puedeEliminarPermiso) return;
    setPermisoAEliminar(permiso);
    setConfirmPermisoAbierto(true);
  }

  function alEliminarPermisoExito() {
    setExito('Registro eliminado correctamente.');
    setConfirmPermisoAbierto(false);
    const idEliminado = permisoAEliminar?.id;
    setPermisoAEliminar(null);
    if (permisoActivo?.id === idEliminado) {
      setPanelEditarPermisoAbierto(false);
      setPermisoActivo(null);
    }
    cargarDatos();
  }

  if (seccionesDisponibles.length === 0) {
    return (
      <div className="ruta-privada__denegado">
        <h2>Acceso denegado</h2>
        <p>No tienes permisos para gestionar la seguridad del sistema.</p>
      </div>
    );
  }

  return (
    <div className="seguridad">
      <CabeceraModulo
        migaja="Administración / Seguridad"
        titulo="Usuarios y roles"
        descripcion="Administrá cuentas del panel y define qué puede hacer cada rol."
        acciones={
          <>
            {seccion === 'usuarios' && puedeCrearUsuario && (
              <Boton variante="primario" tamano="sm" onClick={abrirCrearUsuario}>
                + Nuevo usuario
              </Boton>
            )}
            {seccion === 'roles' && puedeCrearRol && (
              <Boton variante="primario" tamano="sm" onClick={abrirCrearRol}>
                + Nuevo rol
              </Boton>
            )}
            {seccion === 'permisos' && puedeCrearPermiso && (
              <Boton variante="primario" tamano="sm" onClick={abrirCrearPermiso}>
                + Nuevo permiso
              </Boton>
            )}
          </>
        }
      />

      {error && <div className="cotizaciones__error" role="alert">{error}</div>}
      {exito && (
        <div className="seguridad__alerta seguridad__alerta--exito" onAnimationEnd={() => setExito(null)}>
          {exito}
        </div>
      )}

      <PestaniasFiltro
        pestanias={seccionesDisponibles.map((s) => ({
          id: s.id,
          etiqueta: s.etiqueta,
          contador:
            s.id === 'usuarios'
              ? usuarios.length
              : s.id === 'roles'
                ? roles.length
                : permisos.length,
        }))}
        activa={seccion}
        onChange={(id) => {
          setSeccion(id as SeccionSeguridad);
          setBusqueda('');
          setError(null);
        }}
      />

      <div className="cotizaciones__toolbar">
        <div className="cotizaciones__toolbar-izq">
          <div className="cotizaciones__busqueda">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={
                seccion === 'usuarios'
                  ? 'Buscar por nombre o correo…'
                  : seccion === 'roles'
                    ? 'Buscar rol…'
                    : 'Buscar permiso…'
              }
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar"
            />
          </div>
        </div>
      </div>

      {seccion === 'usuarios' && puedeModulo(MODULOS_SEGURIDAD.usuarios) && (
        <TablaDatos
          columnas={columnasUsuarios}
          datos={usuariosFiltrados}
          cargando={cargando}
          mensajeVacio="No hay usuarios registrados."
          idFila={(u) => u.id}
          onFilaClick={puedeEditarUsuario ? abrirEditarUsuario : undefined}
          accionesFila={
            hayAccionesUsuario
              ? (u) => (
                  <>
                    {puedeEditarUsuario && (
                      <BotonAccionTabla
                        accion="editar"
                        onClick={(e) => { e.stopPropagation(); abrirEditarUsuario(u); }}
                      />
                    )}
                    {puedeEliminarUsuario && (
                      <BotonAccionTabla
                        accion="eliminar"
                        onClick={(e) => { e.stopPropagation(); pedirEliminarUsuario(u); }}
                      />
                    )}
                  </>
                )
              : undefined
          }
        />
      )}

      {seccion === 'roles' && puedeModulo(MODULOS_SEGURIDAD.roles) && (
        <TablaDatos
          columnas={columnasRoles}
          datos={rolesFiltrados}
          cargando={cargando}
          mensajeVacio="No hay roles definidos."
          idFila={(r) => r.id}
          onFilaClick={puedeEditarRol ? abrirEditarRol : undefined}
          accionesFila={
            hayAccionesRol
              ? (r) => (
                  <>
                    {puedeEditarRol && (
                      <BotonAccionTabla
                        accion="editar"
                        onClick={(e) => { e.stopPropagation(); abrirEditarRol(r); }}
                      />
                    )}
                    {puedeEliminarRol && (
                      <BotonAccionTabla
                        accion="eliminar"
                        onClick={(e) => { e.stopPropagation(); pedirEliminarRol(r); }}
                      />
                    )}
                  </>
                )
              : undefined
          }
        />
      )}

      {seccion === 'permisos' && puedeModulo(MODULOS_SEGURIDAD.permisos) && (
        <TablaDatos
          columnas={columnasPermisos}
          datos={permisosFiltrados}
          cargando={cargando}
          mensajeVacio="No hay permisos registrados."
          idFila={(p) => p.id}
          onFilaClick={puedeEditarPermiso ? abrirEditarPermiso : undefined}
          accionesFila={
            hayAccionesPermiso
              ? (p) => (
                  <>
                    {puedeEditarPermiso && (
                      <BotonAccionTabla
                        accion="editar"
                        onClick={(e) => { e.stopPropagation(); abrirEditarPermiso(p); }}
                      />
                    )}
                    {puedeEliminarPermiso && (
                      <BotonAccionTabla
                        accion="eliminar"
                        onClick={(e) => { e.stopPropagation(); pedirEliminarPermiso(p); }}
                      />
                    )}
                  </>
                )
              : undefined
          }
        />
      )}

      <PaginacionTabla
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        limite={limite}
        onPaginaChange={irPagina}
      />

      <PanelCrearUsuario
        abierto={panelCrearUsuarioAbierto}
        roles={rolesCatalogo}
        onCerrar={() => setPanelCrearUsuarioAbierto(false)}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarDatos}
      />

      <PanelEditarUsuario
        abierto={panelEditarUsuarioAbierto}
        usuario={usuarioActivo}
        roles={rolesCatalogo}
        onCerrar={() => {
          setPanelEditarUsuarioAbierto(false);
          setUsuarioActivo(null);
        }}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarDatos}
      />

      <ModalEliminarUsuario
        abierto={confirmUsuarioAbierto}
        usuario={usuarioAEliminar}
        onCerrar={() => setConfirmUsuarioAbierto(false)}
        onEliminadoExito={alEliminarUsuarioExito}
        onError={setError}
      />

      <PanelCrearRol
        abierto={panelCrearRolAbierto}
        onCerrar={() => setPanelCrearRolAbierto(false)}
        onCreado={alCrearRolExito}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarDatos}
      />

      <PanelEditarRol
        abierto={panelEditarRolAbierto}
        rol={rolActivo}
        permisos={permisosCatalogo}
        onCerrar={() => {
          setPanelEditarRolAbierto(false);
          setRolActivo(null);
        }}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarDatos}
      />

      <ModalEliminarRol
        abierto={confirmRolAbierto}
        rol={rolAEliminar}
        onCerrar={() => setConfirmRolAbierto(false)}
        onEliminadoExito={alEliminarRolExito}
        onError={setError}
      />

      <PanelCrearPermiso
        abierto={panelCrearPermisoAbierto}
        onCerrar={() => setPanelCrearPermisoAbierto(false)}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarDatos}
      />

      <PanelEditarPermiso
        abierto={panelEditarPermisoAbierto}
        permiso={permisoActivo}
        onCerrar={() => {
          setPanelEditarPermisoAbierto(false);
          setPermisoActivo(null);
        }}
        onExito={setExito}
        onError={setError}
        onRecargar={cargarDatos}
      />

      <ModalEliminarPermiso
        abierto={confirmPermisoAbierto}
        permiso={permisoAEliminar}
        onCerrar={() => setConfirmPermisoAbierto(false)}
        onEliminadoExito={alEliminarPermisoExito}
        onError={setError}
      />
    </div>
  );
}
