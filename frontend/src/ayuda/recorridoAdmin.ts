import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './recorridoAdmin.css';

type Paso = {
  element?: string;
  titulo: string;
  detalle: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
};

const PASOS: Paso[] = [
  {
    element: '[data-recorrido="menu"]',
    titulo: 'Menú de SIGEL',
    detalle: 'Desde aquí entras a operación, comercial, catálogos y reportes. Los módulos que ves dependen de tus permisos.',
    side: 'right',
  },
  {
    element: '[data-recorrido="dashboard"]',
    titulo: 'Dashboard',
    detalle: 'Resumen del día: viajes activos, cotizaciones pendientes y destinos con más movimiento.',
    side: 'right',
  },
  {
    element: '[data-recorrido="asistente"]',
    titulo: 'Asistente inteligente',
    detalle: 'Pregúntale cifras y decisiones: clientes del año, ocupación o qué destino conviene en diciembre. No es el manual; eso está en Ayuda.',
    side: 'right',
  },
  {
    element: '[data-recorrido="operacion"]',
    titulo: 'Operación',
    detalle: 'Planificación de viajes, reservas (individual o grupal), abordaje y pagos.',
    side: 'right',
  },
  {
    element: '[data-recorrido="comercial"]',
    titulo: 'Comercial',
    detalle: 'Cotizaciones, clientes y reseñas. El titular de una reserva grupal se busca aquí; los acompañantes se pueden registrar en la misma reserva.',
    side: 'right',
  },
  {
    element: '[data-recorrido="reportes"]',
    titulo: 'Reportes',
    detalle: 'Un solo cuadro: estadísticos por fecha (clientes del año, pagos, destinos) y el listín de cada viaje.',
    side: 'right',
  },
  {
    element: '[data-recorrido="asistente-flotante"]',
    titulo: 'Chat del asistente',
    detalle: 'Este botón abre el agente en cualquier pantalla. Escribe en español, como si hablaras con el equipo.',
    side: 'left',
  },
  {
    element: '[data-recorrido="ayuda"]',
    titulo: 'Centro de ayuda',
    detalle: 'Manual del sistema: preguntas frecuentes, guías y este recorrido. Queda aquí, arriba de Cerrar sesión.',
    side: 'right',
  },
];

let prepararMenu: (() => void) | null = null;

export function registrarPreparacionRecorrido(fn: (() => void) | null) {
  prepararMenu = fn;
}

export function iniciarRecorridoAdmin() {
  prepararMenu?.();

  window.setTimeout(() => {
    const pasos = PASOS.filter((paso) => !paso.element || document.querySelector(paso.element));
    if (pasos.length === 0) return;

    const tour = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      skipMissingElement: true,
      overlayOpacity: 0.55,
      stagePadding: 10,
      popoverClass: 'recorrido-sigel',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      doneBtnText: 'Terminar',
      progressText: '{{current}} de {{total}}',
      steps: pasos.map((paso) => ({
        element: paso.element,
        popover: {
          title: paso.titulo,
          description: paso.detalle,
          side: paso.side ?? 'right',
          align: 'start',
        },
      })),
    });

    tour.drive();
  }, 80);
}
