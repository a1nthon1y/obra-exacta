// ─── Tipos del motor de cálculo ───────────────────────────────────────────────

export type NivelAviso = 'ok' | 'warn' | 'bad';

export interface Aviso {
  n: NivelAviso;
  t: string;
}

export interface MaterialResultado {
  id: string;       // clave del catálogo
  cant: number;     // cantidad exacta calculada
  comprar: number;  // cantidad redondeada a lo que se vende
  nota?: string;
  desglose?: string; // detalle u origen de la suma (ej: "54.8 cimiento + 7.0 sobrecimiento")
}

export interface ResultadoCalculo {
  titulo: string;
  detalle: string;
  resumen: Array<{ nombre: string; valor: number | string; unidad: string }>;
  mats: MaterialResultado[];
  avisos: Aviso[];
  pasos: string[];
}

export interface ResultadoError {
  error: string;
}

export type Resultado = ResultadoCalculo | ResultadoError;

export function esError(r: Resultado): r is ResultadoError {
  return 'error' in r;
}

// ─── Catálogo de materiales ────────────────────────────────────────────────────
export interface CatItem {
  nombre: string;
  unidad: string;
  precio: number;   // soles
  grupo: string;
  fuente?: string;
}

export type Catalogo = Record<string, CatItem>;

// ─── Parámetros de entrada por calculadora ────────────────────────────────────
export interface ParamsCimientos {
  largo: number;     // m — largo total del cimiento
  ancho: number;     // m — ancho del cimiento
  prof: number;      // m — profundidad de excavación
  esp: number;       // m — espesor del sobrecimiento
  alto: number;      // m — alto del sobrecimiento
}

export interface ParamsMuros {
  largo: number;     // m
  alto: number;      // m
  aberturas: number; // m² (puertas + ventanas)
  aparejo: 'soga' | 'cabeza' | 'canto';
  ladrillo: 'kk18' | 'pand';
  lb: number;        // cm largo ladrillo
  ab: number;        // cm ancho
  hb: number;        // cm alto
  junta: number;     // cm
  desL: number;      // % desperdicio ladrillo
  desM: number;      // % desperdicio mortero
  mezcla: number;    // 1:N (N = arena)
  uso: 'portante' | 'tabique';
}

export interface ParamsColumnas {
  b: number;         // cm base
  h: number;         // cm altura de sección
  alto: number;      // m altura de columna
  cant: number;      // cantidad
  nVar: number;      // varillas longitudinales
  dVar: string;      // diámetro varilla (ej: '5/8')
  dEst: string;      // diámetro estribo
  rec: number;       // cm recubrimiento
  fc: 140 | 175 | 210 | 245 | 280;
  sis: 'confinada' | 'porticos';
}

export interface ParamsVigas {
  b: number;         // cm base
  h: number;         // cm peralte
  luz: number;       // m longitud
  cant: number;
  nSup: number;      // varillas superiores
  dSup: string;
  nInf: number;      // varillas inferiores
  dInf: string;
  dEst: string;
  rec: number;       // cm
  fc: 140 | 175 | 210 | 245 | 280;
}

export interface ParamsLosa {
  largo: number;     // m
  ancho: number;     // m
  espesor: 'auto' | 17 | 20 | 25 | 30;
  fc: 140 | 175 | 210 | 245 | 280;
  nInf: number;
  dInf: string;
  nBast: number;
  dBast: string;
}

export interface ParamsAcabados {
  aTarr: number;     // m² tarrajeo
  eTarr: number;     // cm espesor tarrajeo
  aPint: number;     // m² pintura
  manos: number;     // manos de pintura
  rendP: number;     // m²/gal rendimiento pintura
  aPiso: number;     // m² piso
  perd: number;      // % desperdicio cerámico
  contra: 'si' | 'no';
  eContra: number;   // cm espesor contrapiso
}

export interface ParamsEscalera {
  altura: number;          // m — altura entre pisos (nivel a nivel)
  ancho: number;           // m — ancho libre del tramo
  huella: 'auto' | number; // cm — 'auto' = 27 (típico vivienda)
  fc: 140 | 175 | 210 | 245 | 280;
}

export interface ParamsZapata {
  tipo: 'aislada';
  bCol: number;      // cm base columna
  hCol: number;      // cm altura columna
  carga: number;     // toneladas (tn) - carga axial orientativa
  suelo: 'blando' | 'intermedio' | 'duro' | 'manual';
  pa: number;        // kg/cm² presión admisible (si manual)
  espesor: number;   // cm espesor inicial/orientativo
  dVar: string;      // diámetro varilla
  fc: 140 | 175 | 210 | 245 | 280;
  cant: number;      // número de zapatas
}

export type ParamsCalculo =
  | ParamsCimientos
  | ParamsMuros
  | ParamsColumnas
  | ParamsVigas
  | ParamsLosa
  | ParamsAcabados
  | ParamsEscalera
  | ParamsZapata;

export type IdCalculadora = 'cimientos' | 'muros' | 'columnas' | 'vigas' | 'losa' | 'acabados' | 'escalera' | 'zapata';
