export type AudienciaAsistente = 'admin' | 'cliente' | 'publico';

export interface EnlaceAsistente {
  etiqueta: string;
  to: string;
}

export interface EntradaConocimiento {
  id: string;
  pregunta: string;
  respuesta: string;
  palabras: string[];
  audiencias: AudienciaAsistente[];
  enlaces?: EnlaceAsistente[];
}

export interface PasoGuia {
  titulo: string;
  detalle: string;
  to?: string;
}

export interface GuiaInteractiva {
  id: string;
  titulo: string;
  resumen: string;
  audiencias: AudienciaAsistente[];
  pasos: PasoGuia[];
}

export interface MensajeAsistente {
  id: string;
  rol: 'usuario' | 'asistente';
  texto: string;
  enlaces?: EnlaceAsistente[];
}
