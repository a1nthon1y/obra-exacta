import { describe, expect, it } from 'vitest';
import { calcular } from './calc';
import type { ParamsCalculo, ResultadoCalculo } from './types';
import { CATALOGO } from '../store/catalogo';

/**
 * Un material siempre se guarda en la unidad del catálogo:
 * `cant` exacto (con decimales) y `comprar` redondeado a lo que se vende.
 * Estos tests protegen esa regla; el bug histórico fue guardar el acero en kg
 * mientras el catálogo lo vende por varilla de 9 m.
 */

function resultado(id: string, params: ParamsCalculo): ResultadoCalculo {
  const r = calcular(id, params);
  if ('error' in r) throw new Error(`${id}: ${r.error}`);
  return r;
}

const CASOS: Array<{ id: string; params: ParamsCalculo }> = [
  {
    id: 'cimientos',
    params: { largo: 10, ancho: 0.5, prof: 0.8, esp: 0.15, alto: 0.4 },
  },
  {
    id: 'muros',
    params: {
      largo: 6, alto: 2.5, aberturas: 2, aparejo: 'soga', ladrillo: 'kk18',
      lb: 24, ab: 13, hb: 9, junta: 1.5, desL: 5, desM: 10, mezcla: 5, uso: 'portante',
    },
  },
  {
    id: 'columnas',
    params: {
      b: 25, h: 25, alto: 2.6, cant: 4, nVar: 4, dVar: '5/8', dEst: '1/4',
      rec: 4, fc: 210, sis: 'confinada',
    },
  },
  {
    id: 'vigas',
    params: {
      b: 25, h: 30, luz: 4.5, cant: 3, nSup: 2, dSup: '1/2', nInf: 3, dInf: '5/8',
      dEst: '3/8', rec: 4, fc: 210,
    },
  },
  {
    id: 'losa',
    params: { largo: 5, ancho: 4, espesor: 'auto', fc: 210, nInf: 2, dInf: '1/2', nBast: 2, dBast: '3/8' },
  },
  {
    id: 'acabados',
    params: {
      aTarr: 40, eTarr: 1.5, aPint: 40, manos: 2, rendP: 8,
      aPiso: 30, perd: 10, contra: 'si', eContra: 5,
    },
  },
  { id: 'escalera', params: { altura: 2.8, ancho: 1.0, huella: 'auto', fc: 210 } },
  {
    id: 'zapata',
    params: {
      tipo: 'aislada', bCol: 30, hCol: 30, carga: 15, suelo: 'intermedio', pa: 1.2,
      espesor: 40, dVar: '1/2', fc: 210, cant: 4,
    },
  },
];

describe('unidad de compra de los materiales', () => {
  it('todos los materiales existen en el catálogo y nunca se compra menos de lo calculado', () => {
    for (const { id, params } of CASOS) {
      const r = resultado(id, params);
      for (const m of r.mats) {
        expect(CATALOGO[m.id], `${id}: ${m.id} no está en el catálogo`).toBeDefined();
        expect(m.comprar, `${id}: ${m.id} comprar < cant`).toBeGreaterThanOrEqual(m.cant - 1e-9);
      }
    }
  });

  it('el acero se guarda en varillas de 9 m, no en kilos', () => {
    for (const { id, params } of CASOS) {
      const r = resultado(id, params);
      for (const m of r.mats) {
        const cat = CATALOGO[m.id];
        if (!cat?.unidad.includes('varilla')) continue;
        // 1 kg de acero no puede confundirse con 1 varilla: la cantidad debe
        // moverse en el mismo orden que lo que se compra.
        expect(m.cant, `${id}: ${m.id} parece estar en kg`).toBeLessThan(m.comprar * 1.5 + 1);
      }
    }
  });

  it('columnas 25×25 con 4Ø5/8" compran 7 varillas y no 88', () => {
    const r = resultado('columnas', CASOS[2].params);
    const acero = r.mats.find(m => m.id === 'fierro_5_8');
    expect(acero).toBeDefined();
    expect(acero!.comprar).toBe(7);
    expect(acero!.cant).toBeGreaterThan(6);
    expect(acero!.cant).toBeLessThan(7);
  });
});

describe('citas y avisos normativos', () => {
  it('la pandereta en muro portante se bloquea sin citar una cláusula inexistente', () => {
    const r = resultado('muros', {
      largo: 6, alto: 2.5, aberturas: 2, aparejo: 'soga', ladrillo: 'pand',
      lb: 24, ab: 12, hb: 9, junta: 1.5, desL: 5, desM: 10, mezcla: 5, uso: 'portante',
    });
    const aviso = r.avisos.find(a => a.n === 'bad' && /pandereta/i.test(a.t));
    expect(aviso).toBeDefined();
    expect(aviso!.t).not.toMatch(/cláusula\s*5\.3/i);
  });

  it('el ancho de cimiento no se atribuye a E.050 ni a SENCICO', () => {
    const r = resultado('cimientos', { largo: 10, ancho: 0.4, prof: 0.8, esp: 0.15, alto: 0.4 });
    const aviso = r.avisos.find(a => /Ancho de cimiento/i.test(a.t));
    expect(aviso).toBeDefined();
    expect(aviso!.t).not.toMatch(/E\.050\s*\/\s*Sencico/i);
    expect(aviso!.t).toMatch(/regla de obra/i);
  });
});

describe('albañilería confinada vs pórticos', () => {
  it('la columna de confinamiento 13×25 con 4Ø3/8" no se marca por cuantía', () => {
    const r = resultado('columnas', {
      b: 13, h: 25, alto: 2.5, cant: 4, nVar: 4, dVar: '3/8', dEst: '1/4',
      rec: 4, fc: 210, sis: 'confinada',
    });
    expect(r.avisos.some(a => a.n === 'bad' && /cuantía/i.test(a.t))).toBe(false);
    expect(r.avisos.some(a => a.n === 'ok' && /E\.070/.test(a.t))).toBe(true);
    expect(r.pasos.join('\n')).toMatch(/4 varillas de 3\/8" \(E\.070\)/);
  });

  it('la columna de confinamiento más angosta que el muro se rechaza', () => {
    const r = resultado('columnas', {
      b: 12, h: 25, alto: 2.5, cant: 4, nVar: 4, dVar: '3/8', dEst: '1/4',
      rec: 4, fc: 210, sis: 'confinada',
    });
    expect(r.avisos.some(a => a.n === 'bad' && /espesor del muro/i.test(a.t))).toBe(true);
  });

  it('la columna de pórtico de 20×20 se rechaza por dimensión mínima', () => {
    const r = resultado('columnas', {
      b: 20, h: 20, alto: 2.5, cant: 4, nVar: 4, dVar: '5/8', dEst: '1/4',
      rec: 4, fc: 210, sis: 'porticos',
    });
    expect(r.avisos.some(a => a.n === 'bad' && /25 cm/.test(a.t))).toBe(true);
  });

  it("f'c 140 es error en pórticos y solo advertencia en confinada", () => {
    const portico = resultado('columnas', {
      b: 25, h: 25, alto: 2.5, cant: 4, nVar: 4, dVar: '5/8', dEst: '1/4',
      rec: 4, fc: 140, sis: 'porticos',
    });
    expect(portico.avisos.some(a => a.n === 'bad' && /210 kg\/cm²/.test(a.t))).toBe(true);

    const confinada = resultado('columnas', {
      b: 13, h: 25, alto: 2.5, cant: 4, nVar: 4, dVar: '3/8', dEst: '1/4',
      rec: 4, fc: 140, sis: 'confinada',
    });
    expect(confinada.avisos.some(a => a.n === 'bad')).toBe(false);
    expect(confinada.avisos.some(a => a.n === 'warn' && /175 kg\/cm²/.test(a.t))).toBe(true);
  });
});

describe('losa aligerada', () => {
  it('dimensiona el espesor con la luz de la vigueta, no con la dimensión mayor', () => {
    // Vigueta de 8 m: excede la recomendación de 7.5 m.
    const larga = resultado('losa', {
      largo: 8, ancho: 3.5, espesor: 'auto', fc: 210, nInf: 2, dInf: '1/2', nBast: 2, dBast: '3/8',
    });
    expect(larga.avisos.some(a => a.n === 'bad' && /vigueta/i.test(a.t))).toBe(true);

    // El mismo paño girado: la vigueta mide 3.5 m y no hay problema.
    const corta = resultado('losa', {
      largo: 3.5, ancho: 8, espesor: 'auto', fc: 210, nInf: 2, dInf: '1/2', nBast: 2, dBast: '3/8',
    });
    expect(corta.avisos.some(a => a.n === 'bad' && /vigueta/i.test(a.t))).toBe(false);
  });

  it('incluye la malla de temperatura Ø 1/4" en la losa superior', () => {
    const r = resultado('losa', CASOS[4].params);
    const malla = r.mats.find(m => m.id === 'fierro_6mm');
    expect(malla).toBeDefined();
    expect(malla!.comprar).toBeGreaterThan(0);
    expect(r.pasos.join('\n')).toMatch(/malla de temperatura/i);
  });
});

describe('zapata y f\'c mínimo', () => {
  it('usa recubrimiento de 7.5 cm porque el concreto va contra el suelo', () => {
    const r = resultado('zapata', CASOS[7].params);
    expect(r.pasos.join('\n')).toMatch(/recubrimiento 7\.5 cm/i);
    const acero = r.mats.find(m => m.id === 'fierro_1_2');
    // B = 1.15 m → longitud de varilla 1.15 − 2×0.075 = 1.00 m
    expect(acero!.desglose).toContain('1.00m');
  });

  it("avisa f'c bajo en vigas, losa, escalera y zapata", () => {
    const viga = resultado('vigas', {
      b: 25, h: 30, luz: 4.5, cant: 3, nSup: 2, dSup: '1/2', nInf: 3, dInf: '5/8',
      dEst: '3/8', rec: 4, fc: 175,
    });
    expect(viga.avisos.some(a => /210 kg\/cm²/.test(a.t))).toBe(true);

    const losa = resultado('losa', {
      largo: 4, ancho: 3.5, espesor: 'auto', fc: 175, nInf: 2, dInf: '1/2', nBast: 2, dBast: '3/8',
    });
    expect(losa.avisos.some(a => /210 kg\/cm²/.test(a.t))).toBe(true);

    const escalera = resultado('escalera', { altura: 2.8, ancho: 1.0, huella: 'auto', fc: 175 });
    expect(escalera.avisos.some(a => /210 kg\/cm²/.test(a.t))).toBe(true);

    const zapata = resultado('zapata', {
      tipo: 'aislada', bCol: 30, hCol: 30, carga: 15, suelo: 'intermedio', pa: 1.2,
      espesor: 40, dVar: '1/2', fc: 140, cant: 4,
    });
    expect(zapata.avisos.some(a => /175 kg\/cm²/.test(a.t))).toBe(true);
  });
});
