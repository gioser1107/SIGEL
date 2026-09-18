/** Genera un .xlsx (Office Open XML) sin dependencias externas. */

export type CeldaExcel = string | number | boolean | null | undefined;

export interface HojaExcel {
  nombre: string;
  filas: CeldaExcel[][];
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatenar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    out.set(parte, offset);
    offset += parte.length;
  }
  return out;
}

function u16(n: number): Uint8Array {
  return Uint8Array.of(n & 0xff, (n >>> 8) & 0xff);
}

function u32(n: number): Uint8Array {
  return Uint8Array.of(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
}

function armarZip(archivos: { ruta: string; contenido: Uint8Array }[]): Blob {
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;

  for (const archivo of archivos) {
    const nombre = new TextEncoder().encode(archivo.ruta);
    const crc = crc32(archivo.contenido);
    const tam = archivo.contenido.length;
    const local = concatenar([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(tam),
      u32(tam),
      u16(nombre.length),
      u16(0),
      nombre,
      archivo.contenido,
    ]);
    const central = concatenar([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(tam),
      u32(tam),
      u16(nombre.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nombre,
    ]);
    locales.push(local);
    centrales.push(central);
    offset += local.length;
  }

  const cuerpoLocal = concatenar(locales);
  const cuerpoCentral = concatenar(centrales);
  const eocd = concatenar([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(archivos.length),
    u16(archivos.length),
    u32(cuerpoCentral.length),
    u32(cuerpoLocal.length),
    u16(0),
  ]);

  const datos = concatenar([cuerpoLocal, cuerpoCentral, eocd]);
  return new Blob([datos as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function xmlTexto(valor: string): string {
  return valor
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function letraColumna(indice: number): string {
  let n = indice;
  let out = '';
  while (n >= 0) {
    out = String.fromCharCode((n % 26) + 65) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
}

function nombreHojaUnico(nombre: string, usados: Set<string>): string {
  const base = nombre.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Hoja';
  let candidato = base;
  let n = 2;
  while (usados.has(candidato.toLowerCase())) {
    const sufijo = ` ${n}`;
    candidato = `${base.slice(0, Math.max(1, 31 - sufijo.length))}${sufijo}`;
    n += 1;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function xmlCelda(valor: CeldaExcel, ref: string, encabezado: boolean): string {
  const estilo = encabezado ? ' s="1"' : '';
  if (valor === null || valor === undefined) {
    return encabezado ? `<c r="${ref}"${estilo}/>` : '';
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"${estilo}><v>${valor}</v></c>`;
  }
  if (typeof valor === 'boolean') {
    return `<c r="${ref}" t="b"${estilo}><v>${valor ? 1 : 0}</v></c>`;
  }
  const texto = xmlTexto(String(valor));
  return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${texto}</t></is></c>`;
}

function xmlHoja(filas: CeldaExcel[][]): string {
  const anchos: number[] = [];
  const filasXml = filas.map((fila, i) => {
    const r = i + 1;
    const celdas = fila.map((valor, j) => {
      const texto = valor == null ? '' : String(valor);
      anchos[j] = Math.max(anchos[j] ?? 10, Math.min(48, texto.length + 2));
      return xmlCelda(valor, `${letraColumna(j)}${r}`, i === 0);
    });
    return `<row r="${r}">${celdas.join('')}</row>`;
  });
  const cols = anchos
    .map(
      (ancho, j) =>
        `<col min="${j + 1}" max="${j + 1}" width="${ancho}" customWidth="1"/>`,
    )
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    (cols ? `<cols>${cols}</cols>` : '') +
    `<sheetData>${filasXml.join('')}</sheetData>` +
    '</worksheet>'
  );
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="2">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '</fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
  '<cellXfs count="2">' +
  '<xf xfId="0"/>' +
  '<xf xfId="0" fontId="1" applyFont="1"/>' +
  '</cellXfs>' +
  '</styleSheet>';

function utf8(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

export function crearLibroExcel(hojas: HojaExcel[]): Blob {
  if (hojas.length === 0) {
    throw new Error('El libro no tiene hojas.');
  }
  const usados = new Set<string>();
  const hojasOk = hojas.map((hoja, i) => ({
    nombre: nombreHojaUnico(hoja.nombre, usados),
    filas: hoja.filas.length > 0 ? hoja.filas : [['Sin datos']],
    indice: i + 1,
  }));

  const overrides = hojasOk
    .map(
      (hoja) =>
        `<Override PartName="/xl/worksheets/sheet${hoja.indice}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('');

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    overrides +
    '</Types>';

  const relsRoot =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const sheets = hojasOk
    .map(
      (hoja) =>
        `<sheet name="${xmlTexto(hoja.nombre)}" sheetId="${hoja.indice}" r:id="rId${hoja.indice}"/>`,
    )
    .join('');
  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${sheets}</sheets>` +
    '</workbook>';

  const relsLibroItems = [
    ...hojasOk.map(
      (hoja) =>
        `<Relationship Id="rId${hoja.indice}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${hoja.indice}.xml"/>`,
    ),
    `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
  ].join('');
  const relsLibro =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    relsLibroItems +
    '</Relationships>';

  const archivos = [
    { ruta: '[Content_Types].xml', contenido: utf8(contentTypes) },
    { ruta: '_rels/.rels', contenido: utf8(relsRoot) },
    { ruta: 'xl/workbook.xml', contenido: utf8(workbook) },
    { ruta: 'xl/_rels/workbook.xml.rels', contenido: utf8(relsLibro) },
    { ruta: 'xl/styles.xml', contenido: utf8(STYLES_XML) },
    ...hojasOk.map((hoja) => ({
      ruta: `xl/worksheets/sheet${hoja.indice}.xml`,
      contenido: utf8(xmlHoja(hoja.filas)),
    })),
  ];

  return armarZip(archivos);
}

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.rel = 'noopener';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function descargarExcel(hojas: HojaExcel[], nombreArchivo: string): void {
  descargarBlob(crearLibroExcel(hojas), nombreArchivo);
}
