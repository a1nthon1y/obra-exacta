import { describe, expect, it } from 'vitest';
import { totalizarObra } from './totalizar';
import type { EtapaParaTotalizar } from './totalizar';
import { calcColumnas } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';

function columnasResultado(): ResultadoCalculo {
  const r = calcColumnas({
    b: 25, h: 25, alto: 2.6, cant: 4, nVar: 4, dVar: '5/8', dEst: '1/4',
    rec: 4, fc: 210, sis: 'confinada',
  });
  if ('error' in r) throw new Error(r.error);
  return r;
}

function etapa(titulo: string, resultado: ResultadoCalculo, piso?: number): EtapaParaTotalizar {
  return { titulo, resultado, piso };
}

describe('totalizarObra con acero', () => {
  it('cotiza las varillas, no los kilos', () => {
    const { lineas, totalSoles } = totalizarObra([etapa('Columnas', columnasResultado(), 1)], {});

    const acero = lineas.find(l => l.id === 'fierro_5_8');
    expect(acero).toBeDefined();
    expect(acero!.unidad).toBe('varilla 9 m');
    expect(acero!.cantidad).toBe(7);
    // 7 varillas × S/ 67 del catálogo, no 88 kg × S/ 67
    expect(acero!.subtotal).toBe(469);
    expect(totalSoles).toBeGreaterThanOrEqual(469);
    expect(totalSoles).toBeLessThan(2000);
  });

  it('suma antes de redondear: dos partidas iguales compran 13, no 14', () => {
    const r = columnasResultado();
    const { lineas } = totalizarObra([etapa('Columnas', r, 1), etapa('Columnas', r, 2)], {});
    const acero = lineas.find(l => l.id === 'fierro_5_8');
    expect(acero!.cantidad).toBe(13);
  });

  it('usa la cantidad comercial en partidas guardadas con el acero en kg', () => {
    const legado: ResultadoCalculo = {
      titulo: 'Columnas',
      detalle: 'partida antigua',
      resumen: [],
      avisos: [],
      pasos: [],
      // Formato anterior: `cant` en kg (88) y `comprar` en varillas (7)
      mats: [{ id: 'fierro_5_8', cant: 88, comprar: 7 }],
    };
    const { lineas, totalSoles } = totalizarObra([etapa('Columnas', legado)], {});
    const acero = lineas.find(l => l.id === 'fierro_5_8');
    expect(acero!.cantidad).toBe(7);
    expect(acero!.subtotal).toBe(469);
    expect(totalSoles).toBe(469);
  });
});

describe('totalizarObra con áridos', () => {
  it('redondea m³ a un decimal después de sumar', () => {
    const base: ResultadoCalculo = {
      titulo: 'Losa',
      detalle: '',
      resumen: [],
      avisos: [],
      pasos: [],
      mats: [{ id: 'arena_gruesa', cant: 1.02, comprar: 1.1 }],
    };
    const { lineas } = totalizarObra([etapa('Losa', base), etapa('Losa', base)], {});
    const arena = lineas.find(l => l.id === 'arena_gruesa');
    expect(arena!.cantidad).toBe(2.1);
  });
});
