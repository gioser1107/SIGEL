import type { EntradaConocimiento, GuiaInteractiva } from './tipos';

export const PREGUNTAS_FRECUENTES: EntradaConocimiento[] = [
  {
    id: 'reserva-grupal',
    pregunta: '¿Cómo hago una reserva para varias personas?',
    respuesta:
      'En Admin ve a Reservas → Nueva reserva. En el paso 1 elige Viaje grupal y escribe cuántas personas viajan (por ejemplo 10). El sistema abre una sola reserva con el titular y N-1 fichas de acompañantes. Cada persona se registra ahí mismo: no tienes que crear 10 reservas ni 10 clientes por adelantado.',
    palabras: ['grupal', 'grupo', 'varias', 'personas', 'acompañante', 'familia', 'diez', '10', 'reserva'],
    audiencias: ['admin', 'cliente', 'publico'],
    enlaces: [
      { etiqueta: 'Nueva reserva', to: '/admin/reservas/crear' },
      { etiqueta: 'Reservar en el portal', to: '/agenda' },
    ],
  },
  {
    id: 'reserva-portal',
    pregunta: '¿Cómo reserva un cliente desde el portal?',
    respuesta:
      'Entra a Agenda, elige el viaje, inicia sesión y completa pasajeros, asientos y pago. Los acompañantes se agregan en el mismo flujo, con nombre, documento y domicilio de recogida.',
    palabras: ['portal', 'cliente', 'agenda', 'reservar', 'asiento', 'pago'],
    audiencias: ['admin', 'cliente', 'publico'],
    enlaces: [{ etiqueta: 'Agenda', to: '/agenda' }],
  },
  {
    id: 'crear-viaje',
    pregunta: '¿Cómo creo un viaje?',
    respuesta:
      'En Planificación pulsa Nuevo viaje. Elige destino, unidad, guías y fechas. La fecha de regreso debe ser posterior a la de salida. El viaje queda planificado y luego se puede publicar para reservas.',
    palabras: ['crear', 'viaje', 'planificacion', 'planificación', 'salida', 'regreso', 'unidad'],
    audiencias: ['admin'],
    enlaces: [{ etiqueta: 'Planificación', to: '/admin/planificacion' }],
  },
  {
    id: 'fechas',
    pregunta: '¿Qué fechas puedo usar en reportes y formularios?',
    respuesta:
      'En reportes y pagos no se admiten fechas futuras y la fecha inicial no puede ser posterior a la final. Al crear un viaje sí se permiten fechas futuras (el viaje aún no sale), pero el regreso debe ser después de la salida.',
    palabras: ['fecha', 'fechas', 'rango', 'futura', 'validacion', 'validación', 'reporte'],
    audiencias: ['admin'],
    enlaces: [
      { etiqueta: 'Reportes estadísticos', to: '/admin/reportes' },
      { etiqueta: 'Nuevo viaje', to: '/admin/planificacion' },
    ],
  },
  {
    id: 'reportes',
    pregunta: '¿Dónde veo cuántos clientes se registraron este año?',
    respuesta:
      'En Reportes → Estadísticos usa el atajo Este año. El indicador Clientes nuevos cuenta altas del periodo. Ahí también están destinos, reservas, ingresos, ocupación y cotizaciones.',
    palabras: ['reporte', 'estadistico', 'estadístico', 'clientes', 'año', 'filtros', 'parametrizado'],
    audiencias: ['admin'],
    enlaces: [{ etiqueta: 'Reportes estadísticos', to: '/admin/reportes' }],
  },
  {
    id: 'reporte-viaje',
    pregunta: '¿Qué es el reporte operativo de viaje?',
    respuesta:
      'Es el manifiesto del viaje: pasajeros, asientos, recogida y pagos. Está en Reportes → pestaña Listín de viaje. Un guía solo ve los viajes donde está asignado.',
    palabras: ['listin', 'listín', 'manifiesto', 'operativo', 'viaje', 'pasajeros'],
    audiencias: ['admin'],
    enlaces: [{ etiqueta: 'Listín de viaje', to: '/admin/reportes?tipo=listin' }],
  },
  {
    id: 'clientes-nombres',
    pregunta: '¿Por qué no me deja poner números en el nombre?',
    respuesta:
      'Los nombres de personas solo aceptan letras y espacios, máximo 80 caracteres. Es una validación del frontend y del backend para evitar cédulas o teléfonos en el campo nombre.',
    palabras: ['nombre', 'numeros', 'números', 'caracteres', 'validacion', 'apellido'],
    audiencias: ['admin', 'cliente', 'publico'],
  },
  {
    id: 'pagos',
    pregunta: '¿Cómo registro un pago?',
    respuesta:
      'En la reserva (admin o portal) entra a Pagos, carga el comprobante, el monto y la fecha (no futura). El pago queda en revisión hasta que operaciones lo apruebe.',
    palabras: ['pago', 'abono', 'comprobante', 'tasa', 'monto'],
    audiencias: ['admin', 'cliente'],
    enlaces: [{ etiqueta: 'Reservas', to: '/admin/reservas' }],
  },
  {
    id: 'cotizacion',
    pregunta: '¿Cómo funciona una cotización?',
    respuesta:
      'En Cotizaciones crea una solicitud con cliente, destino y precio. El cliente la ve en Mis solicitudes. Cuando está aceptada, el equipo asocia un viaje y arma la reserva grupal desde Reservas.',
    palabras: ['cotizacion', 'cotización', 'solicitud', 'precio', 'convertir'],
    audiencias: ['admin', 'cliente'],
    enlaces: [
      { etiqueta: 'Cotizaciones', to: '/admin/cotizaciones' },
      { etiqueta: 'Mis solicitudes', to: '/client/solicitudes' },
    ],
  },
  {
    id: 'permisos',
    pregunta: '¿Por qué no veo un módulo?',
    respuesta:
      'Cada rol tiene permisos (leer, crear, editar, borrar) por módulo. Si no aparece Planificación, Reportes o Pagos, el administrador debe asignarlos en Usuarios y roles.',
    palabras: ['permiso', 'permisos', 'rol', 'roles', 'no veo', 'acceso', 'seguridad'],
    audiencias: ['admin'],
    enlaces: [{ etiqueta: 'Usuarios y roles', to: '/admin/usuarios-roles' }],
  },
  {
    id: 'recogida',
    pregunta: '¿Qué es un punto de recogida?',
    respuesta:
      'Es el domicilio donde la unidad busca al pasajero. El titular y cada acompañante pueden tener el suyo. En el portal se gestionan en Puntos; en admin, en el cliente o al armar la reserva.',
    palabras: ['recogida', 'domicilio', 'punto', 'parada', 'buscar'],
    audiencias: ['admin', 'cliente', 'publico'],
    enlaces: [
      { etiqueta: 'Puntos de recogida', to: '/admin/puntos-recogida' },
      { etiqueta: 'Mis puntos', to: '/client/puntos-recogida' },
    ],
  },
  {
    id: 'login',
    pregunta: '¿Cómo me registro o inicio sesión?',
    respuesta:
      'Usa Registro con tu cédula, nombre (solo letras) y correo. Luego inicia sesión. El personal de TravelBqto entra por la misma pantalla con su usuario interno.',
    palabras: ['registro', 'login', 'iniciar', 'sesion', 'sesión', 'contraseña', 'correo'],
    audiencias: ['publico', 'cliente', 'admin'],
    enlaces: [
      { etiqueta: 'Iniciar sesión', to: '/iniciar-sesion' },
      { etiqueta: 'Registrarse', to: '/registro' },
    ],
  },
  {
    id: 'asistente',
    pregunta: '¿Qué es el componente inteligente?',
    respuesta:
      'Es el chat de SIGEL: responde con datos (reportes, destinos, ocupación) y también puede orientar sobre el sistema. El manual paso a paso está en el módulo Ayuda, que es otra cosa.',
    palabras: ['inteligente', 'rci', 'asistente', 'agente', 'ia'],
    audiencias: ['admin', 'cliente', 'publico'],
    enlaces: [{ etiqueta: 'Abrir asistente', to: '/admin/asistente' }],
  },
  {
    id: 'ayuda-vs-asistente',
    pregunta: '¿En qué se diferencia Ayuda del Asistente?',
    respuesta:
      'Ayuda es el manual: preguntas frecuentes y guías paso a paso para usar SIGEL. El Asistente es el componente inteligente: un chat que responde con datos del sistema (reportes, destinos, ocupación, qué conviene programar un mes).',
    palabras: ['ayuda', 'asistente', 'diferencia', 'manual', 'guia', 'guía', 'inteligente'],
    audiencias: ['admin', 'cliente', 'publico'],
    enlaces: [
      { etiqueta: 'Ayuda', to: '/admin/ayuda' },
      { etiqueta: 'Asistente', to: '/admin/asistente' },
    ],
  },
];

export const GUIAS: GuiaInteractiva[] = [
  {
    id: 'guia-grupal',
    titulo: 'Registrar un viaje grupal',
    resumen: 'Una reserva, varias personas, sin repetir el flujo.',
    audiencias: ['admin'],
    pasos: [
      { titulo: 'Abre Nueva reserva', detalle: 'Reservas → + Nueva reserva.', to: '/admin/reservas/crear' },
      { titulo: 'Elige viaje y titular', detalle: 'El titular sí debe existir en Clientes.' },
      { titulo: 'Marca Viaje grupal', detalle: 'Escribe cuántas personas van, por ejemplo 10.' },
      { titulo: 'Completa acompañantes', detalle: 'Usa Registrar ahora en cada ficha o busca un cliente ya cargado.' },
      { titulo: 'Asientos y pago', detalle: 'Selecciona un asiento por quien ocupe puesto y registra el pago del grupo.' },
    ],
  },
  {
    id: 'guia-viaje',
    titulo: 'Publicar un viaje',
    resumen: 'Destino, bus, fechas y cupo listos para vender.',
    audiencias: ['admin'],
    pasos: [
      { titulo: 'Planificación', detalle: 'Entra al módulo de viajes.', to: '/admin/planificacion' },
      { titulo: 'Nuevo viaje', detalle: 'Destino, unidad, guías, salida y regreso posterior a la salida.' },
      { titulo: 'Costos', detalle: 'Carga combustible, guía y otros para estimar el equilibrio.' },
      { titulo: 'Reservas', detalle: 'Cuando esté publicado, el cupo aparece en Agenda y en Nueva reserva.' },
    ],
  },
  {
    id: 'guia-reportes',
    titulo: 'Consultar reportes del año',
    resumen: 'Clientes nuevos, destinos e ingresos en un rango real.',
    audiencias: ['admin'],
    pasos: [
      { titulo: 'Reportes', detalle: 'Entra a Reportes: ahí están estadísticos, pagos y el listín.', to: '/admin/reportes' },
      { titulo: 'Atajo Este año', detalle: 'O escribe desde / hasta. No se aceptan fechas futuras ni rangos invertidos.' },
      { titulo: 'Pestaña Clientes', detalle: 'Ahí está cuántos clientes se registraron en el periodo.' },
      { titulo: 'Listín', detalle: 'Pestaña Listín de viaje para el manifiesto de una salida.', to: '/admin/reportes?tipo=listin' },
    ],
  },
  {
    id: 'guia-portal',
    titulo: 'Reservar desde el portal',
    resumen: 'Cliente: viaje, compañeros, asientos y pago.',
    audiencias: ['cliente', 'publico'],
    pasos: [
      { titulo: 'Mira la agenda', detalle: 'Elige destino y fecha.', to: '/agenda' },
      { titulo: 'Inicia sesión', detalle: 'Si no tienes cuenta, regístrate primero.', to: '/iniciar-sesion' },
      { titulo: 'Añade al grupo', detalle: 'Titular + acompañantes en la misma reserva.' },
      { titulo: 'Asientos y pago', detalle: 'Selecciona puestos y carga el comprobante.' },
    ],
  },
];

export const SALUDO: Record<string, string> = {
  admin:
    'Soy el componente inteligente de SIGEL. Pregúntame cifras (clientes del año, ingresos, ocupación) o decisiones (qué destino conviene en diciembre). Si solo quieres pasos de uso, entra a Ayuda.',
  cliente:
    'Soy el asistente de TravelBqto. Puedo recomendarte cómo armar tu viaje, llevar acompañantes o pagar. Las guías paso a paso están en Ayuda.',
  publico:
    'Hola. Pregúntame cómo registrarte o reservar. Las instrucciones detalladas están en las preguntas frecuentes de Ayuda.',
};
