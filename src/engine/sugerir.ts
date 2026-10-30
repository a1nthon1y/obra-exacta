/**
 * Predimensionado orientativo de columnas para vivienda.
 *
 * IMPORTANTE: esto NO es un diseño estructural. Son reglas prácticas de obra
 * para una casa de 1–2 pisos de albañilería confinada con muro de soga
 * (13 cm), con luces chicas.
 * Fuera de ese caso, la función devuelve `requiereIngeniero: true` y la app
 * no debe presentar la medida como segura.
 *
 * Pendiente: validar estos rangos con un ingeniero colegiado antes de publicar.
 */

import { dimensionarZapata } from './calc';

export interface SugerenciaColumna {
  b: number;
  h: number;
  nVar: number;
  dVar: string;
  dEst: string;
  rango: [number, number];
  titulo: string;
  explicacion: string;
  supuestos: string[];
  noAplica: string[];
  requiereIngeniero: boolean;
  motivo?: string;
}

const NO_APLICA = [
  '3 pisos o más',
  'Columnas libres o pórticos',
  'Muros que no sean de soga (13 cm)',
  'Luces mayores a 5 m',
  'Suelo blando, relleno o ladera',
  'Ampliaciones o plantas irregulares',
];

export function sugerirColumna(p: {
  pisos: 1 | 2 | 3;
  sis: 'confinada' | 'porticos';
  luz: number;
}): SugerenciaColumna {
  const supuestos = [
    `Vivienda familiar de ${p.pisos} piso${p.pisos > 1 ? 's' : ''}`,
    p.sis === 'confinada'
      ? 'Albañilería confinada con muro de soga (13 cm)'
      : 'Pórticos (columnas libres)',
    `Luz entre columnas: ${p.luz.toFixed(1)} m`,
    'Suelo con capacidad media',
    p.sis === 'confinada'
      ? 'Refuerzo mínimo de confinamiento: 4 varillas (Ø 3/8" o mayor según diseño, E.070)'
      : 'Cuantía entre 1% y 4% de la sección (RNE E.060)',
  ];

  // Pórticos: la columna trabaja con la viga y la losa. No hay regla práctica segura.
  if (p.sis === 'porticos') {
    return {
      b: 30,
      h: 30,
      nVar: 6,
      dVar: '5/8',
      dEst: '1/4',
      rango: [30, 30],
      titulo: 'Pórticos: necesita ingeniero',
      explicacion:
        'En pórticos la columna trabaja con la viga y la losa. La medida depende del análisis estructural; no hay una medida usual segura.',
      supuestos,
      noAplica: NO_APLICA,
      requiereIngeniero: true,
      motivo: 'Las columnas libres o pórticos necesitan cálculo estructural.',
    };
  }

  // 3 pisos o más: fuera de la envolvente de la regla práctica.
  if (p.pisos >= 3) {
    return {
      b: 30,
      h: 30,
      nVar: 6,
      dVar: '5/8',
      dEst: '1/4',
      rango: [30, 35],
      titulo: '3 pisos: necesita ingeniero',
      explicacion:
        'A partir de 3 pisos la carga y el sismo ya no se cubren con una regla práctica. Necesitas un plano estructural.',
      supuestos,
      noAplica: NO_APLICA,
      requiereIngeniero: true,
      motivo: 'Tres pisos o más requieren revisión de un ingeniero.',
    };
  }

  // Luces grandes: la viga y la columna necesitan revisión.
  if (p.luz > 5) {
    return {
      b: 30,
      h: 30,
      nVar: 6,
      dVar: '5/8',
      dEst: '1/4',
      rango: [30, 35],
      titulo: 'Luz grande: necesita ingeniero',
      explicacion: `Una luz de ${p.luz.toFixed(1)} m entre columnas es grande para una regla práctica. La viga y la columna necesitan revisión.`,
      supuestos,
      noAplica: NO_APLICA,
      requiereIngeniero: true,
      motivo: 'Luces mayores a 5 m requieren revisión de un ingeniero.',
    };
  }

  // Caso usual: 1 piso, o 2 pisos con luz chica.
  // En albañilería confinada la columna debe tener el espesor del muro (13 cm
  // en aparejo de soga). El peralte usual es 25 cm.
  if (p.pisos === 1 || p.luz <= 4) {
    const dVar = p.pisos === 1 ? '3/8' : '1/2';
    return {
      b: 13,
      h: 25,
      nVar: 4,
      dVar,
      dEst: '1/4',
      rango: [13, 25],
      titulo: 'Medida usual para tu caso',
      explicacion: `Para ${p.pisos === 1 ? 'una casa de 1 piso' : 'una casa de 2 pisos'} con muro de soga (13 cm) y luz de ${p.luz.toFixed(1)} m, la columna de confinamiento va del ancho del muro: 13 × 25 cm con 4 varillas de ${dVar}".`,
      supuestos,
      noAplica: NO_APLICA,
      requiereIngeniero: false,
    };
  }

  // 2 pisos con luz entre 4 y 5 m: se sube el peralte y el fierro.
  // En 13 cm de ancho no caben 4 Ø 1/2" en una sola capa de forma segura;
  // se usa 6 Ø 3/8" (2 por capa en peralte 30 cm), que es constructible.
  return {
    b: 13,
    h: 30,
    nVar: 6,
    dVar: '3/8',
    dEst: '1/4',
    rango: [13, 30],
    titulo: 'Medida usual para tu caso',
    explicacion: `Para 2 pisos con muro de soga y luz de ${p.luz.toFixed(1)} m, lo usual es 13 × 30 cm con 6 varillas de 3/8" (2 por capa en peralte de 30 cm).`,
    supuestos,
    noAplica: NO_APLICA,
    requiereIngeniero: false,
  };
}

// ─── ZAPATA AISLADA ───────────────────────────────────────────────────────────

export interface SugerenciaZapata {
  bCol: number;
  hCol: number;
  carga: number;      // t — carga estimada
  lado: number;       // m — lado de la zapata
  espesor: number;    // m
  pos: 'esquina' | 'borde' | 'centro';
  areaTrib: number;   // m² — área que baja a la zapata
  suelo: 'blando' | 'intermedio' | 'duro' | 'manual';
  pa: number;         // kg/cm² efectiva
  cant: number;       // zapatas asumidas para el metrado
  supuestos: string[];
  noAplica: string[];
  requiereIngeniero: boolean;
  motivo?: string;
  aviso?: string;
}

/**
 * Estimación orientativa de zapata aislada a partir del paño entre columnas.
 *
 * No pedimos toneladas: estimamos la carga con el área tributaria de la
 * columna (esquina, borde o centro) y 1.0 t/m² por piso (techo + muros +
 * uso). Es una regla de metrado, no un cálculo estructural. El tamaño final
 * lo define el ingeniero.
 */
export function sugerirZapata(p: {
  pisos: 1 | 2 | 3;
  luz: number;
  suelo: 'blando' | 'intermedio' | 'duro' | 'manual';
  pa?: number;
  sis: 'confinada' | 'porticos';
  pos: 'esquina' | 'borde' | 'centro';
}): SugerenciaZapata {
  const factor = p.pos === 'esquina' ? 0.25 : p.pos === 'borde' ? 0.5 : 1.0;
  const areaTrib = p.luz * p.luz * factor;
  const carga = Math.max(5, Math.ceil(areaTrib * p.pisos));
  const posLabel = p.pos === 'esquina'
    ? 'esquina (2 muros)'
    : p.pos === 'borde'
      ? 'borde (1 muro)'
      : 'centro (columna interior)';
  const supuestos = [
    `Vivienda de ${p.pisos} piso${p.pisos > 1 ? 's' : ''}`,
    `Columna de ${posLabel}: área que baja a la zapata ${areaTrib.toFixed(1)} m²`,
    'Carga estimada: 1.0 t/m² por piso (techo + muros + uso)',
    'Mínimo 5 t por zapata',
    'Espesor inicial: 40 cm',
    '4 zapatas para el metrado (puedes ajustar la cantidad)',
  ];
  const noAplica = [
    '3 pisos o más',
    'Luces mayores a 5 m',
    'Suelo blando, relleno o ladera',
    'Pórticos con cargas grandes o plantas irregulares',
  ];

  if (p.pisos >= 3) {
    return {
      bCol: 30,
      hCol: 30,
      carga,
      lado: 0,
      espesor: 0,
      pos: p.pos,
      areaTrib,
      suelo: p.suelo,
      pa: 0,
      cant: 4,
      supuestos,
      noAplica,
      requiereIngeniero: true,
      motivo: 'A partir de 3 pisos la zapata necesita revisión de un ingeniero.',
    };
  }

  if (p.luz > 5) {
    return {
      bCol: 30,
      hCol: 30,
      carga,
      lado: 0,
      espesor: 0,
      pos: p.pos,
      areaTrib,
      suelo: p.suelo,
      pa: 0,
      cant: 4,
      supuestos,
      noAplica,
      requiereIngeniero: true,
      motivo: 'Una luz mayor a 5 m entre columnas necesita revisión de un ingeniero.',
    };
  }

  if (p.suelo === 'manual' && (!p.pa || p.pa <= 0)) {
    return {
      bCol: 30,
      hCol: 30,
      carga,
      lado: 0,
      espesor: 0,
      pos: p.pos,
      areaTrib,
      suelo: p.suelo,
      pa: 0,
      cant: 4,
      supuestos,
      noAplica,
      requiereIngeniero: true,
      motivo: 'Falta la presión admisible del suelo para poder estimar la zapata.',
    };
  }

  // Suelo blando y pórticos figuran en `noAplica`: no se devuelve una medida
  // como si fuera segura, aunque el usuario haya completado todos los campos.
  if (p.suelo === 'blando') {
    return {
      bCol: 30,
      hCol: 30,
      carga,
      lado: 0,
      espesor: 0,
      pos: p.pos,
      areaTrib,
      suelo: p.suelo,
      pa: 0,
      cant: 4,
      supuestos,
      noAplica,
      requiereIngeniero: true,
      motivo: 'Suelo blando, relleno o ladera: la presión admisible y el tipo de cimentación los define el estudio de suelos. Revisa con un ingeniero.',
    };
  }

  if (p.sis === 'porticos') {
    return {
      bCol: 30,
      hCol: 30,
      carga,
      lado: 0,
      espesor: 0,
      pos: p.pos,
      areaTrib,
      suelo: p.suelo,
      pa: 0,
      cant: 4,
      supuestos,
      noAplica,
      requiereIngeniero: true,
      motivo: 'En pórticos el tamaño de la zapata depende del análisis estructural (carga y momento de la columna). Revisa con un ingeniero.',
    };
  }

  // La columna de referencia sale del mismo motor de Columnas.
  const col = sugerirColumna({ pisos: p.pisos, sis: p.sis, luz: p.luz });
  const dim = dimensionarZapata({
    bCol: col.b,
    hCol: col.h,
    carga,
    suelo: p.suelo,
    pa: p.pa ?? 0,
    espesor: 40,
  });

  if ('error' in dim) {
    return {
      bCol: col.b,
      hCol: col.h,
      carga,
      lado: 0,
      espesor: 0,
      pos: p.pos,
      areaTrib,
      suelo: p.suelo,
      pa: 0,
      cant: 4,
      supuestos,
      noAplica,
      requiereIngeniero: true,
      motivo: dim.error,
    };
  }

  const aviso = p.sis === 'confinada'
    ? 'En albañilería confinada lo usual es cimiento corrido. Esta zapata aislada es una alternativa; revisa con tu ingeniero.'
    : 'En pórticos la zapata aislada es lo usual, pero el tamaño depende del cálculo estructural.';

  return {
    bCol: col.b,
    hCol: col.h,
    carga,
    lado: dim.lado,
    espesor: dim.espesor,
    pos: p.pos,
    areaTrib,
    suelo: p.suelo,
    pa: dim.pa,
    cant: 4,
    supuestos,
    noAplica,
    requiereIngeniero: false,
    aviso,
  };
}
