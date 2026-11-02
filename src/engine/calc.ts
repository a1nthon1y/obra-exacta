import TABLAS from './tablas.json';
import type {
  Resultado,
  ParamsCimientos,
  ParamsMuros,
  ParamsColumnas,
  ParamsVigas,
  ParamsLosa,
  ParamsAcabados,
  ParamsEscalera,
  ParamsZapata,
  ParamsCalculo,
  Aviso,
} from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ceil1 = (n: number) => Math.ceil(n * 10) / 10;

function comprarEntero(n: number): number { return Math.ceil(n); }

const MAYORACION_ZAPATA = 1.10; // 10% peso propio y relleno (criterio práctico de obra; no es exigencia de E.050)

function aceroData(diam: string) {
  const a = (TABLAS.acero as Record<string, { kg_ml: number; varilla_m: number; id_cat: string }>)[diam];
  if (!a) throw new Error(`Diámetro desconocido: ${diam}`);
  return a;
}

/**
 * Varillas de 9 m necesarias para `cantidad` piezas de `largo` metros.
 * Plan de corte simple: caben floor(8.7 / largo) piezas por varilla (los 0.3 m
 * restantes cubren el corte). Evita el subconteo de comprar por longitud total:
 * con vigas de 4.5 m cada barra de 9 m rinde una sola pieza y el desperdicio
 * real es ~45%, no el 5% que suponía la fórmula anterior.
 */
function varillasDe9m(cantidad: number, largo: number): number {
  if (cantidad <= 0 || largo <= 0) return 0;
  const porVarilla = Math.max(1, Math.floor(8.7 / largo));
  return Math.ceil(cantidad / porVarilla);
}

function dosConcreto(fc: number) {
  const d = (TABLAS.concreto as Record<string, { bolsas: number; arena: number; piedra: number; agua: number }>)[String(fc)];
  if (!d) throw new Error(`f'c desconocido: ${fc}`);
  return d;
}

function dosMortero(n: number) {
  const key = `1:${n}` as keyof typeof TABLAS.mortero;
  const d = TABLAS.mortero[key];
  if (!d) throw new Error(`Mezcla desconocida: 1:${n}`);
  return d;
}

/**
 * Cantidad exacta de varillas (admite decimales) para una longitud en metros.
 *
 * Regla del proyecto: `cant` de un material va SIEMPRE en la unidad del
 * catálogo (varilla, bolsa, m³, kg…). El acero no se guarda en kg porque el
 * catálogo lo vende por varilla de 9 m. El redondeo comercial se hace al
 * consolidar la obra, después de sumar todas las partidas.
 */
function varillasExactas(longitudM: number, a: { varilla_m: number }): number {
  return longitudM / a.varilla_m;
}

// ─── 1. CIMIENTOS Y SOBRECIMIENTOS ─────────────────────────────────────────────
export function calcCimientos(p: ParamsCimientos): Resultado {
  if (p.largo <= 0 || p.ancho <= 0 || p.prof <= 0 || p.esp <= 0 || p.alto <= 0)
    return { error: 'Todas las medidas deben ser mayores a cero (incluido el espesor del sobrecimiento).' };

  // `prof` es la profundidad de la zanja, no la altura del cimiento. El cimiento
  // ciclópeo ocupa solo la parte inferior; el sobrecimiento sube desde su
  // cabeza hasta la altura visible. Antes se llenaba toda la zanja de cimiento
  // y se multiplicaba el concreto (y el cemento) por la profundidad de excavación.
  const altoCimiento = p.altoCimiento && p.altoCimiento > 0
    ? p.altoCimiento
    : Math.min(0.50, p.prof);
  if (altoCimiento > p.prof)
    return { error: 'La altura del cimiento no puede superar la profundidad de la zanja.' };

  const avisos: Aviso[] = [];
  const altoSobreEnterrado = Math.max(p.prof - altoCimiento, 0);
  const altoSobreTotal = altoSobreEnterrado + p.alto;

  // 1. Excavación de zanja
  const volExcavacion = p.largo * p.ancho * p.prof;

  // 2. Cimiento ciclópeo 1:10 + 30% piedra grande PG (Capeco)
  const dosC = TABLAS.cimientoCiclopeo['1:10+30%piedra'];
  const volCimiento = p.largo * p.ancho * altoCimiento;
  const cemCimiento = volCimiento * dosC.bolsas * 1.05; // 2.9 bolsas/m³ + 5% desp.
  const hormigonCimiento = volCimiento * dosC.hormigon; // 0.83 m³/m³
  const piedraCimiento = volCimiento * dosC.piedra;     // 0.48 m³/m³ de PG

  // 3. Sobrecimiento 1:8 + 25% piedra mediana PM (Capeco)
  // Se vacía desde la cabeza del cimiento hasta la altura visible. La parte
  // enterrada también consume concreto, aunque luego se rellene.
  const dosS = TABLAS.cimientoCiclopeo['1:8+25%piedra'];
  const volSobre = p.largo * p.esp * altoSobreTotal;
  const cemSobre = volSobre * dosS.bolsas * 1.05;      // 3.7 bolsas/m³ + 5% desp.
  const hormigonSobre = volSobre * dosS.hormigon;      // 0.85 m³/m³
  const piedraSobre = volSobre * dosS.piedra;          // 0.40 m³/m³ de PM

  // Encofrado de sobrecimiento: 2 caras laterales de la parte visible. La
  // zanja hace de encofrado en la parte enterrada.
  const encofrado = p.largo * p.alto * 2;

  const cemTotal = cemCimiento + cemSobre;
  const hormigonTotal = hormigonCimiento + hormigonSobre;

  // Reglas de práctica peruana para cimiento corrido. El ancho y la profundidad
  // los define el estudio de suelos (RNE E.050) y el detalle de cimentación;
  // aquí solo avisamos cuando la medida se aleja de lo usual en vivienda.
  if (p.prof < 0.80)
    avisos.push({ n: 'warn', t: `Profundidad de zanja ${p.prof.toFixed(2)} m: en vivienda lo usual es desplantar 0.80 m o más. La profundidad real la define el estudio de suelos (RNE E.050).` });
  if (p.ancho < 0.50)
    avisos.push({ n: 'bad', t: `Ancho de cimiento ${p.ancho.toFixed(2)} m: para muros portantes de vivienda lo habitual es 0.50 m o más (regla de obra; el ancho final lo define el diseño de cimentación).` });
  if (p.alto < 0.30)
    avisos.push({ n: 'warn', t: `Sobrecimiento visible de ${p.alto.toFixed(2)} m: se recomienda mínimo 0.30 m sobre el nivel del terreno para proteger el ladrillo de la humedad.` });
  if (altoCimiento < 0.30)
    avisos.push({ n: 'warn', t: `Altura de cimiento ${altoCimiento.toFixed(2)} m: es baja para un cimiento ciclópeo; lo usual en vivienda es 0.40–0.60 m.` });
  if (altoSobreEnterrado > 0.50)
    avisos.push({ n: 'warn', t: `El sobrecimiento tiene ${altoSobreEnterrado.toFixed(2)} m enterrados: ese concreto no se ve pero se paga. Si el estudio de suelos lo permite, sube la altura del cimiento o reduce la zanja.` });

  const pasos = [
    `1. EXCAVACIÓN DE ZANJA:`,
    `   ${p.largo} m (largo) × ${p.ancho} m (ancho) × ${p.prof} m (prof.) = ${volExcavacion.toFixed(2)} m³ de zanja.`,
    `2. CIMIENTO CORRIDO (Mezcla 1:10 + 30% Piedra Grande - Capeco):`,
    `   • Volumen: ${p.largo} m × ${p.ancho} m × ${altoCimiento.toFixed(2)} m (alto del cimiento) = ${volCimiento.toFixed(2)} m³.`,
    `   • Cemento: ${volCimiento.toFixed(2)} m³ × ${dosC.bolsas} bol/m³ × 1.05 (desp. 5%) = ${cemCimiento.toFixed(1)} bolsas.`,
    `   • Hormigón de río: ${volCimiento.toFixed(2)} m³ × ${dosC.hormigon} m³/m³ = ${hormigonCimiento.toFixed(2)} m³.`,
    `   • Piedra Grande de Zanja (8"-10"): ${volCimiento.toFixed(2)} m³ × ${dosC.piedra} m³/m³ = ${piedraCimiento.toFixed(2)} m³.`,
    `3. SOBRECIMIENTO (Mezcla 1:8 + 25% Piedra Mediana - Capeco):`,
    `   • Altura total: ${p.prof.toFixed(2)} m (zanja) − ${altoCimiento.toFixed(2)} m (cimiento) + ${p.alto.toFixed(2)} m (visible) = ${altoSobreTotal.toFixed(2)} m.`,
    `   • Volumen: ${p.largo} m × ${p.esp} m × ${altoSobreTotal.toFixed(2)} m = ${volSobre.toFixed(2)} m³.`,
    `   • Cemento: ${volSobre.toFixed(2)} m³ × ${dosS.bolsas} bol/m³ × 1.05 = ${cemSobre.toFixed(1)} bolsas.`,
    `   • Hormigón: ${volSobre.toFixed(2)} m³ × ${dosS.hormigon} m³/m³ = ${hormigonSobre.toFixed(2)} m³.`,
    `   • Piedra Mediana (3"-4"): ${volSobre.toFixed(2)} m³ × ${dosS.piedra} m³/m³ = ${piedraSobre.toFixed(2)} m³.`,
    `4. ENCOFRADO DE SOBRECIMIENTO (parte visible):`,
    `   ${p.largo} m × ${p.alto} m × 2 caras = ${encofrado.toFixed(1)} m² de contacto de madera.`,
    `5. QUÉ COMPRAR EN FERRETERÍA (Redondeo comercial seguro):`,
    `   • Cemento Portland Tipo I: ${cemTotal.toFixed(1)} bolsas → Comprar ${comprarEntero(cemTotal)} bolsas.`,
    `   • Hormigón: ${hormigonTotal.toFixed(2)} m³ → Comprar ${ceil1(hormigonTotal)} m³.`,
    `   • Piedra Grande (PG): ${piedraCimiento.toFixed(2)} m³ → Comprar ${ceil1(piedraCimiento)} m³.`,
    `   • Piedra Mediana (PM): ${piedraSobre.toFixed(2)} m³ → Comprar ${ceil1(piedraSobre)} m³.`,
    `   • Madera para encofrar: ${encofrado.toFixed(1)} m² → Comprar ${ceil1(encofrado)} m².`,
  ];

  return {
    titulo: 'Cimientos',
    detalle: `${p.largo} m de cimiento corrido (${p.ancho}×${altoCimiento.toFixed(2)} m) + sobrecimiento ${altoSobreTotal.toFixed(2)} m total (${p.alto.toFixed(2)} m visible)`,
    resumen: [
      { nombre: 'Excavación', valor: volExcavacion.toFixed(2), unidad: 'm³' },
      { nombre: 'Cimiento', valor: volCimiento.toFixed(2), unidad: 'm³' },
      { nombre: 'Sobrecimiento', valor: volSobre.toFixed(2), unidad: 'm³' },
      { nombre: 'Cemento total', valor: comprarEntero(cemTotal), unidad: 'bolsas' },
      { nombre: 'Hormigón', valor: ceil1(hormigonTotal), unidad: 'm³' },
      { nombre: 'Piedra Grande (PG)', valor: ceil1(piedraCimiento), unidad: 'm³' },
      { nombre: 'Piedra Mediana (PM)', valor: ceil1(piedraSobre), unidad: 'm³' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemTotal,           comprar: comprarEntero(cemTotal), desglose: `Cimiento: ${cemCimiento.toFixed(1)} bol + Sobrecimiento: ${cemSobre.toFixed(1)} bol = ${cemTotal.toFixed(1)} bol` },
      { id: 'hormigon',        cant: hormigonTotal,      comprar: ceil1(hormigonTotal),    desglose: `Cimiento: ${hormigonCimiento.toFixed(2)} m³ + Sobrecimiento: ${hormigonSobre.toFixed(2)} m³` },
      { id: 'piedra_grande',   cant: piedraCimiento,     comprar: ceil1(piedraCimiento), nota: 'Para zanja', desglose: `${volCimiento.toFixed(2)} m³ cimiento × 0.48 m³/m³ PG` },
      { id: 'piedra_mediana',  cant: piedraSobre,        comprar: ceil1(piedraSobre),    nota: 'Para sobrecimiento', desglose: `${volSobre.toFixed(2)} m³ sobrec. × 0.40 m³/m³ PM` },
      { id: 'madera_encofrado', cant: encofrado,         comprar: ceil1(encofrado),      desglose: `${p.largo} m × ${p.alto} m × 2 caras visibles` },
    ],
    avisos,
    pasos,
  };
}

// ─── 2. MUROS DE ALBAÑILERÍA ──────────────────────────────────────────────────
export function calcMuros(p: ParamsMuros): Resultado {
  if (p.largo <= 0 || p.alto <= 0) return { error: 'Largo y alto deben ser mayores a cero.' };
  if (p.aberturas >= p.largo * p.alto) return { error: 'Las aberturas superan el área total del muro.' };

  const avisos: Aviso[] = [];

  const key = `${p.ladrillo}_${p.aparejo}` as keyof typeof TABLAS.ladrillos;
  const dosLad = TABLAS.ladrillos[key] ?? TABLAS.ladrillos['kk18_soga'];

  // Medidas del ladrillo (respaldo: KK18 estándar 24×13×9 cm, junta 1.5 cm)
  const lb = p.lb > 0 ? p.lb : 24;
  const ab = p.ab > 0 ? p.ab : 13;
  const hb = p.hb > 0 ? p.hb : 9;
  const junta = p.junta > 0 ? p.junta : 1.5;

  const areaBruta = p.largo * p.alto;
  const areaNeta  = areaBruta - p.aberturas;

  // Esbeltez (altura / espesor efectivo según RNE E.070 Art. 19.1.a: t ≥ h/20)
  const espesorMuro = p.aparejo === 'soga' ? ab / 100
                    : p.aparejo === 'cabeza' ? lb / 100
                    : hb / 100;
  const esbeltez = p.alto / espesorMuro;

  if (esbeltez > 20) {
    if (p.uso === 'portante')
      avisos.push({ n: 'bad', t: `Esbeltez ${esbeltez.toFixed(1)}: la altura del muro es excesiva para su espesor (máximo 20 para muros portantes, RNE E.070). Se necesita mayor espesor (aparejo de cabeza) o una viga que divida la altura del paño. Revísalo con un ingeniero.` });
    else
      avisos.push({ n: 'warn', t: `Esbeltez ${esbeltez.toFixed(1)}: el muro es muy esbelto para su espesor. Aunque es tabique (no portante), conviene usar mayor espesor o anclajes.` });
  }
  else if (esbeltez > 17 && p.uso === 'portante')
    avisos.push({ n: 'warn', t: `Esbeltez ${esbeltez.toFixed(1)}: cerca del límite sísmico. Que un ingeniero colegiado revise el refuerzo antes de construir.` });

  if (p.ladrillo === 'pand' && p.uso === 'portante')
    avisos.push({ n: 'bad', t: 'NO PERMITIDO EN MURO PORTANTE: el RNE E.070 no admite unidades tubulares (pandereta) en muros portantes y exige f\'b ≥ 50 kg/cm² en la unidad. Use ladrillo King Kong 18 huecos.' });

  if (p.ladrillo === 'pand')
    avisos.push({ n: 'warn', t: 'Pandereta: el mortero de asentado puede consumir 1.5–2× el del KK18 porque los huecos tubulares se llenan. El cálculo usa el consumo del KK18; sube el desperdicio de mezcla a 50–100% o verifica el consumo con tu maestro de obra.' });

  const mezclaNum = Number(p.mezcla);
  if (p.uso === 'portante' && mezclaNum > 5)
    avisos.push({ n: 'warn', t: `Mezcla 1:${mezclaNum}: para muros portantes la norma peruana especifica mortero 1:4 o 1:5.` });

  // Rendimiento unitario: fórmula geométrica del Manual del Maestro Constructor
  // (Aceros Arequipa): 1 ÷ [(cara visible + junta) × (alto + junta)]. La tabla de
  // Capeco queda solo como referencia; al usar siempre la fórmula se evitan saltos
  // de medida entre el KK18 soga/cabeza/canto y se cuenta honestamente el ladrillo
  // que realmente entra en el muro.
  const caraCm  = p.aparejo === 'cabeza' ? ab : lb;   // cara expuesta del ladrillo
  const altCm   = p.aparejo === 'canto'  ? ab : hb;   // otra dimensión de la cara
  const undM2 = 1 / (((caraCm + junta) / 100) * ((altCm + junta) / 100));
  const fuenteUnd = 'fórmula según medidas';
  const morteroM2 = dosLad.mortero_m3;

  // Ladrillos
  const ladNeto = areaNeta * undM2;
  const ladTot  = ladNeto * (1 + p.desL / 100);

  // Mortero (consumo publicado para KK18; el ladrillo hueco puede filtrar hasta el
  // doble porque los huecos lo absorben — el usuario ajusta con el % de desperdicio)
  const morNeto = areaNeta * morteroM2;
  const morTot  = morNeto  * (1 + p.desM / 100);

  const dosMort = dosMortero(mezclaNum);
  const cemMuros   = morTot * dosMort.bolsas;
  const arenaMuros = morTot * dosMort.arena;

  const pasos = [
    `1. MEDICIÓN DE SUPERFICIE:`,
    `   Área bruta: ${p.largo} m × ${p.alto} m = ${areaBruta.toFixed(2)} m².`,
    `   Menos vanos (puertas y ventanas): ${p.aberturas.toFixed(2)} m² → Área neta efectiva: ${areaNeta.toFixed(2)} m².`,
    `2. LADRILLOS (${p.ladrillo === 'kk18' ? 'King Kong 18 huecos' : 'Pandereta'} en aparejo de ${p.aparejo}):`,
    `   • Factor unitario: ${undM2.toFixed(1)} ladrillos/m² (${fuenteUnd}).`,
    `   • Ladrillos netos: ${areaNeta.toFixed(2)} m² × ${undM2.toFixed(1)} = ${ladNeto.toFixed(0)} unidades.`,
    `   • Con desperdicio de rotura (+${p.desL}%): ${ladTot.toFixed(0)} unidades.`,
    `3. MORTERO DE ASENTADO (Proporción 1:${p.mezcla}):`,
    `   • Volumen mortero neto: ${areaNeta.toFixed(2)} m² × ${morteroM2} m³/m² = ${morNeto.toFixed(3)} m³.`,
    `   • Con desperdicio de mezcla (+${p.desM}%): ${morTot.toFixed(3)} m³.`,
    `   • Cemento para mortero: ${morTot.toFixed(3)} m³ × ${dosMort.bolsas} bol/m³ = ${cemMuros.toFixed(1)} bolsas.`,
    `   • Arena gruesa lavada: ${morTot.toFixed(3)} m³ × ${dosMort.arena} = ${arenaMuros.toFixed(2)} m³.`,
    `4. REVISIÓN SÍSMICA RNE E.070:`,
    `   • Espesor de muro: ${(espesorMuro * 100).toFixed(0)} cm.`,
    `   • Esbeltez (H/e) = ${p.alto} / ${espesorMuro.toFixed(2)} = ${esbeltez.toFixed(1)} (Límite normativo = 20).`,
    `5. QUÉ COMPRAR EN FERRETERÍA:`,
    `   • Ladrillos: Comprar ${comprarEntero(ladTot)} und (~${(ladTot / 1000).toFixed(2)} millares).`,
    `   • Cemento Portland: ${cemMuros.toFixed(1)} bolsas → Comprar ${comprarEntero(cemMuros)} bolsas.`,
    `   • Arena gruesa: ${arenaMuros.toFixed(2)} m³ → Comprar ${ceil1(arenaMuros)} m³.`,
  ];

  const idLad = p.ladrillo === 'kk18' ? 'ladrillo_kk18' : 'ladrillo_pand';

  return {
    titulo: 'Muros',
    detalle: `${areaNeta.toFixed(1)} m² de muro en aparejo de ${p.aparejo}`,
    resumen: [
      { nombre: 'Área neta', valor: areaNeta.toFixed(1), unidad: 'm²' },
      { nombre: 'Ladrillos a comprar', valor: comprarEntero(ladTot), unidad: 'und' },
      { nombre: 'Cemento mortero', valor: comprarEntero(cemMuros), unidad: 'bolsas' },
      { nombre: 'Arena gruesa', valor: ceil1(arenaMuros), unidad: 'm³' },
      { nombre: 'Esbeltez RNE E.070', valor: esbeltez.toFixed(1), unidad: '' },
    ],
    mats: [
      { id: idLad,          cant: ladTot,     comprar: comprarEntero(ladTot), desglose: `${areaNeta.toFixed(1)} m² × ${undM2.toFixed(1)} und/m² (${fuenteUnd}, +${p.desL}% rotura)` },
      { id: 'cemento',      cant: cemMuros,   comprar: comprarEntero(cemMuros), desglose: `${morTot.toFixed(2)} m³ mortero × ${dosMort.bolsas} bol/m³ (1:${p.mezcla})` },
      { id: 'arena_gruesa', cant: arenaMuros, comprar: ceil1(arenaMuros),       desglose: `${morTot.toFixed(2)} m³ mortero × ${dosMort.arena} m³/m³` },
    ],
    avisos,
    pasos,
  };
}

// ─── 3. COLUMNAS ──────────────────────────────────────────────────────────────
export function calcColumnas(p: ParamsColumnas): Resultado {
  if (p.b <= 0 || p.h <= 0 || p.alto <= 0 || p.cant <= 0)
    return { error: 'Sección, altura y cantidad deben ser mayores a cero.' };

  const avisos: Aviso[] = [];
  const dos = dosConcreto(p.fc);

  // Mínimos por sistema estructural.
  // Albañilería confinada (E.070): la columna debe tener el espesor del muro
  // (13 cm en soga) y un peralte mínimo de 15 cm (Art. 20.5). La propuesta
  // E.070 2019 eleva ese peralte a 25 cm.
  // Pórticos sismorresistentes (E.060): dimensión mínima 25 cm.
  if (p.sis === 'confinada') {
    if (Math.min(p.b, p.h) < 13)
      avisos.push({ n: 'bad', t: 'Dimensión mínima: en albañilería confinada la columna debe tener al menos el espesor del muro (13 cm en aparejo de soga). Una columna más angosta que el muro no lo confina.' });
    if (Math.max(p.b, p.h) < 15)
      avisos.push({ n: 'bad', t: `Peralte mínimo: E.070 (Art. 20.5) exige 15 cm de peralte en columnas de confinamiento; la propuesta E.070 2019 pide 25 cm. Tienes ${Math.max(p.b, p.h)} cm.` });
  } else if (Math.min(p.b, p.h) < 25) {
    avisos.push({ n: 'bad', t: 'Dimensión mínima: en pórticos sismorresistentes la menor dimensión de la columna es 25 cm (RNE E.060).' });
  }

  const fcMin = p.sis === 'confinada' ? 175 : 210;
  if (p.fc < fcMin) {
    avisos.push({
      n: p.sis === 'porticos' ? 'bad' : 'warn',
      t: p.sis === 'porticos'
        ? `f'c ${p.fc} kg/cm²: el RNE E.060 exige 210 kg/cm² como mínimo en elementos sismorresistentes.`
        : `f'c ${p.fc} kg/cm²: para elementos de confinamiento se recomienda 175 kg/cm² como mínimo.`,
    });
  }

  const aVar = aceroData(p.dVar);
  const aEst = aceroData(p.dEst);

  // 1. Concreto
  const volCol = (p.b / 100) * (p.h / 100) * p.alto * p.cant;
  const cemCols = volCol * dos.bolsas * 1.05; // 5% desperdicio
  const arenaCols = volCol * dos.arena * 1.05;
  const piedraCols = volCol * dos.piedra * 1.05;

  // 2. Acero longitudinal
  // Varilla comercial mide 9.00 m. Se consideran 50 cm de anclaje/traslape por varilla.
  const longVarPorVarilla = p.alto + 0.50;
  const longVarTotal = longVarPorVarilla * p.nVar * p.cant;
  const varillasVar = varillasDe9m(p.nVar * p.cant, longVarPorVarilla);
  const kgVar = varillasVar * aVar.varilla_m * aVar.kg_ml;

  // Cuantía de acero longitudinal (mínimo 1%, máximo 4% de la sección)
  const aAceroCm2 = (Math.PI / 4) * (diametroMm(p.dVar) / 10) ** 2 * p.nVar;
  const aSeccionCm2 = p.b * p.h;
  const cuantia = (aAceroCm2 / aSeccionCm2) * 100;

  // 3. Estribos (distribución sísmica RNE E.060 / SENCICO)
  // Zona de confinamiento en ambos extremos:
  const zonaConf = Math.max((p.alto * 100) / 6, Math.max(p.b, p.h), 50); // cm
  const dbVar = diametroMm(p.dVar) / 10; // cm
  // En confinamiento el estribo se espacia @10 cm (detalle usual de E.070); en
  // pórticos rige el criterio de E.060 (8 db de la barra longitudinal).
  const espZC = p.sis === 'confinada' ? 10 : Math.min(10, 8 * dbVar); // cm
  const espResto = p.sis === 'confinada' ? 20 : Math.min(20, Math.min(p.b, p.h)); // cm
  const nEstZC = Math.ceil((zonaConf - 5) / espZC) + 1;
  const nEstResto = Math.max(Math.ceil((p.alto * 100 - 2 * zonaConf) / espResto), 1);
  const nEstPorCol = nEstZC * 2 + nEstResto;
  const nEstTotal = nEstPorCol * p.cant;

  // Longitud de estribo: perímetro cerrado + 2 ganchos sísmicos de 135° (7.5 cm c/u = 15 cm)
  const anchoEst = Math.max(p.b - 2 * p.rec, 5);
  const altoEst = Math.max(p.h - 2 * p.rec, 5);
  const longEst = (2 * (anchoEst + altoEst) + 15) / 100; // metros
  const varillasEst = Math.ceil((longEst * nEstTotal * 1.05) / aEst.varilla_m);
  const kgEst = varillasEst * aEst.varilla_m * aEst.kg_ml;

  const kgTotal = kgVar + kgEst;
  const alambre = Math.max(kgTotal * 0.03, 1.0); // 3% alambre negro N° 16

  // Encofrado: 4 caras laterales (o 2 si está confinada entre muros)
  const perimEncofrado = p.sis === 'confinada' ? (p.b + p.h) / 100 : (2 * (p.b + p.h)) / 100;
  const encofrado = perimEncofrado * p.alto * p.cant;
  const clavos = encofrado * 0.8; // ~0.8 kg de clavos por m² de encofrado

  const acMinCm2 = aSeccionCm2 * 0.01;       // 1% mínimo (E.060)
  const acMaxCm2 = aSeccionCm2 * 0.06;       // 6% máximo normativo (E.060)
  const acPracticoCm2 = aSeccionCm2 * 0.04;  // 4%: límite de constructibilidad
  if (p.sis === 'confinada') {
    // E.070 exige como mínimo 4 barras longitudinales; el diámetro lo define el
    // diseño. En vivienda se usa Ø 3/8" como mínimo práctico y la propuesta
    // E.070 2019 pide 4 Ø 1/2" en columnas extremas del primer piso.
    // La cuantía mínima de 1% de E.060 es para columnas de pórtico, no para confinamiento.
    if (p.nVar < 4) {
      avisos.push({ n: 'bad', t: `Columna de confinamiento: E.070 exige como mínimo 4 barras longitudinales. Tienes ${p.nVar}.` });
    } else if (diametroMm(p.dVar) < 9.5) {
      avisos.push({ n: 'warn', t: `Columna de confinamiento: ${p.nVar} varillas de ${p.dVar}". El mínimo práctico en vivienda es Ø 3/8"; el diámetro definitivo lo define el diseño estructural.` });
    } else {
      avisos.push({ n: 'ok', t: `Columna de confinamiento: ${p.nVar} varillas de ${p.dVar}" cumplen el mínimo de 4 barras de E.070 (el diámetro lo define el diseño). En vivienda se usa Ø 3/8" o mayor.` });
    }
  } else if (aAceroCm2 < acMinCm2) {
    avisos.push({ n: 'bad', t: `Cuantía insuficiente: ${aAceroCm2.toFixed(2)} cm² < ${acMinCm2.toFixed(2)} cm² (mínimo 1% de la sección, RNE E.060). Aumentar número/diámetro de varillas longitudinales.` });
  } else if (aAceroCm2 > acMaxCm2) {
    avisos.push({ n: 'bad', t: `Cuantía excesiva: ${aAceroCm2.toFixed(2)} cm² > ${acMaxCm2.toFixed(2)} cm² (máximo normativo 6% de la sección). Reducir acero o aumentar sección.` });
  } else if (aAceroCm2 > acPracticoCm2) {
    avisos.push({ n: 'warn', t: `Cuantía ${cuantia.toFixed(2)}%: está dentro del máximo normativo (6%), pero por encima del 4% práctico. Cuesta compactar el concreto; revisa si puedes aumentar la sección.` });
  } else {
    avisos.push({ n: 'ok', t: `Cuantía dentro del rango usual: ${cuantia.toFixed(2)}% (E.060 admite 1% a 6%; en obra se recomienda no pasar de 4%).` });
  }

  // Traslapos/empalmes orientativos (varillas de 9 m) - +5% a +8% según práctica
  const traslapeFactor = p.alto > 3 ? 1.06 : 1.05;
  const varillasVarComp = Math.ceil(varillasVar * traslapeFactor);
  const varillasEstComp = Math.ceil(varillasEst * traslapeFactor);
  const kgVarComp = kgVar * traslapeFactor;
  const kgEstComp = kgEst * traslapeFactor;

  const pasos = [
    `1. CONCRETO ESTRUCTURAL (f'c = ${p.fc} kg/cm²):`,
    `   • Volumen: ${p.cant} col. × (${p.b}×${p.h} cm) × ${p.alto} m = ${volCol.toFixed(3)} m³.`,
    `   • Cemento: ${volCol.toFixed(3)} m³ × ${dos.bolsas} bol/m³ × 1.05 = ${cemCols.toFixed(1)} bolsas.`,
    `   • Arena gruesa: ${volCol.toFixed(3)} m³ × ${dos.arena} × 1.05 (desp.) = ${arenaCols.toFixed(2)} m³.`,
    `   • Piedra chancada 1/2": ${volCol.toFixed(3)} m³ × ${dos.piedra} × 1.05 (desp.) = ${piedraCols.toFixed(2)} m³.`,
    `2. FIERRO LONGITUDINAL (${p.nVar} varillas de Ø ${p.dVar}"):`,
    `   • Longitud por varilla con anclajes: ${p.alto} m + 0.50 m = ${longVarPorVarilla.toFixed(2)} m.`,
    `   • Longitud total: ${longVarTotal.toFixed(1)} m lineales.`,
    p.sis === 'confinada'
      ? `   • Cuantía: ${aAceroCm2.toFixed(2)} cm² ÷ ${aSeccionCm2} cm² = ${cuantia.toFixed(2)}% (referencial; en confinamiento rige el mínimo de 4 barras de E.070, con diámetro según diseño).`
      : `   • Cuantía: ${aAceroCm2.toFixed(2)} cm² de acero ÷ ${aSeccionCm2} cm² sección = ${cuantia.toFixed(2)}% (E.060: 1% a 6%; en obra conviene no pasar de 4%).`,
    p.sis === 'confinada'
      ? '   • Mínimo aplicable: 4 barras longitudinales (E.070); en vivienda, Ø 3/8" o mayor.'
      : `   • Mínimo: ${acMinCm2.toFixed(2)} cm² | Máximo normativo: ${acMaxCm2.toFixed(2)} cm² | Práctico: ${acPracticoCm2.toFixed(2)} cm².`,
    `   • Varillas teóricas (9 m): ${varillasVar} und (${kgVar.toFixed(1)} kg) | Con traslapes/empalmes (+${((traslapeFactor-1)*100).toFixed(0)}%): Comprar ${varillasVarComp} varillas de ${p.dVar}" (~${kgVarComp.toFixed(1)} kg).`,
    `3. ESTRIBOS SÍSMICOS (Ø ${p.dEst}"):`,
    `   • Dimensión del estribo: ${anchoEst} × ${altoEst} cm (recubrimiento ${p.rec} cm, ganchos 135° orientativos).`,
    `   • Desarrollo de cada estribo: 2×(${anchoEst}+${altoEst}) + 15 cm ganchos = ${longEst.toFixed(2)} m.`,
    `   • Distribución reglamentaria: 1@5 cm, ${nEstZC - 1}@${espZC.toFixed(0)} cm en extremos, y cada ${espResto.toFixed(0)} cm al centro.`,
    `   • Total estribos: ${nEstTotal} unidades en las ${p.cant} columnas.`,
    `   • Varillas teóricas (9 m): ${varillasEst} und (${kgEst.toFixed(1)} kg) | Con traslapes/empalmes: Comprar ${varillasEstComp} varillas de ${p.dEst}" (~${kgEstComp.toFixed(1)} kg).`,
    `4. ALAMBRE DE AMARRE, CLAVOS Y ENCOFRADO:`,
    `   • Alambre negro N° 16 (3% del peso de acero): ${alambre.toFixed(1)} kg.`,
    `   • Clavos para encofrado 2 1/2": ~${clavos.toFixed(1)} kg.`,
    `   • Encofrado: ${encofrado.toFixed(1)} m² de madera.`,
    `   • Nota: Cálculos orientativos con fines de metrado/presupuesto. Para elementos portantes validar con plano estructural aprobado.`,
  ];

  return {
    titulo: 'Columnas',
    detalle: `${p.cant} columna(s) de ${p.b}×${p.h} cm, altura ${p.alto} m`,
    resumen: [
      { nombre: 'Concreto f\'c ' + p.fc, valor: volCol.toFixed(3), unidad: 'm³' },
      { nombre: 'Cemento', valor: comprarEntero(cemCols), unidad: 'bolsas' },
      { nombre: 'Fierro longitud.', valor: `${varillasVar} var. (${p.dVar}")`, unidad: '' },
      { nombre: 'Estribos', valor: `${varillasEst} var. (${p.dEst}")`, unidad: '' },
      { nombre: 'Fierro total', valor: kgTotal.toFixed(1), unidad: 'kg' },
      { nombre: p.sis === 'confinada' ? 'Cuantía (ref.)' : 'Cuantía de acero', valor: cuantia.toFixed(2), unidad: '%' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemCols,    comprar: comprarEntero(cemCols), desglose: `${volCol.toFixed(2)} m³ concreto f'c ${p.fc} × ${dos.bolsas} bol/m³ (+5% desp.)` },
      { id: 'arena_gruesa',    cant: arenaCols,  comprar: ceil1(arenaCols),       desglose: `${volCol.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedraCols, comprar: ceil1(piedraCols),     desglose: `${volCol.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      // `cant` en varillas (unidad del catálogo), no en kg. La cantidad base
      // ya incluye corte, desperdicio y traslape; el kg sigue visible en `pasos`.
      { id: aVar.id_cat,       cant: varillasVar * traslapeFactor, comprar: varillasVarComp, nota: `${p.cant} col. × ${p.nVar} var. Ø ${p.dVar}" +traslape ${((traslapeFactor-1)*100).toFixed(0)}% (~${kgVarComp.toFixed(0)} kg)`, desglose: `${p.cant} cols × ${p.nVar} var. × ${longVarPorVarilla.toFixed(2)}m (+corte+traslape) ÷ 9m` },
      { id: aEst.id_cat,       cant: varillasEst * traslapeFactor, comprar: varillasEstComp, nota: `Estribos Ø ${p.dEst}" +traslape ${((traslapeFactor-1)*100).toFixed(0)}% (~${kgEstComp.toFixed(0)} kg)`,          desglose: `${nEstTotal} estribos sísmicos × ${longEst.toFixed(2)}m desarrollo ÷ 9m` },
      { id: 'alambre_8',       cant: alambre,    comprar: ceil1(alambre), nota: 'Alambre N°16 de amarre',      desglose: `3% del peso total de fierro (${(kgVar+kgEst).toFixed(0)} kg)` },
      { id: 'clavos_encofrado', cant: clavos,    comprar: ceil1(clavos),  nota: 'Clavos 2 1/2"',              desglose: `${encofrado.toFixed(1)} m² encofrado × 0.8 kg/m²` },
      { id: 'madera_encofrado', cant: encofrado, comprar: ceil1(encofrado),                                    desglose: `${p.cant} cols × ${perimEncofrado.toFixed(2)}m perím. × ${p.alto}m alto` },
    ],
    avisos,
    pasos,
  };
}

// ─── 4. VIGAS ─────────────────────────────────────────────────────────────────
export function calcVigas(p: ParamsVigas): Resultado {
  if (p.b <= 0 || p.h <= 0 || p.luz <= 0 || p.cant <= 0)
    return { error: 'Base, peralte, luz y cantidad deben ser mayores a cero.' };

  const avisos: Aviso[] = [];
  const dos = dosConcreto(p.fc);

  const sis = p.sis ?? 'confinada';   // la mayoría de casas de 1-2 pisos son confinadas
  const espesorLosa = p.espesorLosa && p.espesorLosa > 0 ? p.espesorLosa : 0; // cm de losa sobre la viga
  const hUtil = Math.max(p.h - espesorLosa, 10); // cm — peralte efectivo bajo losa

  if (p.fc < 210)
    avisos.push({ n: 'bad', t: `f'c ${p.fc} kg/cm²: no cumple el mínimo de 210 kg/cm² para vigas de vivienda (RNE E.060).` });

  // Pórticos sismorresistentes (E.060): menor dimensión 25 cm y b/h ≥ 0.3.
  // Albañilería confinada: el ancho suele ser el del muro (13 cm); no se exige 25 cm.
  if (sis === 'porticos') {
    if (p.b < 25)
      avisos.push({ n: 'bad', t: `En pórticos el ancho de viga no puede ser menor a 25 cm (RNE E.060). Tienes ${p.b} cm.` });
    if (p.b / p.h < 0.3)
      avisos.push({ n: 'warn', t: `Relación b/h = ${(p.b / p.h).toFixed(2)} menor que 0.3; en pórticos la E.060 pide b/h ≥ 0.3.` });
    if (hUtil > p.luz * 100 / 4)
      avisos.push({ n: 'warn', t: `Peralte efectivo bajo losa (${hUtil.toFixed(0)} cm) supera L/4 de la luz (${(p.luz * 100 / 4).toFixed(0)} cm); revisar con ingeniero.` });
  } else if (p.b < 13) {
    avisos.push({ n: 'warn', t: `En confinada el ancho de viga suele ser el del muro (13 cm). Tienes ${p.b} cm.` });
  }

  // Peralte frente a la luz: aun en el caso más favorable de E.060 (viga
  // simplemente apoyada) el peralte no debería bajar de L/16.
  const peralteMin = (p.luz * 100) / 16;
  if (p.h < peralteMin)
    avisos.push({ n: 'warn', t: `Peralte ${p.h} cm para una luz de ${p.luz} m: por debajo de L/16 (${peralteMin.toFixed(0)} cm). Revisa la deflexión; si la viga soporta tabiques, dale más peralte o consulta a un ingeniero.` });

  const aSup = aceroData(p.dSup);
  const aInf = aceroData(p.dInf);
  const aEst = aceroData(p.dEst);

  // 1. Concreto — se descuenta el grosor de la losa sobre la viga (no se vacía
  // debajo de la losa; el encofrado lateral también se reduce al peralte bajo losa).
  const volViga = (p.b / 100) * (hUtil / 100) * p.luz * p.cant;
  const cemVigas = volViga * dos.bolsas * 1.05;
  const arenaVigas = volViga * dos.arena * 1.05;
  const piedraVigas = volViga * dos.piedra * 1.05;

  // Acero mínimo inferior según RNE E.060: As,min = (0.7 * √f'c / fy) * b * d
  // `d` mejora a h − rec − Ø estribo − Ø bar/2 en vez de solo h − rec.
  const dEfectivo = p.h - p.rec - (diametroMm(p.dEst) / 10) - (diametroMm(p.dInf) / 10 / 2); // cm
  const AcMinCm2 = (0.7 * Math.sqrt(p.fc) / 4200) * p.b * dEfectivo;
  const AcProvCm2 = (Math.PI / 4) * (diametroMm(p.dInf) / 10) ** 2 * p.nInf;

  if (AcProvCm2 < AcMinCm2)
    avisos.push({ n: 'bad', t: `Acero inferior (${AcProvCm2.toFixed(2)} cm²): menor al mínimo reglamentario (${AcMinCm2.toFixed(2)} cm²) según RNE E.060. Incrementar diámetro o varillas inferiores.` });

  // Varillas longitudinales (luz + 0.50 m de anclajes), compradas con plan de
  // corte: una varilla de 9 m rinde floor(8.7 / largo) piezas.
  const largoBarra = p.luz + 0.50;
  const varSup = varillasDe9m(p.nSup * p.cant, largoBarra);
  const varInf = varillasDe9m(p.nInf * p.cant, largoBarra);
  const kgSup = varSup * aSup.varilla_m * aSup.kg_ml;
  const kgInf = varInf * aInf.varilla_m * aInf.kg_ml;

  // Estribos de viga. En pórticos rige E.060: zona de confinamiento 2h con
  // s ≤ d/4, 8db y 20 cm, y s ≤ d/2 en el resto. En albañilería confinada la
  // viga es una solera: se usa el detalle usual 1@5, @10 en los extremos y
  // @20 al centro (el mismo criterio que las columnas de confinamiento).
  // Aplicar el d/4 de pórtico a una solera de 13 cm duplicaba los estribos.
  const zonaConf = 2 * p.h; // cm
  const espZC = sis === 'confinada'
    ? 10
    : Math.min(dEfectivo / 4, 8 * (diametroMm(p.dInf) / 10), 20); // cm
  const espResto = sis === 'confinada' ? 20 : dEfectivo / 2; // cm
  const nEstZC = Math.ceil((zonaConf - 5) / espZC) + 1;
  const nEstResto = Math.max(Math.ceil((p.luz * 100 - 2 * zonaConf) / espResto), 1);
  const nEstTotal = (nEstZC * 2 + nEstResto) * p.cant;

  const anchoEst = Math.max(p.b - 2 * p.rec, 5);
  const altoEst = Math.max(hUtil - 2 * p.rec, 5); // estribo bajo la losa
  const longEst = (2 * (anchoEst + altoEst) + 15) / 100; // metros
  const varEst = Math.ceil((longEst * nEstTotal * 1.05) / aEst.varilla_m);
  const kgEst = varEst * aEst.varilla_m * aEst.kg_ml;

  const kgTotal = kgSup + kgInf + kgEst;
  const alambre = Math.max(kgTotal * 0.03, 1.0);

  // Encofrado: fondo + 2 laterales bajo la losa (la losa hace de encofrado superior).
  const encofrado = ((p.b + 2 * hUtil) / 100) * p.luz * p.cant;
  const clavos = encofrado * 0.8;

  if (AcProvCm2 >= AcMinCm2) {
    avisos.push({ n: 'ok', t: `Acero inferior provisto ${AcProvCm2.toFixed(2)} cm² >= mínimo ${AcMinCm2.toFixed(2)} cm².` });
  }

  const traslapeFactor = 1.05;
  const varSupC = Math.ceil(varSup * traslapeFactor);
  const varInfC = Math.ceil(varInf * traslapeFactor);
  const varEstC = Math.ceil(varEst * traslapeFactor);
  const kgSupC = kgSup * traslapeFactor;
  const kgInfC = kgInf * traslapeFactor;
  const kgEstC = kgEst * traslapeFactor;

  const pasos = [
    `1. CONCRETO (f'c = ${p.fc} kg/cm²):`,
    `   • Volumen: ${p.cant} viga(s) × (${p.b}×${hUtil.toFixed(0)} cm bajo losa) × ${p.luz} m = ${volViga.toFixed(3)} m³.${espesorLosa > 0 ? ` (se descuenta la losa de ${espesorLosa} cm sobre la viga)` : ''}`,
    `   • Cemento: ${volViga.toFixed(3)} m³ × ${dos.bolsas} bol/m³ × 1.05 = ${cemVigas.toFixed(1)} bolsas.`,
    `   • Arena gruesa: ${volViga.toFixed(3)} m³ × ${dos.arena} × 1.05 (desp.) = ${arenaVigas.toFixed(2)} m³.`,
    `   • Piedra chancada 1/2": ${volViga.toFixed(3)} m³ × ${dos.piedra} × 1.05 (desp.) = ${piedraVigas.toFixed(2)} m³.`,
    `2. FIERRO SUPERIOR E INFERIOR (Varillas de 9 m):`,
    `   • Acero mínimo inferior RNE E.060 = ${AcMinCm2.toFixed(2)} cm² | Provisto = ${AcProvCm2.toFixed(2)} cm² (d = h − rec − estribo − barra/2 = ${dEfectivo.toFixed(1)} cm).`,
    `   • Superior (${p.nSup} varillas Ø ${p.dSup}"): Teórico ${varSup} var. (${kgSup.toFixed(1)} kg) → Comprar ${varSupC} var. (+5% traslape/empalme).`,
    `   • Inferior (${p.nInf} varillas Ø ${p.dInf}"): Teórico ${varInf} var. (${kgInf.toFixed(1)} kg) → Comprar ${varInfC} var. (+5% traslape/empalme).`,
    `3. ESTRIBOS (Ø ${p.dEst}"):`,
    `   • Dimensión: ${anchoEst}×${altoEst.toFixed(0)} cm + 15 cm ganchos 135° (orientativo) → ${longEst.toFixed(2)} m por estribo.`,
    sis === 'confinada'
      ? `   • Distribución (detalle usual de solera): 1@5 cm, ${nEstZC - 1}@10 cm en los extremos y cada 20 cm al centro.`
      : `   • Distribución E.060: 1@5 cm, ${nEstZC - 1}@${espZC.toFixed(0)} cm en los extremos y cada ${espResto.toFixed(0)} cm al centro.`,
    `   • Total estribos: ${nEstTotal} und → Teórico ${varEst} var. (${kgEst.toFixed(1)} kg) → Comprar ${varEstC} var. (+5% traslape/empalme).`,
    `4. ALAMBRE, CLAVOS Y ENCOFRADO:`,
    `   • Alambre N° 16: ${alambre.toFixed(1)} kg.`,
    `   • Clavos 2 1/2": ~${clavos.toFixed(1)} kg.`,
    `   • Encofrado (fondo + 2 costados bajo losa): ${encofrado.toFixed(1)} m².`,
    `   • Nota: Cálculos orientativos. Validar con plano estructural aprobado.`,
  ];

  const alambreV = Math.max(kgTotal * 0.03, 1.0);
  const clavosV = encofrado * 0.8;
  void alambreV; void clavosV;

  const sisNota = sis === 'porticos' ? ' (pórtico E.060)' : ' (confinada)';

  return {
    titulo: 'Vigas',
    detalle: `${p.cant} viga(s) de ${p.b}×${p.h} cm${sisNota}, luz libre ${p.luz} m${espesorLosa > 0 ? `, losa ${espesorLosa} cm` : ''}`,
    resumen: [
      { nombre: 'Concreto f\'c ' + p.fc, valor: volViga.toFixed(3), unidad: 'm³' },
      { nombre: 'Cemento', valor: comprarEntero(cemVigas), unidad: 'bolsas' },
      { nombre: 'Fierro superior', valor: `${varSup} var. (${p.dSup}")`, unidad: '' },
      { nombre: 'Fierro inferior', valor: `${varInf} var. (${p.dInf}")`, unidad: '' },
      { nombre: 'Estribos', valor: `${varEst} var. (${p.dEst}")`, unidad: '' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemVigas,   comprar: comprarEntero(cemVigas), desglose: `${volViga.toFixed(2)} m³ concreto f'c ${p.fc} × ${dos.bolsas} bol/m³` },
      { id: 'arena_gruesa',    cant: arenaVigas, comprar: ceil1(arenaVigas),       desglose: `${volViga.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedraVigas, comprar: ceil1(piedraVigas),     desglose: `${volViga.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      // `cant` en varillas (unidad del catálogo), no en kg.
      { id: aSup.id_cat,       cant: varSup * traslapeFactor, comprar: varSupC, nota: `${p.nSup} var. superior Ø ${p.dSup}" +5% traslape (~${kgSupC.toFixed(0)} kg)`, desglose: `${p.cant} vigas × ${p.nSup} var. × ${(p.luz + 0.5).toFixed(1)}m (+5% desp/traslape) ÷ 9m` },
      { id: aInf.id_cat,       cant: varInf * traslapeFactor, comprar: varInfC, nota: `${p.nInf} var. inferior Ø ${p.dInf}" +5% traslape (~${kgInfC.toFixed(0)} kg)`, desglose: `${p.cant} vigas × ${p.nInf} var. × ${(p.luz + 0.5).toFixed(1)}m (+5% desp/traslape) ÷ 9m` },
      { id: aEst.id_cat,       cant: varEst * traslapeFactor, comprar: varEstC, nota: `Estribos Ø ${p.dEst}" +5% traslape (~${kgEstC.toFixed(0)} kg)`,                desglose: `${nEstTotal} estribos × ${longEst.toFixed(2)}m desarrollo ÷ 9m` },
      { id: 'alambre_8',       cant: alambre,    comprar: ceil1(alambre), nota: 'Alambre N°16 de amarre',        desglose: `3% del fierro total (${kgTotal.toFixed(0)} kg)` },
      { id: 'clavos_encofrado', cant: clavos,   comprar: ceil1(clavos),   nota: 'Clavos 2 1/2"',                desglose: `${encofrado.toFixed(1)} m² encofrado × 0.8 kg/m²` },
      { id: 'madera_encofrado', cant: encofrado, comprar: ceil1(encofrado),                                      desglose: `${p.cant} vigas × ${((p.b + 2 * hUtil) / 100).toFixed(2)}m perím. × ${p.luz}m` },
    ],
    avisos,
    pasos,
  };
}

// ─── 5. LOSA ALIGERADA ────────────────────────────────────────────────────────
export function calcLosa(p: ParamsLosa): Resultado {
  if (p.largo <= 0 || p.ancho <= 0)
    return { error: 'Largo y ancho deben ser mayores a cero.' };

  const avisos: Aviso[] = [];

  if (p.fc < 210)
    avisos.push({ n: 'bad', t: `f'c ${p.fc} kg/cm²: no cumple el mínimo de 210 kg/cm² para losa aligerada de vivienda (RNE E.060).` });

  // El espesor se rige por la luz que salva la vigueta. En esta calculadora las
  // viguetas corren a lo largo de `largo` y se reparten en `ancho`, así que la
  // luz estructural es `largo` (no la dimensión mayor).
  const luzVigueta = p.largo;
  let esp = p.espesor === 'auto' ? 0 : Number(p.espesor);
  if (p.espesor === 'auto') {
    for (const fila of TABLAS.espesorLosa.auto) {
      if (luzVigueta <= fila.luz_max) { esp = fila.esp; break; }
    }
    if (esp === 0) {
      avisos.push({ n: 'bad', t: `Luz de vigueta de ${luzVigueta.toFixed(1)} m: supera la recomendación habitual de 7.5 m para losa aligerada unidireccional. Requiere viga intermedia o losa en dos sentidos.` });
      esp = 30;
    }
  }

  const area = p.largo * p.ancho;
  const dos = dosConcreto(p.fc);

  // Consumo de concreto según espesor (Norma Capeco Tabla 2.24)
  const volM3xM2 = (TABLAS.volumenConcretoLosa as Record<string, number>)[String(esp)] ?? 0.0875;
  const volConcreto = area * volM3xM2 * 1.05; // con 5% de desperdicio
  const cemLosa = volConcreto * dos.bolsas;
  const arenaLosa = volConcreto * dos.arena;
  const piedraLosa = volConcreto * dos.piedra;

  // Ladrillos huecos de techo 30×30 cm (8.33 und/m² + 5% desperdicio = 8.75 und/m²)
  const ladTecho = area * TABLAS.losaTecho.und_m2 * (1 + TABLAS.desperdicios.ladrillo_techo);

  // Viguetas: una en cada borde. Separación máxima 40 cm entre ejes (Capeco):
  // ceil(ancho/0.40) + 1. Con floor, un ancho de 4.20 m daba 11 viguetas
  // separadas 0.42 m (fuera de norma); con ceil da 12 @ 0.38 m.
  const nViguetas = Math.max(2, Math.ceil(p.ancho / 0.40 - 1e-9) + 1);
  const sepViguetas = p.ancho / (nViguetas - 1);

  // Acero de viguetas (compra con plan de corte sobre varillas de 9 m)
  const aInf = aceroData(p.dInf);
  const aBast = aceroData(p.dBast);

  const varInf = varillasDe9m(nViguetas * p.nInf, p.largo + 0.30);
  const varBast = varillasDe9m(nViguetas * 2 * p.nBast, p.largo * 0.30 + 0.30); // bastones en ambos extremos (L/3)
  const kgInf = varInf * aInf.varilla_m * aInf.kg_ml;
  const kgBast = varBast * aBast.varilla_m * aBast.kg_ml;

  // Malla de temperatura de la losa superior (5 cm): Ø 1/4" @ 25 cm en dos
  // direcciones ≈ 8 m lineales por m². Sin ella, la losa fisura por retracción.
  const aMalla = aceroData('1/4');
  const longMalla = area * 8 * 1.05;
  const varMalla = Math.ceil(longMalla / aMalla.varilla_m);
  const kgMalla = varMalla * aMalla.varilla_m * aMalla.kg_ml;

  const kgTotal = kgInf + kgBast + kgMalla;
  const alambre = Math.max(kgTotal * 0.03, 1.0);

  const encofrado = area * 1.05;
  const clavos = encofrado * 0.8;

  const pasos = [
    `1. DIMENSIONES DEL TECHO:`,
    `   Área total: ${p.largo} m × ${p.ancho} m = ${area.toFixed(2)} m².`,
    `   Luz de la vigueta: ${luzVigueta.toFixed(2)} m → Espesor de losa: ${esp} cm (Ladrillo de ${esp - 5} cm + 5 cm losa superior).`,
    `2. LADRILLOS DE TECHO 30×30 cm (Hueco):`,
    `   • Factor: 8.33 ladrillos/m² × 1.05 (desp. 5%) = 8.75 und/m².`,
    `   • Total a comprar: ${area.toFixed(2)} m² × 8.75 = ${comprarEntero(ladTecho)} ladrillos de techo.`,
    `3. CONCRETO ESTRUCTURAL (f'c ${p.fc} kg/cm² - Capeco):`,
    `   • Factor concreto: ${volM3xM2.toFixed(4)} m³/m² para espesor ${esp} cm.`,
    `   • Volumen total: ${area.toFixed(2)} m² × ${volM3xM2} × 1.05 = ${volConcreto.toFixed(3)} m³.`,
    `   • Cemento Portland: ${volConcreto.toFixed(3)} m³ × ${dos.bolsas} bol/m³ = ${cemLosa.toFixed(1)} bolsas → Comprar ${comprarEntero(cemLosa)} bolsas.`,
    `   • Arena gruesa: ${volConcreto.toFixed(3)} m³ × ${dos.arena} = ${ceil1(arenaLosa)} m³.`,
    `   • Piedra chancada 1/2": ${volConcreto.toFixed(3)} m³ × ${dos.piedra} = ${ceil1(piedraLosa)} m³.`,
    `4. ACERO PARA VIGUETAS (${nViguetas} viguetas @ ${sepViguetas.toFixed(2)} m, máximo 0.40 m):`,
    `   • Fierro inferior corrido (${p.nInf} varilla(s) Ø ${p.dInf}"): Comprar ${varInf} varillas de 9 m (${kgInf.toFixed(1)} kg).`,
    `   • Bastones negativos (${p.nBast} varilla(s) Ø ${p.dBast}"): Comprar ${varBast} varillas de 9 m (${kgBast.toFixed(1)} kg).`,
    `   • Fierro total: ${kgTotal.toFixed(1)} kg.`,
    `5. MALLA DE TEMPERATURA (losa superior de 5 cm):`,
    `   • Ø 1/4" @ 25 cm en dos direcciones ≈ 8 m lineales por m².`,
    `   • ${area.toFixed(2)} m² × 8 m/m² × 1.05 = ${longMalla.toFixed(0)} m lineales → Comprar ${varMalla} varillas de 9 m (${kgMalla.toFixed(1)} kg).`,
    `6. ENCOFRADO DE TECHO:`,
    `   ${area.toFixed(2)} m² con soleras y pies derechos → ${encofrado.toFixed(1)} m² de madera + ~${clavos.toFixed(1)} kg clavos.`,
  ];

  return {
    titulo: 'Losa aligerada',
    detalle: `${area.toFixed(1)} m², espesor ${esp} cm (Ladrillo de ${esp - 5} cm + 5 cm vaciado)`,
    resumen: [
      { nombre: 'Espesor losa', valor: esp, unidad: 'cm' },
      { nombre: 'Concreto f\'c ' + p.fc, valor: volConcreto.toFixed(3), unidad: 'm³' },
      { nombre: 'Cemento', valor: comprarEntero(cemLosa), unidad: 'bolsas' },
      { nombre: 'Ladrillos techo', valor: comprarEntero(ladTecho), unidad: 'und' },
      { nombre: 'Fierro viguetas', valor: `${varInf} var. (${p.dInf}")`, unidad: '' },
      { nombre: 'Fierro bastones', valor: `${varBast} var. (${p.dBast}")`, unidad: '' },
      { nombre: 'Malla temperatura', valor: `${varMalla} var. (1/4")`, unidad: '' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemLosa,    comprar: comprarEntero(cemLosa), desglose: `${area.toFixed(1)} m² × ${volM3xM2.toFixed(4)} m³/m² × ${dos.bolsas} bol/m³` },
      { id: 'arena_gruesa',    cant: arenaLosa,  comprar: ceil1(arenaLosa),       desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedraLosa, comprar: ceil1(piedraLosa),     desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      { id: 'ladrillo_techo',  cant: ladTecho,   comprar: comprarEntero(ladTecho), desglose: `${area.toFixed(1)} m² × 8.33 und/m² (+5% rotura)` },
      { id: aInf.id_cat,       cant: varInf,     comprar: varInf,  nota: `${p.nInf} varilla(s) Ø ${p.dInf}" inferior (~${kgInf.toFixed(0)} kg)`, desglose: `${nViguetas} viguetas × ${p.nInf} var. × ${(p.largo + 0.3).toFixed(1)}m, plan de corte ÷ 9m` },
      { id: aBast.id_cat,      cant: varBast,    comprar: varBast, nota: `Bastones Ø ${p.dBast}" (~${kgBast.toFixed(0)} kg)`,                     desglose: `${nViguetas} viguetas × 2 extremos × ${p.nBast} bast. × ${(p.largo * 0.3 + 0.3).toFixed(1)}m, plan de corte ÷ 9m` },
      { id: aMalla.id_cat,     cant: varillasExactas(longMalla, aMalla), comprar: varMalla, nota: `Malla de temperatura Ø 1/4" @ 25 cm (~${kgMalla.toFixed(0)} kg)`, desglose: `${area.toFixed(1)} m² × 8 m/m² (2 direcciones @ 25 cm) +5%` },
      { id: 'alambre_8',       cant: alambre,    comprar: ceil1(alambre), nota: 'Alambre N°16 de amarre',             desglose: `3% del peso total de fierro (${kgTotal.toFixed(0)} kg)` },
      { id: 'clavos_encofrado', cant: clavos,    comprar: ceil1(clavos),  nota: 'Clavos 2 1/2"',                       desglose: `${encofrado.toFixed(1)} m² encofrado × 0.8 kg/m²` },
      { id: 'madera_encofrado', cant: encofrado, comprar: ceil1(encofrado),                                            desglose: `${area.toFixed(1)} m² losa (+5% desp.)` },
    ],
    avisos,
    pasos,
  };
}

// ─── 6. ACABADOS ──────────────────────────────────────────────────────────────
export function calcAcabados(p: ParamsAcabados): Resultado {
  if (p.aTarr < 0 || p.aPint < 0 || p.aPiso < 0)
    return { error: 'Las áreas no pueden ser negativas.' };

  const avisos: Aviso[] = [];

  // Tarrajeo: mortero 1:5 según área y espesor (Capeco)
  const volTarr = p.aTarr * (p.eTarr / 100) * 1.10; // 10% desperdicio mortero
  const dosMort = dosMortero(5);
  const cemTarr = volTarr * dosMort.bolsas;
  const arenaTarr = volTarr * dosMort.arena;

  // Contrapiso: si es menor a 8 cm no cabe piedra mediana (3"-4"), se usa
  // mortero 1:5. A partir de 8 cm se usa concreto simple 1:8 + 25% PM.
  let cemContra = 0, arenaContra = 0, hormigonContra = 0, piedraContra = 0, volContra = 0;
  let contrapisoDelgado = false;
  if (p.contra === 'si') {
    volContra = p.aPiso * (p.eContra / 100) * 1.05;
    contrapisoDelgado = p.eContra > 0 && p.eContra < 8;
    if (contrapisoDelgado) {
      const dosM = dosMortero(5);
      cemContra  = volContra * dosM.bolsas;
      arenaContra  = volContra * dosM.arena;
      piedraContra = 0;
    } else {
      // 1:8 + 25% piedra mediana: el campo `hormigon` de la tabla es el
      // agregado (arena + grava), igual que en cimientos. Antes se guardaba
      // como `arena_gruesa` y el usuario compraba arena pero no grava.
      const dosContra = TABLAS.cimientoCiclopeo['1:8+25%piedra'];
      cemContra  = volContra * dosContra.bolsas;
      hormigonContra = volContra * dosContra.hormigon;
      piedraContra = volContra * dosContra.piedra;
    }
  }

  const arenaTotal = arenaTarr + arenaContra;
  const hormigonTotal = hormigonContra;

  // Cerámico con desperdicio por cortes
  const ceraCom = p.aPiso * (1 + p.perd / 100);

  // Pegamento cerámico (≈4.5 kg/m², bolsa de 25 kg) y fragua (≈0.5 kg/m²)
  const pegamentoBol = p.aPiso > 0 ? ceraCom * 4.5 / 25 : 0;
  const fraguaKg = p.aPiso > 0 ? ceraCom * 0.5 : 0;

  // Pintura e Imprimante (galones comerciales)
  const galPint = p.aPint > 0 ? Math.ceil((p.aPint * p.manos) / p.rendP) : 0;
  const galImp  = p.aPint > 0 ? Math.ceil(p.aPint / (p.rendP * 1.5)) : 0;

  if (p.eTarr > 0 && p.eTarr < 1.0)
    avisos.push({ n: 'warn', t: 'Espesor de tarrajeo menor a 1.0 cm: puede fisurarse por falta de recubrimiento adecuado.' });
  if (p.eTarr > 2.5)
    avisos.push({ n: 'warn', t: 'Espesor de tarrajeo mayor a 2.5 cm: aplicar en dos capas para evitar desprendimientos.' });
  if (contrapisoDelgado)
    avisos.push({ n: 'warn', t: `Contrapiso de ${p.eContra} cm: se calcula con mortero 1:5 sin piedra. La piedra mediana (3"-4") no cabe en menos de 8 cm.` });

  const cemTotal = cemTarr + cemContra;

  const pasos = [
    `1. TARRAJEO EN MUROS (Mortero 1:5 - Espesor ${p.eTarr} cm):`,
    `   • Volumen mortero: ${p.aTarr} m² × ${(p.eTarr / 100).toFixed(3)} m × 1.10 (desp. 10%) = ${volTarr.toFixed(3)} m³.`,
    `   • Cemento: ${volTarr.toFixed(3)} m³ × ${dosMort.bolsas} bol/m³ = ${cemTarr.toFixed(1)} bolsas.`,
    `   • Arena fina/lavada: ${volTarr.toFixed(3)} m³ × ${dosMort.arena} = ${arenaTarr.toFixed(2)} m³.`,
    p.contra === 'si'
      ? `2. CONTRAPISO (Espesor ${p.eContra} cm${contrapisoDelgado ? ' — mortero 1:5 sin piedra' : ' — concreto simple 1:8 + 25% piedra mediana, Capeco'}):\n   • Volumen: ${volContra.toFixed(3)} m³ | Cemento: ${cemContra.toFixed(1)} bolsas | ${contrapisoDelgado ? `Arena: ${arenaContra.toFixed(2)} m³` : `Hormigón: ${hormigonContra.toFixed(2)} m³ | Piedra mediana: ${piedraContra.toFixed(2)} m³`}.`
      : `2. CONTRAPISO: No solicitado.`,
    `3. PISO CERÁMICO:`,
    `   • Área: ${p.aPiso} m² × (1 + ${p.perd}% desperdicio de cortes) = ${ceraCom.toFixed(2)} m² a comprar.`,
    p.aPiso > 0
      ? `   • Pegamento cerámico: ≈4.5 kg/m² → ${pegamentoBol.toFixed(1)} bolsa(s) de 25 kg.`
      : '',
    p.aPiso > 0
      ? `   • Fragua para cerámico: ≈0.5 kg/m² → ${fraguaKg.toFixed(0)} kg.`
      : '',
    `4. PINTURA LÁTEX E IMPRIMANTE:`,
    `   • Pintura (${p.manos} manos a ${p.rendP} m²/gal): ${galPint} galón(es).`,
    `   • Imprimante base: ${galImp} galón(es).`,
    `5. QUÉ COMPRAR:`,
    `   • Cemento total: ${cemTotal.toFixed(1)} bolsas → Comprar ${comprarEntero(cemTotal)} bolsas.`,
    `   • Arena: ${arenaTotal.toFixed(2)} m³ → Comprar ${ceil1(arenaTotal)} m³.`,
    hormigonTotal > 0
      ? `   • Hormigón: ${hormigonTotal.toFixed(2)} m³ → Comprar ${ceil1(hormigonTotal)} m³.`
      : '',
    `   • Cerámico: Comprar ${Math.ceil(ceraCom)} m² en cajas.`,
    `   • Pintura: Comprar ${galPint} galones | Imprimante: ${galImp} galones.`,
  ];

  return {
    titulo: 'Acabados',
    detalle: `Tarrajeo ${p.aTarr} m² · Cerámico ${p.aPiso} m² · Pintura ${p.aPint} m²`,
    resumen: [
      { nombre: 'Cemento total', valor: comprarEntero(cemTotal), unidad: 'bolsas' },
      { nombre: 'Arena', valor: ceil1(arenaTotal), unidad: 'm³' },
      ...(hormigonTotal > 0 ? [{ nombre: 'Hormigón contrapiso', valor: ceil1(hormigonTotal), unidad: 'm³' }] : []),
      { nombre: 'Cerámico a comprar', valor: Math.ceil(ceraCom), unidad: 'm²' },
      { nombre: 'Pegamento cerámico', valor: pegamentoBol > 0 ? pegamentoBol.toFixed(1) : '-', unidad: 'bolsas 25 kg' },
      { nombre: 'Fragua', valor: fraguaKg > 0 ? fraguaKg.toFixed(0) : '-', unidad: 'kg' },
      { nombre: 'Pintura látex', valor: galPint, unidad: 'gal' },
      { nombre: 'Imprimante', valor: galImp, unidad: 'gal' },
    ],
    mats: [
      { id: 'cemento',       cant: cemTotal,    comprar: comprarEntero(cemTotal), desglose: p.contra === 'si' ? `Tarrajeo: ${cemTarr.toFixed(1)} bol + Contrapiso: ${cemContra.toFixed(1)} bol = ${cemTotal.toFixed(1)} bol` : `Tarrajeo 1:5: ${cemTarr.toFixed(1)} bolsas` },
      { id: 'arena_fina',    cant: arenaTarr,   comprar: ceil1(arenaTarr),        desglose: `${volTarr.toFixed(2)} m³ mortero 1:5 × ${dosMort.arena} m³/m³ (tarrajeo)` },
      ...(arenaContra > 0 ? [{ id: 'arena_gruesa', cant: arenaContra, comprar: ceil1(arenaContra), nota: 'Para contrapiso (mortero 1:5)', desglose: `${volContra.toFixed(2)} m³ contrapiso ${p.eContra} cm (mortero 1:5)` }] : []),
      ...(hormigonContra > 0 ? [{ id: 'hormigon', cant: hormigonContra, comprar: ceil1(hormigonContra), nota: 'Para contrapiso (1:8 + 25% PM)', desglose: `${volContra.toFixed(2)} m³ contrapiso ${p.eContra} cm (concreto 1:8 + 25% PM)` }] : []),
      ...(p.contra === 'si' && piedraContra > 0 ? [{ id: 'piedra_mediana', cant: piedraContra, comprar: ceil1(piedraContra), nota: 'Para contrapiso', desglose: `${volContra.toFixed(2)} m³ contrapiso 1:8+25% PM (Capeco)` }] : []),
      ...(p.aPiso > 0 ? [{ id: 'pegamento_ceramico', cant: pegamentoBol, comprar: Math.ceil(pegamentoBol), desglose: `${ceraCom.toFixed(2)} m² × 4.5 kg/m² ÷ 25 kg/bolsa` }] : []),
      ...(p.aPiso > 0 ? [{ id: 'fragua', cant: fraguaKg, comprar: Math.ceil(fraguaKg), desglose: `${ceraCom.toFixed(2)} m² × 0.5 kg/m²` }] : []),
      { id: 'ceramico',      cant: ceraCom,     comprar: Math.ceil(ceraCom),      desglose: `${p.aPiso} m² piso + ${p.perd}% desp. de cortes` },
      { id: 'pintura_latex', cant: galPint,     comprar: galPint,                 desglose: `${p.aPint} m² × ${p.manos} manos ÷ ${p.rendP} m²/gal` },
      { id: 'imprimante',    cant: galImp,      comprar: galImp,                  desglose: `${p.aPint} m² ÷ ${(p.rendP * 1.5).toFixed(0)} m²/gal` },
    ],
    avisos,
    pasos,
  };
}

// ─── 8. ZAPATA AISLADA (Orientativo) ─────────────────────────────────────────
export interface ZapataDimensiones {
  pa: number;      // kg/cm²
  lado: number;    // m
  espesor: number; // m
}

/**
 * Dimensionado orientativo de la zapata (RNE E.050).
 * Lo usan el motor, la página (vista previa) y el visor 3D para que
 * los tres muestren SIEMPRE la misma zapata.
 */
export function dimensionarZapata(
  p: Pick<ParamsZapata, 'bCol' | 'hCol' | 'carga' | 'suelo' | 'pa' | 'espesor'>
): ZapataDimensiones | { error: string } {
  let pa = p.pa;
  if (p.suelo === 'blando') pa = 0.8;
  else if (p.suelo === 'intermedio') pa = 1.2;
  else if (p.suelo === 'duro') pa = 2.0;
  else if (p.pa <= 0) return { error: 'Indique presión admisible (kg/cm²) o seleccione tipo de suelo.' };

  // Área requerida Areq = (Carga * 1000 kg) / pa (kg/cm²) -> convertir a m²: /10000
  const cargaKg = p.carga * 1000 * MAYORACION_ZAPATA;
  const areaReqM2 = cargaKg / (pa * 10000);
  let lado = Math.sqrt(areaReqM2);
  // Redondear al múltiplo comercial 5 cm hacia arriba
  lado = Math.ceil(lado * 20) / 20;
  if (lado < Math.max(p.bCol, p.hCol) / 100 + 0.2) {
    lado = Math.max(Math.max(p.bCol, p.hCol) / 100 + 0.3, lado);
    lado = Math.ceil(lado * 20) / 20;
  }

  const espesor = p.espesor && p.espesor > 0
    ? p.espesor / 100
    : Math.max(0.4, Math.max(p.bCol, p.hCol) / 100 * 1.5);

  return { pa, lado, espesor };
}

export function calcZapata(p: ParamsZapata): Resultado {
  if (p.bCol <= 0 || p.hCol <= 0 || p.carga <= 0 || p.cant <= 0)
    return { error: 'Base/altura de columna, carga (tn) y cantidad deben ser mayores a cero.' };

  const avisos: Aviso[] = [];

  const dim = dimensionarZapata(p);
  if ('error' in dim) return dim;
  const { pa, lado, espesor } = dim;

  const B = lado;
  const H = lado;
  const areaZap = B * H;
  // Carga mayorada 10% por peso propio de zapata y relleno encima
  // (criterio práctico de obra; no es una exigencia de E.050).
  const cargaKg = p.carga * 1000 * MAYORACION_ZAPATA;
  const areaReqM2 = cargaKg / (pa * 10000);
  if (espesor < 0.4) avisos.push({ n: 'warn', t: 'Espesor < 0.40 m: usualmente se incrementa para zapatas aisladas en vivienda.' });
  if (p.fc < 175)
    avisos.push({ n: 'bad', t: `f'c ${p.fc} kg/cm²: no cumple el mínimo de 175 kg/cm² para cimentación armada (RNE E.060).` });

  const volConcreto = areaZap * espesor * p.cant;
  const dos = dosConcreto(p.fc);
  const cem = volConcreto * dos.bolsas * 1.05;
  const arena = volConcreto * dos.arena * 1.05;
  const piedra = volConcreto * dos.piedra * 1.05;

  // Solado de 5 cm bajo la zapata, 10 cm por lado (práctica de obra peruana).
  const eSolado = 0.05;
  const bordeSolado = 0.10;
  const areaSolado = (B + 2 * bordeSolado) ** 2;
  const volSolado = areaSolado * eSolado * p.cant;
  const dosSol = TABLAS.solado;
  const cemSol = volSolado * dosSol.bolsas * 1.05;
  const hormigonSol = volSolado * dosSol.hormigon;

  const aVar = aceroData(p.dVar);
  // Recubrimiento de 7.5 cm: concreto vaciado contra el terreno (RNE E.060).
  const rec = 0.075;
  const longVar = B - 2 * rec;
  // Barras para separación ≤ 0.20 m: n espacios = ceil(L/0.20) y n+1 barras.
  const numVarXM = Math.max(4, Math.ceil((B - 2 * rec) / 0.20) + 1);
  const numVarYM = numVarXM;
  // Plan de corte: cada varilla de 9 m rinde floor(8.7 / largo) piezas; se
  // reservan 0.30 m por barra para cortes y se suma 5% de desperdicio.
  const piezas = (numVarXM + numVarYM) * p.cant;
  const varillas = varillasDe9m(piezas * 1.05, longVar);
  const porVarilla = Math.max(1, Math.floor(8.7 / longVar));
  const kgFierro = varillas * aVar.varilla_m * aVar.kg_ml;

  const perimEnc = 4 * B * p.cant;
  const alturaEnc = espesor;
  const encofrado = perimEnc * alturaEnc;

  if (pa <= 1.0) avisos.push({ n: 'warn', t: `Presión admisible ${pa.toFixed(2)} kg/cm² (suelo blando). Verificar estudio de mecánica de suelos si es portante.` });
  avisos.push({ n: 'warn', t: 'Predimensionado de área para metrado: no verifica punzonamiento, corte ni flexión. NO sustituye el cálculo estructural ni la cimentación del estudio de suelos (RNE E.050).' });

  const pasos = [
    `1. PRESIÓN ADMISIBLE DEL SUELO:`,
    `   • Tipo: ${p.suelo} | pa = ${pa.toFixed(2)} kg/cm².`,
    `   • Carga axial: ${p.carga} tn → ${(p.carga * 1000 * MAYORACION_ZAPATA).toFixed(0)} kg (incluye 10% por peso propio y relleno encima; criterio práctico de obra).`,
    `   • Área requerida: ${cargaKg.toFixed(0)} kg ÷ (${pa} kg/cm² × 10000 cm²/m²) = ${areaReqM2.toFixed(3)} m².`,
    `2. DIMENSIONADO DE ZAPATA (cuadrada):`,
    `   • Lado adoptado B×H: ${B.toFixed(2)} m × ${H.toFixed(2)} m (área ${areaZap.toFixed(3)} m²).`,
    `   • Presión que transmite: ${cargaKg} ÷ ${areaZap.toFixed(3)} = ${(cargaKg / areaZap).toFixed(0)} kg/m² < ${pa*10000} kg/m².`,
    `   • Espesor h: ${espesor.toFixed(2)} m.`,
    `3. ARMADO INFERIOR (orientativo en ambas direcciones):`,
    `   • Varillas Ø ${p.dVar}" @~20 cm en X e Y (recubrimiento 7.5 cm: concreto vaciado contra el suelo).`,
    `   • Longitud efectiva: ${(B-rec*2).toFixed(2)} m | Cantidad aprox: ${numVarXM} + ${numVarYM} varillas por zapata.`,
    `   • Varillas a comprar (9 m c/u +5%, plan de corte: ${porVarilla} pieza(s) por varilla): ${varillas} varillas Ø ${p.dVar}" (~${kgFierro.toFixed(1)} kg).`,
    `4. CONCRETO (f'c = ${p.fc} kg/cm²):`,
    `   • Volumen: ${p.cant} zap. × ${B.toFixed(2)}×${H.toFixed(2)}×${espesor.toFixed(2)} = ${volConcreto.toFixed(3)} m³.`,
    `   • Cemento: ${cem.toFixed(1)} bolsas | Arena: ${arena.toFixed(2)} m³ | Piedra: ${piedra.toFixed(2)} m³.`,
    `5. SOLADO (concreto simple 1:10, e = 5 cm, +10 cm por lado):`,
    `   • Área: (${B.toFixed(2)} + 2×0.10)² = ${areaSolado.toFixed(2)} m²/zapata × ${p.cant} = ${(areaSolado * p.cant).toFixed(2)} m².`,
    `   • Volumen: ${volSolado.toFixed(3)} m³ | Cemento: ${cemSol.toFixed(1)} bolsas | Hormigón: ${hormigonSol.toFixed(2)} m³.`,
    `6. ENCOFRADO: ${encofrado.toFixed(1)} m² de madera.`,
  ];

  return {
    titulo: 'Zapata aislada',
    detalle: `${p.cant} zapata(s) ${B.toFixed(2)}×${H.toFixed(2)} m, h=${espesor.toFixed(2)} m, pa=${pa.toFixed(2)} kg/cm²`,
    resumen: [
      { nombre: 'Lado zapata', valor: B.toFixed(2), unidad: 'm' },
      { nombre: 'Espesor', valor: espesor.toFixed(2), unidad: 'm' },
      { nombre: 'Concreto f\'c ' + p.fc, valor: volConcreto.toFixed(3), unidad: 'm³' },
      { nombre: 'Solado 1:10', valor: volSolado.toFixed(3), unidad: 'm³' },
      { nombre: 'Hormigón solado', valor: ceil1(hormigonSol), unidad: 'm³' },
      { nombre: 'Cemento', valor: comprarEntero(cem) + comprarEntero(cemSol), unidad: 'bolsas' },
      { nombre: 'Fierro (orient.)', valor: kgFierro.toFixed(1), unidad: 'kg' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cem,      comprar: comprarEntero(cem),   desglose: `${volConcreto.toFixed(2)} m³ × ${dos.bolsas} bol/m³ (+5% desp.)` },
      { id: 'arena_gruesa',    cant: arena,    comprar: ceil1(arena),         desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedra,   comprar: ceil1(piedra),        desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      { id: 'cemento',         cant: cemSol,   comprar: comprarEntero(cemSol), nota: 'Solado 1:10 (5 cm)', desglose: `${volSolado.toFixed(3)} m³ solado × ${dosSol.bolsas} bol/m³ (+5% desp.)` },
      { id: 'hormigon',        cant: hormigonSol, comprar: ceil1(hormigonSol), nota: 'Solado 1:10 (5 cm)', desglose: `${volSolado.toFixed(3)} m³ solado × ${dosSol.hormigon} m³/m³` },
      { id: aVar.id_cat,       cant: varillas, comprar: varillas, nota: `Malla inferior Ø ${p.dVar}" X/Y (~${kgFierro.toFixed(0)} kg)`, desglose: `${numVarXM + numVarYM} var/zapata × ${(B-rec*2).toFixed(2)} m × ${p.cant} zap. — plan de corte (${porVarilla} por varilla de 9 m, +5%)` },
      { id: 'alambre_8',       cant: Math.max(kgFierro * 0.02, 0.5), comprar: ceil1(Math.max(kgFierro * 0.02, 0.5)), nota: 'Alambre N°16 de amarre', desglose: `~2% del acero` },
      { id: 'madera_encofrado', cant: encofrado, comprar: ceil1(encofrado),   desglose: `Perímetro ${B.toFixed(2)}×4 × ${p.cant} zap. × h=${espesor.toFixed(2)}m` },
    ],
    avisos,
    pasos,
  };
}

export function calcEscalera(p: ParamsEscalera): Resultado {
  if (p.altura <= 0 || p.ancho <= 0)
    return { error: 'La altura entre pisos y el ancho deben ser mayores a cero.' };
  if (p.altura > 6)
    return { error: 'Altura de escalera fuera de rango (máx. 6 m). Verifica la medida.' };

  const avisos: Aviso[] = [];
  const dos = dosConcreto(p.fc);

  if (p.fc < 210)
    avisos.push({ n: 'bad', t: `f'c ${p.fc} kg/cm²: no cumple el mínimo de 210 kg/cm² para un elemento estructural como la escalera (RNE E.060).` });

  // Geometría: número de contrahuellas por ergonomía (≈ 18 cm). Con n
  // contrahuellas el último escalón llega al piso superior, así que quedan
  // n − 1 huellas: el piso hace de última huella. Se usa ceil para que la
  // contrahuella NUNCA supere el máximo de 18 cm (con round, 3.30 m daba 18.3).
  const n = Math.max(3, Math.ceil((p.altura * 100) / 18));
  const ch = (p.altura * 100) / n;              // contrahuella exacta (cm)
  const hu = p.huella === 'auto' ? 27 : Number(p.huella); // huella (cm)
  const nHuellas = n - 1;
  const desH = (nHuellas * hu) / 100;           // desarrollo horizontal (m)
  // Lanza: corre paralela a la línea de narices (n−1 huellas), no de piso a piso.
  const L = nHuellas * Math.hypot(hu / 100, ch / 100); // longitud inclinada (m)
  const pend = (Math.atan2(ch, hu) * 180) / Math.PI;   // pendiente de la escalera (°)
  const blondel = 2 * ch + hu;                   // fórmula de Blondel (cm)

  if (pend >= 30 && pend <= 38)
    avisos.push({ n: 'ok', t: `Pendiente ${pend.toFixed(1)}°: dentro del rango cómodo de 30° a 38°.` });
  else
    avisos.push({ n: 'warn', t: `Pendiente ${pend.toFixed(1)}°: lo cómodo para vivienda es 30° a 38°. Ajusta la altura o el ancho del tramo.` });

  if (blondel >= 60 && blondel <= 64)
    avisos.push({ n: 'ok', t: `Ergonomía: 2×${ch.toFixed(1)} + ${hu} = ${blondel.toFixed(1)} cm — fórmula de Blondel cumplida (60 a 64 cm).` });
  else
    avisos.push({ n: 'warn', t: `Ergonomía: 2×${ch.toFixed(1)} + ${hu} = ${blondel.toFixed(1)} cm — Blondel aconseja 60 a 64 cm; así se sube y baja incómodo.` });

  if (ch > 18 + 1e-9)
    avisos.push({ n: 'bad', t: `Contrahuella ${ch.toFixed(1)} cm: supera el máximo normativo de 0.18 m para vivienda (RNE A.010/A.020, Art. 29/15). Revisa la altura entre pisos.` });
  if (ch < 15)
    avisos.push({ n: 'warn', t: `Contrahuella ${ch.toFixed(1)} cm: muy baja; la escalera queda larga y pesada.` });
  if (p.ancho < 0.90)
    avisos.push({ n: 'warn', t: `Ancho ${p.ancho} m: entre muros el mínimo es 0.90 m (RNE A.020 Art. 15.1); 0.80 m solo si un lado está abierto.` });
  if (p.altura > 3.5)
    avisos.push({ n: 'warn', t: `Altura ${p.altura} m en un solo tramo: es mucha; lo usual es dividir en dos tramos con meseta intermedia.` });
  avisos.push({ n: 'ok', t: 'El fierro es orientativo: el armado real de la escalera lo define el plano estructural (RNE E.060).' });

  // Concreto: cuerpo escalonado (promedio sobre la lanza) + lanza inclinada.
  // Espesor de la losa: en vivienda va de 12 a 15 cm; 25 cm solo para cargas
  // altas. Se ajusta con el input `lanza` (cm).
  const lanzaCm = p.lanza ?? 15;
  if (lanzaCm < 12 || lanzaCm > 20)
    avisos.push({ n: 'warn', t: `Lanza de ${lanzaCm} cm: fuera del rango usual de 12 a 20 cm en vivienda. El espesor real lo define el plano estructural.` });
  const eLanza = lanzaCm / 100;                      // m
  const aPasos = (nHuellas * (hu / 100) * (ch / 100)) / 2; // m² (triángulos sobre la línea de narices)
  const aLanza = L * eLanza;                        // m²
  const volEsc = (aPasos + aLanza) * p.ancho;       // m³
  const volTotal = volEsc * 1.05;                   // +5% desperdicio

  const cemEsc = volTotal * dos.bolsas;
  const arenaEsc = volTotal * dos.arena;
  const piedraEsc = volTotal * dos.piedra;

  // Fierro orientativo: longitudinales Ø 1/2" + transversales/amarre Ø 3/8"
  const aL = aceroData('1/2');
  const aE = aceroData('3/8');
  const despL = (TABLAS.desperdicios.fierro as Record<string, number>)['1/2'] ?? 0.05;
  const despE = (TABLAS.desperdicios.fierro as Record<string, number>)['3/8'] ?? 0.03;

  const varLong = Math.max(4, Math.round(p.ancho * 4)); // 4 varillas por cada 1 m de ancho
  const largoBarraL = L + 0.50;                         // anclaje en los apoyos
  const longL = varLong * largoBarraL * (1 + despL);    // m a lo largo de la lanza
  const varillasL = Math.ceil(varillasDe9m(varLong, largoBarraL) * (1 + despL));
  const kgL = varillasL * aL.varilla_m * aL.kg_ml;

  const nTrans = 2 * n;                                          // 2 transversales por escalón
  const nEst = Math.max(4, Math.round(L / 0.25));                // amarre cada 25 cm
  const longE = (nTrans * (p.ancho + 0.30) + nEst * 2 * (p.ancho + 0.15)) * (1 + despE);
  const varillasE = Math.ceil(longE / aE.varilla_m);
  const kgE = varillasE * aE.varilla_m * aE.kg_ml;

  const kgTotal = kgL + kgE;
  const alambre = Math.max(kgTotal * 0.03, 1.0); // 3% alambre negro N° 16

  // Encofrado: 2 laterales (perfil) + sofito de la lanza + contrahuellas
  const encofrado = 2 * (aPasos + aLanza) + L * p.ancho + n * p.ancho * (ch / 100);
  const clavosEsc = encofrado * 0.8;

  const pasos = [
    `1. GEOMETRÍA (${n} contrahuellas y ${nHuellas} huellas):`,
    `   • Contrahuella: ${p.altura} m ÷ ${n} = ${ch.toFixed(1)} cm · Huella: ${hu} cm.`,
    `   • Desarrollo horizontal: ${nHuellas} × ${hu} cm = ${desH.toFixed(2)} m (la última huella es el piso superior) · Pendiente: ${pend.toFixed(1)}°.`,
    `   • Ergonomía Blondel: 2 × ${ch.toFixed(1)} + ${hu} = ${blondel.toFixed(1)} cm (ideal 60 a 64).`,
    `2. CONCRETO ESTRUCTURAL (f'c = ${p.fc} kg/cm²):`,
    `   • Cuerpo escalonado: ${nHuellas} × (${hu} × ${ch.toFixed(1)} cm) ÷ 2 = ${aPasos.toFixed(2)} m².`,
    `   • Lanza inclinada (${lanzaCm} cm): ${L.toFixed(2)} m × ${eLanza.toFixed(2)} m = ${aLanza.toFixed(2)} m².`,
    `   • Volumen: (${aPasos.toFixed(2)} + ${aLanza.toFixed(2)}) m² × ${p.ancho} m × 1.05 = ${volTotal.toFixed(3)} m³.`,
    `   • Cemento: ${volTotal.toFixed(3)} m³ × ${dos.bolsas} bol/m³ = ${cemEsc.toFixed(1)} bolsas.`,
    `3. FIERRO ORIENTATIVO (confirmar con plano estructural):`,
    `   • Longitudinales lanza: ${varLong} varillas Ø 1/2" × ${largoBarraL.toFixed(2)} m (incluye 0.50 m de anclaje, +${(despL * 100).toFixed(0)}%) → ${varillasL} varillas de 9 m (${kgL.toFixed(1)} kg).`,
    `   • Transversales y amarre: ${nTrans} barras transversales + ${nEst} estribos @25 cm Ø 3/8" → ${varillasE} varillas de 9 m (${kgE.toFixed(1)} kg).`,
    `4. ALAMBRE, CLAVOS Y ENCOFRADO:`,
    `   • Alambre N° 16 (3% del fierro): ${alambre.toFixed(1)} kg.`,
    `   • Clavos para encofrado 2 1/2": ~${clavosEsc.toFixed(1)} kg.`,
    `   • Encofrado: ${encofrado.toFixed(1)} m² (2 laterales + sofito + ${n} contrahuellas).`,
  ];

  return {
    titulo: 'Escalera',
    detalle: `Escalera recta de ${n} contrahuellas y ${nHuellas} huellas, ${p.ancho} m de ancho, ${p.altura} m de altura`,
    resumen: [
      { nombre: 'Contrahuellas', valor: n, unidad: 'und' },
      { nombre: 'Huellas', valor: nHuellas, unidad: 'und' },
      { nombre: 'Contrahuella', valor: ch.toFixed(1), unidad: 'cm' },
      { nombre: 'Huella', valor: hu, unidad: 'cm' },
      { nombre: 'Pendiente', valor: pend.toFixed(1), unidad: '°' },
      { nombre: 'Desarrollo', valor: desH.toFixed(2), unidad: 'm' },
      { nombre: 'Concreto f\'c ' + p.fc, valor: volTotal.toFixed(3), unidad: 'm³' },
      { nombre: 'Cemento', valor: comprarEntero(cemEsc), unidad: 'bolsas' },
      { nombre: 'Fierro total', valor: kgTotal.toFixed(1), unidad: 'kg' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemEsc,    comprar: comprarEntero(cemEsc), desglose: `${volTotal.toFixed(2)} m³ concreto f'c ${p.fc} × ${dos.bolsas} bol/m³ (+5% desp.)` },
      { id: 'arena_gruesa',    cant: arenaEsc,  comprar: ceil1(arenaEsc),       desglose: `${volTotal.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedraEsc, comprar: ceil1(piedraEsc),      desglose: `${volTotal.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      { id: aL.id_cat,         cant: varillasExactas(longL, aL), comprar: varillasL, nota: `${varLong} varillas Ø 1/2" longitudinales (~${kgL.toFixed(0)} kg)`, desglose: `${varLong} × ${largoBarraL.toFixed(2)} m lanza con anclaje (+${(despL * 100).toFixed(0)}% corte) ÷ ${aL.varilla_m}m` },
      { id: aE.id_cat,         cant: varillasExactas(longE, aE), comprar: varillasE, nota: `Transversales y amarre Ø 3/8" (~${kgE.toFixed(0)} kg)`,       desglose: `${nTrans} transversales + ${nEst} estribos @25 cm (+${(despE * 100).toFixed(0)}%) ÷ ${aE.varilla_m}m` },
      { id: 'alambre_8',       cant: alambre,    comprar: ceil1(alambre), nota: 'Alambre N°16 de amarre',       desglose: `3% del peso total de fierro (${kgTotal.toFixed(0)} kg)` },
      { id: 'clavos_encofrado', cant: clavosEsc,  comprar: ceil1(clavosEsc), nota: 'Clavos 2 1/2"',               desglose: `${encofrado.toFixed(1)} m² encofrado × 0.8 kg/m²` },
      { id: 'madera_encofrado', cant: encofrado,  comprar: ceil1(encofrado),                                    desglose: `2 laterales + sofito ${L.toFixed(2)}m×${p.ancho}m + ${n} contrahuellas` },
    ],
    avisos,
    pasos,
  };
}

// ─── Diámetro en mm ───────────────────────────────────────────────────────────
function diametroMm(diam: string): number {
  const map: Record<string, number> = {
    '1/4': 6.35, '3/8': 9.525, '1/2': 12.7, '5/8': 15.875, '3/4': 19.05,
  };
  return map[diam] ?? 9.525;
}

// ─── Punto de entrada principal ───────────────────────────────────────────────
export function calcular(id: string, params: ParamsCalculo): Resultado {
  try {
    switch (id) {
      case 'cimientos': return calcCimientos(params as ParamsCimientos);
      case 'muros':     return calcMuros(params as ParamsMuros);
      case 'columnas':  return calcColumnas(params as ParamsColumnas);
      case 'vigas':     return calcVigas(params as ParamsVigas);
      case 'losa':      return calcLosa(params as ParamsLosa);
      case 'acabados':  return calcAcabados(params as ParamsAcabados);
      case 'escalera':  return calcEscalera(params as ParamsEscalera);
      case 'zapata':    return calcZapata(params as ParamsZapata);
      default:          return { error: `Calculadora desconocida: ${id}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error inesperado en el cálculo.' };
  }
}
