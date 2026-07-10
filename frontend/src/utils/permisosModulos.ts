import type { Permiso } from '../types/seguridad';

export const ACCIONES_PERMISO = ['crear', 'leer', 'editar', 'borrar'] as const;
export type AccionPermiso = (typeof ACCIONES_PERMISO)[number];

const ETIQUETAS_MODULO: Record<string, string> = {
  usuarios: 'Usuarios',
  permisos: 'Permisos',
  roles: 'Roles',
  reportes_pago: 'Reportes de pago',
  conciliacion: 'Conciliación',
  cotizaciones: 'Cotizaciones',
  planificacion: 'Planificación',
  transporte_flota: 'Transporte y flota',
  reservas: 'Reservas',
  destinos: 'Destinos',
  bitacora: 'Bitácora',
  abordaje: 'Abordaje',
  resenas: 'Reseñas',
  clientes: 'Clientes',
  puntos_recogida: 'Puntos de recogida',
};

const ETIQUETAS_ACCION: Record<AccionPermiso, string> = {
  crear: 'Crear',
  leer: 'Leer',
  editar: 'Editar',
  borrar: 'Borrar',
};

export interface PermisoParseado {
  permiso: Permiso;
  modulo: string;
  accion: AccionPermiso | 'otro';
}

export interface FilaModuloPermisos {
  modulo: string;
  etiqueta: string;
  celdas: Partial<Record<AccionPermiso, Permiso>>;
}

export function etiquetaModulo(modulo: string): string {
  return ETIQUETAS_MODULO[modulo] ?? modulo.replace(/_/g, ' ');
}

export function etiquetaAccion(accion: AccionPermiso): string {
  return ETIQUETAS_ACCION[accion];
}

export function parsearDescripcionPermiso(descripcion: string): {
  modulo: string;
  accion: AccionPermiso | 'otro';
} {
  for (const accion of ACCIONES_PERMISO) {
    const prefijo = `${accion}_`;
    if (descripcion.startsWith(prefijo)) {
      return { accion, modulo: descripcion.slice(prefijo.length) };
    }
  }

  return { accion: 'otro', modulo: descripcion };
}

export function agruparPermisosPorModulo(permisos: Permiso[]): {
  filas: FilaModuloPermisos[];
  sueltos: Permiso[];
} {
  const mapa = new Map<string, FilaModuloPermisos>();
  const sueltos: Permiso[] = [];

  for (const permiso of permisos) {
    const { modulo, accion } = parsearDescripcionPermiso(permiso.descripcion);

    if (accion === 'otro') {
      sueltos.push(permiso);
      continue;
    }

    if (!mapa.has(modulo)) {
      mapa.set(modulo, {
        modulo,
        etiqueta: etiquetaModulo(modulo),
        celdas: {},
      });
    }

    mapa.get(modulo)!.celdas[accion] = permiso;
  }

  const filas = [...mapa.values()].sort((a, b) =>
    a.etiqueta.localeCompare(b.etiqueta, 'es')
  );

  return { filas, sueltos };
}

/** Código estándar: leer_clientes, crear_roles, etc. */
export function codigoPermiso(accion: AccionPermiso, modulo: string): string {
  return `${accion}_${modulo}`;
}

const MODULOS_SISTEMA = Object.keys(ETIQUETAS_MODULO);

export function tienePermisoEnLista(permisos: string[], codigo: string): boolean {
  return permisos.includes(codigo);
}

export function puedeModulo(
  permisos: string[],
  modulo: string,
  accion?: AccionPermiso
): boolean {
  if (accion) {
    return tienePermisoEnLista(permisos, codigoPermiso(accion, modulo));
  }
  return ACCIONES_PERMISO.some((a) =>
    tienePermisoEnLista(permisos, codigoPermiso(a, modulo))
  );
}

export function puedeLeer(permisos: string[], modulo: string): boolean {
  return puedeModulo(permisos, modulo, 'leer');
}

export function puedeCrear(permisos: string[], modulo: string): boolean {
  return puedeModulo(permisos, modulo, 'crear');
}

export function puedeEditar(permisos: string[], modulo: string): boolean {
  return puedeModulo(permisos, modulo, 'editar');
}

export function puedeBorrar(permisos: string[], modulo: string): boolean {
  return puedeModulo(permisos, modulo, 'borrar');
}

/** True si el usuario es del portal cliente (no debe entrar al panel admin). */
export function esRolClientePortal(rol: string | undefined | null): boolean {
  return (rol ?? '').trim().toLowerCase() === 'cliente';
}

/** True si el usuario puede entrar al panel admin (tiene al menos un módulo operativo). */
export function puedeAccederPanelAdmin(permisos: string[], esAdmin = false, rol?: string | null): boolean {
  if (esRolClientePortal(rol)) return false;
  if (esAdmin) return true;
  return MODULOS_SISTEMA.some((modulo) => puedeModulo(permisos, modulo));
}

export function puedeAccederSeguridad(permisos: string[]): boolean {
  return (
    puedeModulo(permisos, 'usuarios') ||
    puedeModulo(permisos, 'roles') ||
    puedeModulo(permisos, 'permisos')
  );
}
