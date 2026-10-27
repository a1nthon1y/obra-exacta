import { describe, expect, it } from 'vitest';
import { sugerirColumna } from './sugerir';

describe('predimensionado de columnas', () => {
  it('en confinada la columna va del ancho del muro (13 cm)', () => {
    const s = sugerirColumna({ pisos: 1, sis: 'confinada', luz: 4 });
    expect(s.b).toBe(13);
    expect(s.h).toBe(25);
    expect(s.nVar).toBeGreaterThanOrEqual(4);
    expect(s.requiereIngeniero).toBe(false);
    expect(s.explicacion).toMatch(/13 × 25/);
  });

  it('2 pisos con luz de 4.5 m pide 13 × 30', () => {
    const s = sugerirColumna({ pisos: 2, sis: 'confinada', luz: 4.5 });
    expect(s.b).toBe(13);
    expect(s.h).toBe(30);
  });

  it('en pórticos no sugiere medida: exige ingeniero', () => {
    const s = sugerirColumna({ pisos: 1, sis: 'porticos', luz: 4 });
    expect(s.requiereIngeniero).toBe(true);
  });

  it('no promete el 1% de E.060 para confinamiento', () => {
    const s = sugerirColumna({ pisos: 1, sis: 'confinada', luz: 4 });
    expect(s.supuestos.join(' ')).not.toMatch(/1%/);
    expect(s.supuestos.join(' ')).toMatch(/3\/8/);
  });
});
