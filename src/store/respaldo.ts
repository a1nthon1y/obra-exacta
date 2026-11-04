import type { EtapaGuardada, ObraDatos, ProyectoEdificio } from './obraStore';
import type { PreciosUsuario } from './totalizar';

export const RESPALDO_APP = 'metra-peru' as const;
export const RESPALDO_SCHEMA = 1;

// Se aceptan respaldos de la versión anterior para no romper una obra ya guardada.
const APPS_ACEPTADAS = new Set<string>([RESPALDO_APP, 'obra-exacta']);

export interface RespaldoObra extends ObraDatos {
  app: typeof RESPALDO_APP;
  schema: number;
  exportado: string;
}

export type ResultadoImportacion =
  | { ok: true; data: ObraDatos; exportado: string; error?: undefined }
  | { ok: false; error: string; data?: undefined };

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function esTexto(v: unknown): v is string {
  return typeof v === 'string';
}

function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function esMaterial(v: unknown): boolean {
  if (!esObjeto(v)) return false;
  if (!esTexto(v.id) || !esNumero(v.cant) || !esNumero(v.comprar)) return false;
  if (v.nota !== undefined && !esTexto(v.nota)) return false;
  if (v.desglose !== undefined && !esTexto(v.desglose)) return false;
  return true;
}

function esResumenItem(v: unknown): boolean {
  if (!esObjeto(v)) return false;
  return esTexto(v.nombre)
    && (esTexto(v.valor) || esNumero(v.valor))
    && esTexto(v.unidad);
}

function esAviso(v: unknown): boolean {
  if (!esObjeto(v)) return false;
  return (v.n === 'ok' || v.n === 'warn' || v.n === 'bad') && esTexto(v.t);
}

function esResultado(v: unknown): boolean {
  if (!esObjeto(v)) return false;
  return esTexto(v.titulo)
    && esTexto(v.detalle)
    && Array.isArray(v.resumen) && v.resumen.every(esResumenItem)
    && Array.isArray(v.mats) && v.mats.every(esMaterial)
    && Array.isArray(v.avisos) && v.avisos.every(esAviso)
    && Array.isArray(v.pasos) && v.pasos.every(esTexto);
}

function esEtapa(v: unknown): v is EtapaGuardada {
  if (!esObjeto(v)) return false;
  if (!esTexto(v.id) || !esTexto(v.titulo) || !esTexto(v.detalle)) return false;
  if (!esNumero(v.timestamp) || !esResultado(v.resultado)) return false;
  if (v.proyectoId !== undefined && !esTexto(v.proyectoId)) return false;
  if (v.proyectoNombre !== undefined && !esTexto(v.proyectoNombre)) return false;
  if (v.piso !== undefined) {
    if (!Number.isInteger(v.piso) || (v.piso as number) < 1 || (v.piso as number) > 5) return false;
  }
  return true;
}

function esProyecto(v: unknown): v is ProyectoEdificio {
  if (!esObjeto(v)) return false;
  return esTexto(v.id)
    && esTexto(v.nombre)
    && Number.isInteger(v.pisos)
    && (v.pisos as number) >= 3
    && (v.pisos as number) <= 5
    && esNumero(v.creado);
}

function esListaComprados(v: unknown): v is Record<string, boolean> {
  if (!esObjeto(v)) return false;
  return Object.values(v).every(valor => typeof valor === 'boolean');
}

export function crearRespaldo(datos: ObraDatos): RespaldoObra {
  return {
    app: RESPALDO_APP,
    schema: RESPALDO_SCHEMA,
    exportado: new Date().toISOString(),
    etapas: datos.etapas,
    precios: datos.precios,
    proyectos: datos.proyectos,
    proyectoActivoId: datos.proyectoActivoId,
    pisoActivo: datos.pisoActivo,
    comprados: datos.comprados,
  };
}

export function serializarRespaldo(datos: ObraDatos): string {
  return JSON.stringify(crearRespaldo(datos), null, 2);
}

export function nombreArchivoRespaldo(fecha = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `metra-peru-${y}-${m}-${d}.json`;
}

/**
 * Valida un archivo de respaldo antes de reemplazar la obra actual. Acepta una
 * obra vacía (0 partidas), que es justamente el caso de restaurar en un equipo
 * nuevo. No confía en el archivo: comprueba app, versión y la forma de los
 * datos que luego se renderizan.
 */
export function parsearRespaldo(texto: string): ResultadoImportacion {
  let raw: unknown;
  try {
    // Algunos editores guardan el JSON con BOM; JSON.parse no lo acepta.
    raw = JSON.parse(texto.replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }

  if (!esObjeto(raw)) return { ok: false, error: 'El respaldo no tiene el formato esperado.' };
  if (!esTexto(raw.app) || !APPS_ACEPTADAS.has(raw.app)) {
    return { ok: false, error: 'No parece un respaldo de Metra Perú (falta la marca de la app).' };
  }
  if (raw.schema !== RESPALDO_SCHEMA) {
    return { ok: false, error: `Versión de respaldo no compatible (se esperaba la ${RESPALDO_SCHEMA}).` };
  }

  if (!Array.isArray(raw.etapas) || !raw.etapas.every(esEtapa)) {
    return { ok: false, error: 'El respaldo tiene partidas incompletas o dañadas.' };
  }
  if (!esObjeto(raw.precios)) {
    return { ok: false, error: 'El respaldo no contiene una lista de precios válida.' };
  }
  if (!Array.isArray(raw.proyectos) || !raw.proyectos.every(esProyecto)) {
    return { ok: false, error: 'El respaldo tiene proyectos incompletos o dañados.' };
  }
  // Los respaldos anteriores al checklist no traen `comprados`.
  let comprados: Record<string, boolean> = {};
  if (raw.comprados !== undefined) {
    if (!esListaComprados(raw.comprados)) {
      return { ok: false, error: 'El respaldo tiene una lista de compras dañada.' };
    }
    comprados = raw.comprados;
  }

  const precios: PreciosUsuario = {};
  for (const [id, precio] of Object.entries(raw.precios)) {
    if (!esNumero(precio) || precio < 0) {
      return { ok: false, error: `El precio de "${id}" no es un número válido.` };
    }
    precios[id] = precio;
  }

  const proyectos = raw.proyectos as ProyectoEdificio[];
  const proyectoActivoId = esTexto(raw.proyectoActivoId)
    && proyectos.some(p => p.id === raw.proyectoActivoId)
    ? raw.proyectoActivoId
    : null;
  const maxPiso = proyectos.find(p => p.id === proyectoActivoId)?.pisos ?? 5;
  const pisoActivo = proyectoActivoId && esNumero(raw.pisoActivo) && Number.isInteger(raw.pisoActivo)
    ? Math.max(1, Math.min(maxPiso, raw.pisoActivo))
    : 1;

  return {
    ok: true,
    exportado: esTexto(raw.exportado) ? raw.exportado : '',
    data: {
      etapas: raw.etapas as EtapaGuardada[],
      precios,
      proyectos,
      proyectoActivoId,
      pisoActivo,
      comprados,
    },
  };
}
