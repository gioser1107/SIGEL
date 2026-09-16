import { PREGUNTAS_FRECUENTES, SALUDO } from './conocimiento';
import { responderConDatos, type ContextoAsistente } from './datosAsistente';
import type { AudienciaAsistente, EntradaConocimiento } from './tipos';

function tokens(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter((t) => t.length > 2);
}

function puntuar(pregunta: string, entrada: EntradaConocimiento): number {
  const tPregunta = new Set(tokens(pregunta));
  if (tPregunta.size === 0) return 0;
  const tEntrada = new Set([
    ...tokens(entrada.pregunta),
    ...entrada.palabras.map((p) => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
  ]);
  let puntos = 0;
  tPregunta.forEach((t) => {
    if (tEntrada.has(t)) puntos += 2;
    tEntrada.forEach((e) => {
      if (e.includes(t) || t.includes(e)) puntos += 1;
    });
  });
  return puntos;
}

function enlaceVisible(to: string, audiencia: AudienciaAsistente): boolean {
  if (audiencia === 'admin') return true;
  if (to.startsWith('/admin')) return false;
  if (audiencia === 'publico' && to.startsWith('/client')) return false;
  return true;
}

export function responderPregunta(
  pregunta: string,
  audiencia: AudienciaAsistente,
  contexto?: ContextoAsistente,
): { texto: string; enlaces?: EntradaConocimiento['enlaces'] } {
  const limpia = pregunta.trim();
  if (!limpia) {
    return { texto: SALUDO[audiencia] };
  }

  if (audiencia === 'admin') {
    const conDatos = responderConDatos(limpia, contexto ?? {});
    if (conDatos) {
      return {
        texto: conDatos,
        enlaces: [{ etiqueta: 'Ver reportes', to: '/admin/reportes' }],
      };
    }
  }

  const visibles = PREGUNTAS_FRECUENTES.filter((e) => e.audiencias.includes(audiencia));
  const ranqueadas = visibles
    .map((entrada) => ({ entrada, puntos: puntuar(limpia, entrada) }))
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);

  if (ranqueadas.length === 0) {
    return {
      texto:
        audiencia === 'admin'
          ? 'Puedo hablar de números (clientes del año, ingresos, ocupación) o de operación (qué destino conviene en un mes, cómo armar un viaje grupal). Pregúntame de nuevo con un dato o un módulo.'
          : 'Puedo ayudarte a reservar, pagar o cargar un punto de recogida. Si buscas cifras de la agencia, eso lo ve el equipo en el asistente interno.',
    };
  }

  const mejor = ranqueadas[0].entrada;
  const enlaces = (mejor.enlaces ?? []).filter((e) => enlaceVisible(e.to, audiencia));
  return {
    texto: mejor.respuesta,
    enlaces: enlaces.length ? enlaces : undefined,
  };
}

export function sugerenciasAsistente(audiencia: AudienciaAsistente): string[] {
  if (audiencia === 'admin') {
    return [
      '¿Qué destino conviene sacar en diciembre?',
      '¿Cuántos clientes se registraron este año?',
      '¿Cuáles destinos venden más?',
    ];
  }
  if (audiencia === 'cliente') {
    return ['¿Qué destinos me recomiendas?', '¿Puedo viajar con acompañantes?', '¿Cómo registro un pago?'];
  }
  return ['¿Cómo me registro?', '¿Dónde veo la agenda?', '¿Qué es un punto de recogida?'];
}
