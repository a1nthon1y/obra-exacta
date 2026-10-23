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

function aceroData(diam: string) {
  const a = (TABLAS.acero as Record<string, { kg_ml: number; varilla_m: number; id_cat: string }>)[diam];
  if (!a) throw new Error(`Diámetro desconocido: ${diam}`);
  return a;
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

// ─── 1. CIMIENTOS Y SOBRECIMIENTOS ─────────────────────────────────────────────
export function calcCimientos(p: ParamsCimientos): Resultado {
  if (p.largo <= 0 || p.ancho <= 0 || p.prof <= 0 || p.alto <= 0)
    return { error: 'Todas las medidas deben ser mayores a cero.' };

  const avisos: Aviso[] = [];

  // 1. Excavación de zanja
  const volExcavacion = p.largo * p.ancho * p.prof;

  // 2. Cimiento ciclópeo 1:10 + 30% piedra grande PG (Capeco)
  const dosC = TABLAS.cimientoCiclopeo['1:10+30%piedra'];
  const volCimiento = p.largo * p.ancho * p.prof; // volumen zanja
  const cemCimiento = volCimiento * dosC.bolsas * 1.05; // 2.9 bolsas/m³ + 5% desp.
  const hormigonCimiento = volCimiento * dosC.hormigon; // 0.83 m³/m³
  const piedraCimiento = volCimiento * dosC.piedra;     // 0.48 m³/m³ de PG

  // 3. Sobrecimiento 1:8 + 25% piedra mediana PM (Capeco)
  const dosS = TABLAS.cimientoCiclopeo['1:8+25%piedra'];
  const volSobre = p.largo * p.esp * p.alto;
  const cemSobre = volSobre * dosS.bolsas * 1.05;      // 3.7 bolsas/m³ + 5% desp.
  const hormigonSobre = volSobre * dosS.hormigon;      // 0.85 m³/m³
  const piedraSobre = volSobre * dosS.piedra;          // 0.40 m³/m³ de PM

  // Encofrado de sobrecimiento: 2 caras laterales de madera
  const encofrado = p.largo * p.alto * 2;

  const cemTotal = cemCimiento + cemSobre;
  const hormigonTotal = hormigonCimiento + hormigonSobre;

  // Avisos según normas peruanas (RNE E.050 Suelos y Cimentaciones)
  if (p.prof < 0.80)
    avisos.push({ n: 'warn', t: `Profundidad de cimiento ${p.prof.toFixed(2)} m: la profundidad usual mínima recomendada es 0.80 m (RNE E.050).` });
  if (p.ancho < 0.50)
    avisos.push({ n: 'bad', t: `Ancho de cimiento ${p.ancho.toFixed(2)} m: el ancho mínimo habitual para muros portantes es 0.50 m (RNE E.050 / Sencico).` });
  if (p.alto < 0.30)
    avisos.push({ n: 'warn', t: `Sobrecimiento de ${p.alto.toFixed(2)} m: se recomienda mínimo 0.30 m sobre el nivel del terreno para proteger el ladrillo de la humedad.` });

  const pasos = [
    `1. EXCAVACIÓN DE ZANJA:`,
    `   ${p.largo} m (largo) × ${p.ancho} m (ancho) × ${p.prof} m (prof.) = ${volExcavacion.toFixed(2)} m³ de zanja.`,
    `2. CIMIENTO CORRIDO (Mezcla 1:10 + 30% Piedra Grande - Capeco):`,
    `   • Cemento: ${volCimiento.toFixed(2)} m³ × ${dosC.bolsas} bol/m³ × 1.05 (desp. 5%) = ${cemCimiento.toFixed(1)} bolsas.`,
    `   • Hormigón de río: ${volCimiento.toFixed(2)} m³ × ${dosC.hormigon} m³/m³ = ${hormigonCimiento.toFixed(2)} m³.`,
    `   • Piedra Grande de Zanja (8"-10"): ${volCimiento.toFixed(2)} m³ × ${dosC.piedra} m³/m³ = ${piedraCimiento.toFixed(2)} m³.`,
    `3. SOBRECIMIENTO (Mezcla 1:8 + 25% Piedra Mediana - Capeco):`,
    `   Volumen: ${p.largo} m × ${p.esp} m × ${p.alto} m = ${volSobre.toFixed(2)} m³.`,
    `   • Cemento: ${volSobre.toFixed(2)} m³ × ${dosS.bolsas} bol/m³ × 1.05 = ${cemSobre.toFixed(1)} bolsas.`,
    `   • Hormigón: ${volSobre.toFixed(2)} m³ × ${dosS.hormigon} m³/m³ = ${hormigonSobre.toFixed(2)} m³.`,
    `   • Piedra Mediana (3"-4"): ${volSobre.toFixed(2)} m³ × ${dosS.piedra} m³/m³ = ${piedraSobre.toFixed(2)} m³.`,
    `4. ENCOFRADO DE SOBRECIMIENTO:`,
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
    detalle: `${p.largo} m de cimiento corrido (${p.ancho}×${p.prof} m) + sobrecimiento`,
    resumen: [
      { nombre: 'Excavación', valor: volExcavacion.toFixed(2), unidad: 'm³' },
      { nombre: 'Cemento total', valor: comprarEntero(cemTotal), unidad: 'bolsas' },
      { nombre: 'Hormigón', valor: ceil1(hormigonTotal), unidad: 'm³' },
      { nombre: 'Piedra Grande (PG)', valor: ceil1(piedraCimiento), unidad: 'm³' },
      { nombre: 'Piedra Mediana (PM)', valor: ceil1(piedraSobre), unidad: 'm³' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemTotal,           comprar: comprarEntero(cemTotal), desglose: `Cimiento: ${cemCimiento.toFixed(1)} bol + Sobrecimiento: ${cemSobre.toFixed(1)} bol = ${cemTotal.toFixed(1)} bol` },
      { id: 'hormigon',        cant: hormigonTotal,      comprar: ceil1(hormigonTotal),    desglose: `Cimiento: ${hormigonCimiento.toFixed(2)} m³ + Sobrecimiento: ${hormigonSobre.toFixed(2)} m³` },
      { id: 'piedra_grande',   cant: piedraCimiento,     comprar: ceil1(piedraCimiento), nota: 'Para zanja', desglose: `${volCimiento.toFixed(2)} m³ zanja × 0.48 m³/m³ PG` },
      { id: 'piedra_mediana',  cant: piedraSobre,        comprar: ceil1(piedraSobre),    nota: 'Para sobrecimiento', desglose: `${volSobre.toFixed(2)} m³ sobrec. × 0.40 m³/m³ PM` },
      { id: 'madera_encofrado', cant: encofrado,         comprar: ceil1(encofrado),      desglose: `${p.largo} m × ${p.alto} m × 2 caras laterales` },
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

  // Esbeltez (altura / espesor efectivo según RNE E.070 Art. 19.1.b: t ≥ h/20)
  const espesorMuro = p.aparejo === 'soga' ? ab / 100
                    : p.aparejo === 'cabeza' ? lb / 100
                    : hb / 100;
  const esbeltez = p.alto / espesorMuro;

  if (esbeltez > 20) {
    if (p.uso === 'portante')
      avisos.push({ n: 'bad', t: `Esbeltez ${esbeltez.toFixed(1)}: la altura del muro es excesiva para su espesor (máximo permitido 20 según RNE E.070 para muros portantes). Se requiere viga de amarre o mayor espesor.` });
    else
      avisos.push({ n: 'warn', t: `Esbeltez ${esbeltez.toFixed(1)}: el muro es muy esbelto para su espesor. Aunque es tabique (no portante), conviene usar mayor espesor o anclajes.` });
  }
  else if (esbeltez > 17 && p.uso === 'portante')
    avisos.push({ n: 'warn', t: `Esbeltez ${esbeltez.toFixed(1)}: cerca del límite sísmico. Coordinar refuerzos con el capataz.` });

  if (p.ladrillo === 'pand' && p.uso === 'portante')
    avisos.push({ n: 'bad', t: 'PROHIBIDO POR NORMA: Las unidades tubulares (pandereta) no pueden usarse en muros portantes en zonas sísmicas 2-4 — casi todo el Perú — según RNE E.070 cláusula 5.3. Use ladrillo King Kong 18 huecos.' });

  const mezclaNum = Number(p.mezcla);
  if (p.uso === 'portante' && mezclaNum > 5)
    avisos.push({ n: 'warn', t: `Mezcla 1:${mezclaNum}: para muros portantes la norma peruana especifica mortero 1:4 o 1:5.` });

  // Rendimiento unitario CALCULADO con la fórmula del Manual del Maestro Constructor
  // (Aceros Arequipa): und/m² = 1 ÷ [(cara visible + junta) × (alto + junta)].
  // Así el resultado se ajusta a las medidas reales del ladrillo y a la junta elegida.
  const caraCm  = p.aparejo === 'cabeza' ? ab : lb;   // cara expuesta del ladrillo
  const altCm   = p.aparejo === 'canto'  ? ab : hb;   // otra dimensión de la cara
  const undM2   = 1 / (((caraCm + junta) / 100) * ((altCm + junta) / 100));
  const morteroM2 = dosLad.mortero_m3;

  // Ladrillos
  const ladNeto = areaNeta * undM2;
  const ladTot  = ladNeto * (1 + p.desL / 100);

  // Mortero (consumo publicado para KK18; el ladrillo hueco puede filtrar el doble —
  // el usuario ajusta con el % de desperdicio)
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
    `   • Factor unitario: 1 ÷ [(cara ${caraCm} cm + junta ${junta} cm) × (lado ${altCm} cm + junta ${junta} cm)] = ${undM2.toFixed(1)} ladrillos/m².`,
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
      { id: idLad,          cant: ladTot,     comprar: comprarEntero(ladTot), desglose: `${areaNeta.toFixed(1)} m² × ${undM2.toFixed(1)} und/m² (cara ${caraCm}+junta ${junta} cm, +${p.desL}% rotura)` },
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

  // Sección mínima según sistema estructural (RNE E.070 / E.060)
  const secMin = p.sis === 'confinada' ? 15 : 25;
  if (Math.min(p.b, p.h) < secMin)
    avisos.push({ n: 'bad', t: `Dimensión mínima: la sección mínima usual para columnas de ${p.sis === 'confinada' ? 'albañilería confinada es 15 cm' : 'pórticos sismorresistentes es 25 cm'} (RNE E.070/E.060).` });

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
  const despVar = (TABLAS.desperdicios.fierro as Record<string, number>)[p.dVar] ?? 0.05;
  const varillasVar = Math.ceil((longVarTotal * (1 + despVar)) / aVar.varilla_m);
  const kgVar = varillasVar * aVar.varilla_m * aVar.kg_ml;

  // Cuantía de acero longitudinal (RNE E.060: mínimo 1%, máximo 4%)
  const aAceroCm2 = (Math.PI / 4) * (diametroMm(p.dVar) / 10) ** 2 * p.nVar;
  const aSeccionCm2 = p.b * p.h;
  const cuantia = (aAceroCm2 / aSeccionCm2) * 100;

  if (cuantia < 1.0)
    avisos.push({ n: 'bad', t: `Cuantía de acero ${cuantia.toFixed(2)}%: está por debajo del mínimo reglamentario de 1.0% (RNE E.060). Aumentar número o diámetro de varillas.` });
  else if (cuantia > 4.0)
    avisos.push({ n: 'warn', t: `Cuantía de acero ${cuantia.toFixed(2)}%: supera el 4% (congestión de fierro que dificulta el vaciado).` });

  // 3. Estribos (Distribución sísmica RNE E.060 / Sencico)
  // Zona de confinamiento en ambos extremos:
  const zonaConf = Math.max((p.alto * 100) / 6, Math.max(p.b, p.h), 50); // cm
  const dbVar = diametroMm(p.dVar) / 10; // cm
  const espZC = Math.min(10, 8 * dbVar); // cm (ej: 1@5, resto@10)
  const espResto = Math.min(20, Math.min(p.b, p.h)); // cm en zona central
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

  const acMinCm2 = aSeccionCm2 * 0.01; // 1% mínimo RNE E.060
  const acMaxCm2 = aSeccionCm2 * 0.04; // 4% máximo RNE E.060
  if (aAceroCm2 < acMinCm2) {
    avisos.push({ n: 'bad', t: `Cuantía insuficiente: ${aAceroCm2.toFixed(2)} cm² < ${acMinCm2.toFixed(2)} cm² (mínimo 1% RNE E.060). Aumentar número/diámetro de varillas longitudinales.` });
  } else if (aAceroCm2 > acMaxCm2) {
    avisos.push({ n: 'bad', t: `Cuantía excesiva: ${aAceroCm2.toFixed(2)} cm² > ${acMaxCm2.toFixed(2)} cm² (máximo 4% RNE E.060). Difícil compactar concreto; reducir acero o aumentar sección.` });
  } else {
    avisos.push({ n: 'ok', t: `Cuantía dentro de rango normativo: ${cuantia.toFixed(2)}% (1% - 4% RNE E.060).` });
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
    `   • Cuantía: ${aAceroCm2.toFixed(2)} cm² de acero ÷ ${aSeccionCm2} cm² sección = ${cuantia.toFixed(2)}% (Norma: 1% a 4%).`,
    `   • Mínimo: ${acMinCm2.toFixed(2)} cm² | Máximo: ${acMaxCm2.toFixed(2)} cm².`,
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
      { nombre: 'Cuantía RNE E.060', valor: cuantia.toFixed(2), unidad: '%' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemCols,    comprar: comprarEntero(cemCols), desglose: `${volCol.toFixed(2)} m³ concreto f'c ${p.fc} × ${dos.bolsas} bol/m³ (+5% desp.)` },
      { id: 'arena_gruesa',    cant: arenaCols,  comprar: ceil1(arenaCols),       desglose: `${volCol.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedraCols, comprar: ceil1(piedraCols),     desglose: `${volCol.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      { id: aVar.id_cat,       cant: kgVarComp, comprar: varillasVarComp, nota: `${p.nVar} varillas Ø ${p.dVar}" +traslape ${((traslapeFactor-1)*100).toFixed(0)}%`, desglose: `${p.cant} cols × ${p.nVar} var. × ${longVarPorVarilla.toFixed(2)}m (+corte+traslape) ÷ 9m` },
      { id: aEst.id_cat,       cant: kgEstComp, comprar: varillasEstComp, nota: `Estribos Ø ${p.dEst}" +traslape ${((traslapeFactor-1)*100).toFixed(0)}%`,          desglose: `${nEstTotal} estribos sísmicos × ${longEst.toFixed(2)}m desarrollo ÷ 9m` },
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

  const aSup = aceroData(p.dSup);
  const aInf = aceroData(p.dInf);
  const aEst = aceroData(p.dEst);

  // 1. Concreto
  const volViga = (p.b / 100) * (p.h / 100) * p.luz * p.cant;
  const cemVigas = volViga * dos.bolsas * 1.05;
  const arenaVigas = volViga * dos.arena * 1.05;
  const piedraVigas = volViga * dos.piedra * 1.05;

  // Acero mínimo inferior según RNE E.060: As,min = (0.7 * √f'c / fy) * b * d
  const dEfectivo = (p.h - p.rec); // cm
  const AcMinCm2 = (0.7 * Math.sqrt(p.fc) / 4200) * p.b * dEfectivo;
  const AcProvCm2 = (Math.PI / 4) * (diametroMm(p.dInf) / 10) ** 2 * p.nInf;

  if (AcProvCm2 < AcMinCm2)
    avisos.push({ n: 'bad', t: `Acero inferior (${AcProvCm2.toFixed(2)} cm²): menor al mínimo reglamentario (${AcMinCm2.toFixed(2)} cm²) según RNE E.060. Incrementar diámetro o varillas inferiores.` });

  // Longitud de varillas longitudinales (luz + 0.50 m anclajes)
  const longSupTotal = (p.luz + 0.50) * p.nSup * p.cant;
  const longInfTotal = (p.luz + 0.50) * p.nInf * p.cant;
  const despSup = (TABLAS.desperdicios.fierro as Record<string, number>)[p.dSup] ?? 0.05;
  const despInf = (TABLAS.desperdicios.fierro as Record<string, number>)[p.dInf] ?? 0.05;

  const varSup = Math.ceil((longSupTotal * (1 + despSup)) / aSup.varilla_m);
  const varInf = Math.ceil((longInfTotal * (1 + despInf)) / aInf.varilla_m);
  const kgSup = varSup * aSup.varilla_m * aSup.kg_ml;
  const kgInf = varInf * aInf.varilla_m * aInf.kg_ml;

  // Estribos de viga (confinamiento en 2*d en cada apoyo)
  const zonaConf = 2 * dEfectivo; // cm
  const espZC = Math.min(dEfectivo / 4, 8 * (diametroMm(p.dInf) / 10), 20); // cm
  const espResto = dEfectivo / 2; // cm
  const nEstZC = Math.ceil((zonaConf - 5) / espZC) + 1;
  const nEstResto = Math.max(Math.ceil((p.luz * 100 - 2 * zonaConf) / espResto), 1);
  const nEstTotal = (nEstZC * 2 + nEstResto) * p.cant;

  const anchoEst = Math.max(p.b - 2 * p.rec, 5);
  const altoEst = Math.max(p.h - 2 * p.rec, 5);
  const longEst = (2 * (anchoEst + altoEst) + 15) / 100; // metros
  const varEst = Math.ceil((longEst * nEstTotal * 1.05) / aEst.varilla_m);
  const kgEst = varEst * aEst.varilla_m * aEst.kg_ml;

  const kgTotal = kgSup + kgInf + kgEst;
  const alambre = Math.max(kgTotal * 0.03, 1.0);

  // Encofrado: fondo + 2 laterales
  const encofrado = ((p.b + 2 * p.h) / 100) * p.luz * p.cant;
  const clavos = encofrado * 0.8;

  if (AcProvCm2 < AcMinCm2) {
    avisos.push({ n: 'bad', t: `Acero inferior provisto ${AcProvCm2.toFixed(2)} cm² < ${AcMinCm2.toFixed(2)} cm² (mínimo RNE E.060). Aumentar varillas/diámetro.` });
  } else {
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
    `   • Volumen: ${p.cant} viga(s) × (${p.b}×${p.h} cm) × ${p.luz} m = ${volViga.toFixed(3)} m³.`,
    `   • Cemento: ${volViga.toFixed(3)} m³ × ${dos.bolsas} bol/m³ × 1.05 = ${cemVigas.toFixed(1)} bolsas.`,
    `   • Arena gruesa: ${volViga.toFixed(3)} m³ × ${dos.arena} × 1.05 (desp.) = ${arenaVigas.toFixed(2)} m³.`,
    `   • Piedra chancada 1/2": ${volViga.toFixed(3)} m³ × ${dos.piedra} × 1.05 (desp.) = ${piedraVigas.toFixed(2)} m³.`,
    `2. FIERRO SUPERIOR E INFERIOR (Varillas de 9 m):`,
    `   • Acero mínimo inferior RNE E.060 = ${AcMinCm2.toFixed(2)} cm² | Provisto = ${AcProvCm2.toFixed(2)} cm².`,
    `   • Superior (${p.nSup} varillas Ø ${p.dSup}"): Teórico ${varSup} var. (${kgSup.toFixed(1)} kg) → Comprar ${varSupC} var. (+5% traslape/empalme).`,
    `   • Inferior (${p.nInf} varillas Ø ${p.dInf}"): Teórico ${varInf} var. (${kgInf.toFixed(1)} kg) → Comprar ${varInfC} var. (+5% traslape/empalme).`,
    `3. ESTRIBOS (Ø ${p.dEst}"):`,
    `   • Dimensión: ${anchoEst}×${altoEst} cm + 15 cm ganchos 135° (orientativo) → ${longEst.toFixed(2)} m por estribo.`,
    `   • Total estribos: ${nEstTotal} und → Teórico ${varEst} var. (${kgEst.toFixed(1)} kg) → Comprar ${varEstC} var. (+5% traslape/empalme).`,
    `4. ALAMBRE, CLAVOS Y ENCOFRADO:`,
    `   • Alambre N° 16: ${alambre.toFixed(1)} kg.`,
    `   • Clavos 2 1/2": ~${clavos.toFixed(1)} kg.`,
    `   • Encofrado (fondo + 2 costados): ${encofrado.toFixed(1)} m².`,
    `   • Nota: Cálculos orientativos. Validar con plano estructural aprobado.`,
  ];

  const alambreV = Math.max(kgTotal * 0.03, 1.0);
  const clavosV = encofrado * 0.8;
  void alambreV; void clavosV;

  return {
    titulo: 'Vigas',
    detalle: `${p.cant} viga(s) de ${p.b}×${p.h} cm, luz libre ${p.luz} m`,
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
      { id: aSup.id_cat,       cant: kgSupC,     comprar: varSupC, nota: `${p.nSup} var. superior Ø ${p.dSup}" +5% traslape`, desglose: `${p.cant} vigas × ${p.nSup} var. × ${(p.luz + 0.5).toFixed(1)}m (+5% desp/traslape) ÷ 9m` },
      { id: aInf.id_cat,       cant: kgInfC,     comprar: varInfC, nota: `${p.nInf} var. inferior Ø ${p.dInf}" +5% traslape`, desglose: `${p.cant} vigas × ${p.nInf} var. × ${(p.luz + 0.5).toFixed(1)}m (+5% desp/traslape) ÷ 9m` },
      { id: aEst.id_cat,       cant: kgEstC,     comprar: varEstC, nota: `Estribos Ø ${p.dEst}" +5% traslape`,                desglose: `${nEstTotal} estribos × ${longEst.toFixed(2)}m desarrollo ÷ 9m` },
      { id: 'alambre_8',       cant: alambre,    comprar: ceil1(alambre), nota: 'Alambre N°16 de amarre',        desglose: `3% del fierro total (${kgTotal.toFixed(0)} kg)` },
      { id: 'clavos_encofrado', cant: clavos,   comprar: ceil1(clavos),   nota: 'Clavos 2 1/2"',                desglose: `${encofrado.toFixed(1)} m² encofrado × 0.8 kg/m²` },
      { id: 'madera_encofrado', cant: encofrado, comprar: ceil1(encofrado),                                      desglose: `${p.cant} vigas × ${((p.b + 2 * p.h) / 100).toFixed(2)}m perím. × ${p.luz}m` },
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

  // Espesor reglamentario según la luz mayor (RNE E.060: h ≈ Luz / 25)
  const luzMayor = Math.max(p.largo, p.ancho);
  let esp = p.espesor === 'auto' ? 0 : Number(p.espesor);
  if (p.espesor === 'auto') {
    for (const fila of TABLAS.espesorLosa.auto) {
      if (luzMayor <= fila.luz_max) { esp = fila.esp; break; }
    }
    if (esp === 0) {
      avisos.push({ n: 'bad', t: `Luz libre de ${luzMayor.toFixed(1)} m: supera la recomendación habitual de 7.5 m para losa aligerada unidireccional. Requiere losa nervada en dos sentidos o viga intermedia.` });
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

  // Viguetas: ancho / 0.40 m (espaciadas cada 40 cm entre ejes)
  const nViguetas = Math.ceil(p.ancho / 0.40);

  // Acero de viguetas
  const aInf = aceroData(p.dInf);
  const aBast = aceroData(p.dBast);

  const longInf = (p.largo + 0.30) * nViguetas * p.nInf;
  const longBast = (p.largo * 0.30 + 0.30) * nViguetas * 2 * p.nBast; // bastones en ambos extremos (L/3)
  const varInf = Math.ceil((longInf * 1.05) / aInf.varilla_m);
  const varBast = Math.ceil((longBast * 1.05) / aBast.varilla_m);
  const kgInf = varInf * aInf.varilla_m * aInf.kg_ml;
  const kgBast = varBast * aBast.varilla_m * aBast.kg_ml;
  const kgTotal = kgInf + kgBast;
  const alambre = Math.max(kgTotal * 0.03, 1.0);

  const encofrado = area * 1.05;
  const clavos = encofrado * 0.8;

  const pasos = [
    `1. DIMENSIONES DEL TECHO:`,
    `   Área total: ${p.largo} m × ${p.ancho} m = ${area.toFixed(2)} m².`,
    `   Luz libre mayor: ${luzMayor.toFixed(2)} m → Espesor de losa: ${esp} cm (Ladrillo de ${esp - 5} cm + 5 cm losa superior).`,
    `2. LADRILLOS DE TECHO 30×30 cm (Hueco):`,
    `   • Factor: 8.33 ladrillos/m² × 1.05 (desp. 5%) = 8.75 und/m².`,
    `   • Total a comprar: ${area.toFixed(2)} m² × 8.75 = ${comprarEntero(ladTecho)} ladrillos de techo.`,
    `3. CONCRETO ESTRUCTURAL (f'c ${p.fc} kg/cm² - Capeco):`,
    `   • Factor concreto: ${volM3xM2.toFixed(4)} m³/m² para espesor ${esp} cm.`,
    `   • Volumen total: ${area.toFixed(2)} m² × ${volM3xM2} × 1.05 = ${volConcreto.toFixed(3)} m³.`,
    `   • Cemento Portland: ${volConcreto.toFixed(3)} m³ × ${dos.bolsas} bol/m³ = ${cemLosa.toFixed(1)} bolsas → Comprar ${comprarEntero(cemLosa)} bolsas.`,
    `   • Arena gruesa: ${volConcreto.toFixed(3)} m³ × ${dos.arena} = ${ceil1(arenaLosa)} m³.`,
    `   • Piedra chancada 1/2": ${volConcreto.toFixed(3)} m³ × ${dos.piedra} = ${ceil1(piedraLosa)} m³.`,
    `4. ACERO PARA VIGUETAS (Cada 40 cm = ${nViguetas} viguetas):`,
    `   • Fierro inferior corrido (${p.nInf} varilla(s) Ø ${p.dInf}"): Comprar ${varInf} varillas de 9 m (${kgInf.toFixed(1)} kg).`,
    `   • Bastones negativos (${p.nBast} varilla(s) Ø ${p.dBast}"): Comprar ${varBast} varillas de 9 m (${kgBast.toFixed(1)} kg).`,
    `   • Fierro total: ${kgTotal.toFixed(1)} kg.`,
    `5. ENCOFRADO DE TECHO:`,
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
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cemLosa,    comprar: comprarEntero(cemLosa), desglose: `${area.toFixed(1)} m² × ${volM3xM2.toFixed(4)} m³/m² × ${dos.bolsas} bol/m³` },
      { id: 'arena_gruesa',    cant: arenaLosa,  comprar: ceil1(arenaLosa),       desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedraLosa, comprar: ceil1(piedraLosa),     desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      { id: 'ladrillo_techo',  cant: ladTecho,   comprar: comprarEntero(ladTecho), desglose: `${area.toFixed(1)} m² × 8.33 und/m² (+5% rotura)` },
      { id: aInf.id_cat,       cant: kgInf,      comprar: varInf,  nota: `${p.nInf} varilla(s) Ø ${p.dInf}" inferior`, desglose: `${nViguetas} viguetas × ${p.nInf} var. × ${(p.largo + 0.3).toFixed(1)}m ÷ 9m` },
      { id: aBast.id_cat,      cant: kgBast,     comprar: varBast, nota: `Bastones Ø ${p.dBast}"`,                     desglose: `${nViguetas} viguetas × 2 extremos × ${p.nBast} bast. ÷ 9m` },
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

  // Contrapiso: concreto simple 1:8 + 25% piedra mediana (Capeco — misma dosificación
  // del sobrecimiento: es el hormigón que se vacía en el contrapiso)
  let cemContra = 0, arenaContra = 0, piedraContra = 0, volContra = 0;
  if (p.contra === 'si') {
    volContra = p.aPiso * (p.eContra / 100) * 1.05;
    const dosContra = TABLAS.cimientoCiclopeo['1:8+25%piedra'];
    cemContra  = volContra * dosContra.bolsas;
    arenaContra  = volContra * dosContra.hormigon;
    piedraContra = volContra * dosContra.piedra;
  }

  const arenaTotal = arenaTarr + arenaContra;

  // Cerámico con desperdicio por cortes
  const ceraCom = p.aPiso * (1 + p.perd / 100);

  // Pintura e Imprimante (galones comerciales)
  const galPint = p.aPint > 0 ? Math.ceil((p.aPint * p.manos) / p.rendP) : 0;
  const galImp  = p.aPint > 0 ? Math.ceil(p.aPint / (p.rendP * 1.5)) : 0;

  if (p.eTarr > 0 && p.eTarr < 1.0)
    avisos.push({ n: 'warn', t: 'Espesor de tarrajeo menor a 1.0 cm: puede fisurarse por falta de recubrimiento adecuado.' });
  if (p.eTarr > 2.5)
    avisos.push({ n: 'warn', t: 'Espesor de tarrajeo mayor a 2.5 cm: aplicar en dos capas para evitar desprendimientos.' });

  const cemTotal = cemTarr + cemContra;

  const pasos = [
    `1. TARRAJEO EN MUROS (Mortero 1:5 - Espesor ${p.eTarr} cm):`,
    `   • Volumen mortero: ${p.aTarr} m² × ${(p.eTarr / 100).toFixed(3)} m × 1.10 (desp. 10%) = ${volTarr.toFixed(3)} m³.`,
    `   • Cemento: ${volTarr.toFixed(3)} m³ × ${dosMort.bolsas} bol/m³ = ${cemTarr.toFixed(1)} bolsas.`,
    `   • Arena fina/lavada: ${volTarr.toFixed(3)} m³ × ${dosMort.arena} = ${arenaTarr.toFixed(2)} m³.`,
    p.contra === 'si'
      ? `2. CONTRAPISO (Espesor ${p.eContra} cm — concreto simple 1:8 + 25% piedra mediana, Capeco):\n   • Volumen: ${volContra.toFixed(3)} m³ | Cemento: ${cemContra.toFixed(1)} bolsas | Arena: ${arenaContra.toFixed(2)} m³ | Piedra mediana: ${piedraContra.toFixed(2)} m³.`
      : `2. CONTRAPISO: No solicitado.`,
    `3. PISO CERÁMICO:`,
    `   • Área: ${p.aPiso} m² × (1 + ${p.perd}% desperdicio de cortes) = ${ceraCom.toFixed(2)} m² a comprar.`,
    `4. PINTURA LÁTEX E IMPRIMANTE:`,
    `   • Pintura (${p.manos} manos a ${p.rendP} m²/gal): ${galPint} galón(es).`,
    `   • Imprimante base: ${galImp} galón(es).`,
    `5. QUÉ COMPRAR:`,
    `   • Cemento total: ${cemTotal.toFixed(1)} bolsas → Comprar ${comprarEntero(cemTotal)} bolsas.`,
    `   • Arena: ${arenaTotal.toFixed(2)} m³ → Comprar ${ceil1(arenaTotal)} m³.`,
    `   • Cerámico: Comprar ${Math.ceil(ceraCom)} m² en cajas.`,
    `   • Pintura: Comprar ${galPint} galones | Imprimante: ${galImp} galones.`,
  ];

  return {
    titulo: 'Acabados',
    detalle: `Tarrajeo ${p.aTarr} m² · Cerámico ${p.aPiso} m² · Pintura ${p.aPint} m²`,
    resumen: [
      { nombre: 'Cemento total', valor: comprarEntero(cemTotal), unidad: 'bolsas' },
      { nombre: 'Arena', valor: ceil1(arenaTotal), unidad: 'm³' },
      { nombre: 'Cerámico a comprar', valor: Math.ceil(ceraCom), unidad: 'm²' },
      { nombre: 'Pintura látex', valor: galPint, unidad: 'gal' },
      { nombre: 'Imprimante', valor: galImp, unidad: 'gal' },
    ],
    mats: [
      { id: 'cemento',       cant: cemTotal,    comprar: comprarEntero(cemTotal), desglose: p.contra === 'si' ? `Tarrajeo: ${cemTarr.toFixed(1)} bol + Contrapiso: ${cemContra.toFixed(1)} bol = ${cemTotal.toFixed(1)} bol` : `Tarrajeo 1:5: ${cemTarr.toFixed(1)} bolsas` },
      { id: 'arena_gruesa',  cant: arenaTotal,  comprar: ceil1(arenaTotal),       desglose: p.contra === 'si' ? `Tarrajeo: ${arenaTarr.toFixed(2)} m³ + Contrapiso: ${arenaContra.toFixed(2)} m³` : `${volTarr.toFixed(2)} m³ mortero 1:5 × ${dosMort.arena} m³/m³` },
      ...(p.contra === 'si' ? [{ id: 'piedra_mediana', cant: piedraContra, comprar: ceil1(piedraContra), nota: 'Para contrapiso', desglose: `${volContra.toFixed(2)} m³ contrapiso 1:8+25% PM (Capeco)` }] : []),
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
  const cargaKg = p.carga * 1000;
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
  const cargaKg = p.carga * 1000;
  const areaReqM2 = cargaKg / (pa * 10000);
  if (espesor < 0.4) avisos.push({ n: 'warn', t: 'Espesor < 0.40 m: usualmente se incrementa para zapatas aisladas en vivienda.' });

  const volConcreto = areaZap * espesor * p.cant;
  const dos = dosConcreto(p.fc);
  const cem = volConcreto * dos.bolsas * 1.05;
  const arena = volConcreto * dos.arena * 1.05;
  const piedra = volConcreto * dos.piedra * 1.05;

  const aVar = aceroData(p.dVar);
  const rec = 0.05;
  const longVar = B - 2 * rec;
  const numVarXM = Math.max(4, Math.ceil((B - 2 * rec) / 0.20));
  const numVarYM = numVarXM;
  const longTotalXM = numVarXM * longVar * p.cant;
  const longTotalYM = numVarYM * longVar * p.cant;
  const longTotal = longTotalXM + longTotalYM;
  const varillas = Math.ceil((longTotal * 1.05) / aVar.varilla_m);
  const kgFierro = varillas * aVar.varilla_m * aVar.kg_ml;

  const perimEnc = 4 * B * p.cant;
  const alturaEnc = espesor;
  const encofrado = perimEnc * alturaEnc;

  if (pa <= 1.0) avisos.push({ n: 'warn', t: `Presión admisible ${pa.toFixed(2)} kg/cm² (suelo blando). Verificar estudio de mecánica de suelos si es portante.` });
  avisos.push({ n: 'warn', t: 'Cálculo ORIENTATIVO para metrado/presupuesto. NO sustituye cálculo estructural, cimentación según estudio de suelos o plano aprobado (RNE E.050).' });

  const pasos = [
    `1. PRESIÓN ADMISIBLE DEL SUELO:`,
    `   • Tipo: ${p.suelo} | pa = ${pa.toFixed(2)} kg/cm².`,
    `   • Carga axial: ${p.carga} tn = ${cargaKg} kg.`,
    `   • Área requerida: ${cargaKg} kg ÷ (${pa} kg/cm² × 10000 cm²/m²) = ${areaReqM2.toFixed(3)} m².`,
    `2. DIMENSIONADO DE ZAPATA (cuadrada):`,
    `   • Lado adoptado B×H: ${B.toFixed(2)} m × ${H.toFixed(2)} m (área ${areaZap.toFixed(3)} m²).`,
    `   • Presión que transmite: ${cargaKg} ÷ ${areaZap.toFixed(3)} = ${(cargaKg / areaZap).toFixed(0)} kg/m² < ${pa*10000} kg/m².`,
    `   • Espesor h: ${espesor.toFixed(2)} m.`,
    `3. ARMADO INFERIOR (orientativo en ambas direcciones):`,
    `   • Varillas Ø ${p.dVar}" @~20 cm en X e Y (recubrimiento 5 cm).`,
    `   • Longitud efectiva: ${(B-rec*2).toFixed(2)} m | Cantidad aprox: ${numVarXM} + ${numVarYM} varillas por zapata.`,
    `   • Varillas a comprar (9 m c/u +5%): ${varillas} varillas Ø ${p.dVar}" (~${kgFierro.toFixed(1)} kg).`,
    `4. CONCRETO (f'c = ${p.fc} kg/cm²):`,
    `   • Volumen: ${p.cant} zap. × ${B.toFixed(2)}×${H.toFixed(2)}×${espesor.toFixed(2)} = ${volConcreto.toFixed(3)} m³.`,
    `   • Cemento: ${cem.toFixed(1)} bolsas | Arena: ${arena.toFixed(2)} m³ | Piedra: ${piedra.toFixed(2)} m³.`,
    `5. ENCOFRADO: ${encofrado.toFixed(1)} m² de madera.`,
  ];

  return {
    titulo: 'Zapata aislada',
    detalle: `${p.cant} zapata(s) ${B.toFixed(2)}×${H.toFixed(2)} m, h=${espesor.toFixed(2)} m, pa=${pa.toFixed(2)} kg/cm²`,
    resumen: [
      { nombre: 'Lado zapata', valor: B.toFixed(2), unidad: 'm' },
      { nombre: 'Espesor', valor: espesor.toFixed(2), unidad: 'm' },
      { nombre: 'Concreto f\'c ' + p.fc, valor: volConcreto.toFixed(3), unidad: 'm³' },
      { nombre: 'Cemento', valor: comprarEntero(cem), unidad: 'bolsas' },
      { nombre: 'Fierro (orient.)', valor: kgFierro.toFixed(1), unidad: 'kg' },
      { nombre: 'Encofrado', valor: encofrado.toFixed(1), unidad: 'm²' },
    ],
    mats: [
      { id: 'cemento',         cant: cem,      comprar: comprarEntero(cem),   desglose: `${volConcreto.toFixed(2)} m³ × ${dos.bolsas} bol/m³ (+5% desp.)` },
      { id: 'arena_gruesa',    cant: arena,    comprar: ceil1(arena),         desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.arena} m³/m³` },
      { id: 'piedra_chancada', cant: piedra,   comprar: ceil1(piedra),        desglose: `${volConcreto.toFixed(2)} m³ concreto × ${dos.piedra} m³/m³` },
      { id: aVar.id_cat,       cant: kgFierro, comprar: varillas, nota: `Malla inferior Ø ${p.dVar}" X/Y`, desglose: `${numVarXM + numVarYM} var/zapata × ${(B-rec*2).toFixed(2)}m × ${p.cant} zap. ÷ 9m` },
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

  // Geometría: número de escalones por ergonomía (contrahuella ≈ 18 cm)
  const n = Math.max(3, Math.round((p.altura * 100) / 18));
  const ch = (p.altura * 100) / n;              // contrahuella exacta (cm)
  const hu = p.huella === 'auto' ? 27 : Number(p.huella); // huella (cm)
  const desH = (n * hu) / 100;                  // desarrollo horizontal (m)
  const L = Math.hypot(p.altura, desH);         // longitud de la lanza (m)
  const pend = (Math.atan2(p.altura, desH) * 180) / Math.PI; // pendiente (°)
  const blondel = 2 * ch + hu;                   // fórmula de Blondel (cm)

  if (pend >= 30 && pend <= 38)
    avisos.push({ n: 'ok', t: `Pendiente ${pend.toFixed(1)}°: dentro del rango cómodo de 30° a 38°.` });
  else
    avisos.push({ n: 'warn', t: `Pendiente ${pend.toFixed(1)}°: lo cómodo para vivienda es 30° a 38°. Ajusta la altura o el ancho del tramo.` });

  if (blondel >= 60 && blondel <= 65)
    avisos.push({ n: 'ok', t: `Ergonomía: 2×${ch.toFixed(1)} + ${hu} = ${blondel.toFixed(1)} cm — fórmula de Blondel cumplida (60 a 65 cm).` });
  else
    avisos.push({ n: 'warn', t: `Ergonomía: 2×${ch.toFixed(1)} + ${hu} = ${blondel.toFixed(1)} cm — Blondel aconseja 60 a 65 cm; así se sube y baja incómodo.` });

  if (ch > 19.5)
    avisos.push({ n: 'warn', t: `Contrahuella ${ch.toFixed(1)} cm: es alta para vivienda; reparte la altura en un escalón más.` });
  if (ch < 15)
    avisos.push({ n: 'warn', t: `Contrahuella ${ch.toFixed(1)} cm: muy baja; la escalera queda larga y pesada.` });
  if (p.ancho < 0.8)
    avisos.push({ n: 'warn', t: `Ancho ${p.ancho} m: en vivienda el tramo debe tener mínimo 0.80 m de ancho libre (NTE E.020).` });
  if (p.altura > 3.5)
    avisos.push({ n: 'warn', t: `Altura ${p.altura} m en un solo tramo: es mucha; lo usual es dividir en dos tramos con meseta intermedia.` });
  avisos.push({ n: 'ok', t: 'El fierro es orientativo: el armado real de la escalera lo define el plano estructural (RNE E.060).' });

  // Concreto: cuerpo escalonado (promedio sobre la lanza) + lanza inclinada
  const eLanza = 0.25;                              // m — espesor usual de la lanza
  const aPasos = (n * (hu / 100) * (ch / 100)) / 2; // m² (mitad sobre la línea de la lanza)
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
  const longL = varLong * L * (1 + despL);              // m a lo largo de la lanza
  const varillasL = Math.ceil(longL / aL.varilla_m);
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
    `1. GEOMETRÍA (${n} escalones):`,
    `   • Contrahuella: ${p.altura} m ÷ ${n} = ${ch.toFixed(1)} cm · Huella: ${hu} cm.`,
    `   • Desarrollo horizontal: ${n} × ${hu} cm = ${desH.toFixed(2)} m · Pendiente: ${pend.toFixed(1)}°.`,
    `   • Ergonomía Blondel: 2 × ${ch.toFixed(1)} + ${hu} = ${blondel.toFixed(1)} cm (ideal 60 a 65).`,
    `2. CONCRETO ESTRUCTURAL (f'c = ${p.fc} kg/cm²):`,
    `   • Cuerpo escalonado: ${n} × (${hu} × ${ch.toFixed(1)} cm) ÷ 2 = ${aPasos.toFixed(2)} m².`,
    `   • Lanza inclinada (25 cm): ${L.toFixed(2)} m × 0.25 m = ${aLanza.toFixed(2)} m².`,
    `   • Volumen: (${aPasos.toFixed(2)} + ${aLanza.toFixed(2)}) m² × ${p.ancho} m × 1.05 = ${volTotal.toFixed(3)} m³.`,
    `   • Cemento: ${volTotal.toFixed(3)} m³ × ${dos.bolsas} bol/m³ = ${cemEsc.toFixed(1)} bolsas.`,
    `3. FIERRO ORIENTATIVO (confirmar con plano estructural):`,
    `   • Longitudinales lanza: ${varLong} varillas Ø 1/2" × ${L.toFixed(2)} m (+${(despL * 100).toFixed(0)}%) → ${varillasL} varillas de 9 m (${kgL.toFixed(1)} kg).`,
    `   • Transversales y amarre: ${nTrans} barras transversales + ${nEst} estribos @25 cm Ø 3/8" → ${varillasE} varillas de 9 m (${kgE.toFixed(1)} kg).`,
    `4. ALAMBRE, CLAVOS Y ENCOFRADO:`,
    `   • Alambre N° 16 (3% del fierro): ${alambre.toFixed(1)} kg.`,
    `   • Clavos para encofrado 2 1/2": ~${clavosEsc.toFixed(1)} kg.`,
    `   • Encofrado: ${encofrado.toFixed(1)} m² (2 laterales + sofito + ${n} contrahuellas).`,
  ];

  return {
    titulo: 'Escalera',
    detalle: `Escalera recta de ${n} escalones, ${p.ancho} m de ancho, ${p.altura} m de altura`,
    resumen: [
      { nombre: 'Escalones', valor: n, unidad: 'und' },
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
      { id: aL.id_cat,         cant: kgL,       comprar: varillasL, nota: `${varLong} varillas Ø 1/2" longitudinales`, desglose: `${varLong} × ${L.toFixed(2)} m lanza (+${(despL * 100).toFixed(0)}% corte) ÷ ${aL.varilla_m}m` },
      { id: aE.id_cat,         cant: kgE,       comprar: varillasE, nota: 'Transversales y amarre Ø 3/8"',       desglose: `${nTrans} transversales + ${nEst} estribos @25 cm (+${(despE * 100).toFixed(0)}%) ÷ ${aE.varilla_m}m` },
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
      default:          return { error: `Calculadora desconocida: ${id}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error inesperado en el cálculo.' };
  }
}
