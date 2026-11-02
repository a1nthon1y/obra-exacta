import { describe, expect, it } from 'vitest';
import { calcCimientos } from '../engine/calc';
import type { EtapaGuardada, ObraDatos } from './obraStore';
import {
  crearRespaldo,
  nombreArchivoRespaldo,
  parsearRespaldo,
  RESPALDO_SCHEMA,
  serializarRespaldo,
} from './respaldo';

function etapa(): EtapaGuardada {
  const resultado = calcCimientos({
    largo: 10, ancho: 0.5, prof: 0.8, esp: 0.15, alto: 0.4,
  });
  if ('error' in resultado) throw new Error(resultado.error);
  return {
    id: 'cimientos',
    titulo: 'Cimientos',
    detalle: '10 m de cimiento corrido',
    resultado,
    timestamp: 1_700_000_000_000,
  };
}

function datos(): ObraDatos {
  return {
    etapas: [etapa()],
    precios: { cemento: 25.5 },
    proyectos: [{ id: 'proy-1', nombre: 'Edificio de prueba', pisos: 3, creado: 1_700_000_000_000 }],
    proyectoActivoId: 'proy-1',
    pisoActivo: 2,
  };
}

describe('respaldo JSON de la obra', () => {
  it('hace round-trip de etapas, precios, proyectos y piso activo', () => {
    const parsed = parsearRespaldo(serializarRespaldo(datos()));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.etapas).toHaveLength(1);
    expect(parsed.data.etapas[0].titulo).toBe('Cimientos');
    expect(parsed.data.etapas[0].resultado.mats.length).toBeGreaterThan(0);
    expect(parsed.data.precios.cemento).toBe(25.5);
    expect(parsed.data.proyectos).toHaveLength(1);
    expect(parsed.data.proyectoActivoId).toBe('proy-1');
    expect(parsed.data.pisoActivo).toBe(2);
    expect(parsed.exportado).toBeTruthy();
  });

  it('incluye la marca y la versión del respaldo', () => {
    const respaldo = crearRespaldo(datos());
    expect(respaldo.app).toBe('obra-exacta');
    expect(respaldo.schema).toBe(RESPALDO_SCHEMA);
  });

  it('acepta una obra vacía (restaurar en un equipo nuevo)', () => {
    const vacia: ObraDatos = {
      etapas: [], precios: {}, proyectos: [], proyectoActivoId: null, pisoActivo: 1,
    };
    const parsed = parsearRespaldo(serializarRespaldo(vacia));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.etapas).toHaveLength(0);
    expect(parsed.data.proyectos).toHaveLength(0);
  });

  it('acepta un archivo con BOM (descargado o reenviado por WhatsApp)', () => {
    const parsed = parsearRespaldo('\uFEFF' + serializarRespaldo(datos()));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.etapas).toHaveLength(1);
  });

  it('rechaza JSON inválido, otra app y otra versión', () => {
    expect(parsearRespaldo('esto no es json')).toMatchObject({ ok: false });
    expect(parsearRespaldo(JSON.stringify({ app: 'otra', schema: 1 }))).toMatchObject({ ok: false });
    expect(parsearRespaldo(JSON.stringify({
      ...crearRespaldo(datos()),
      schema: RESPALDO_SCHEMA + 1,
    }))).toMatchObject({ ok: false });
  });

  it('rechaza una partida dañada y un precio que no es número', () => {
    const partidaRota: any = crearRespaldo(datos());
    partidaRota.etapas[0].resultado.mats = 'no es una lista';
    expect(parsearRespaldo(JSON.stringify(partidaRota))).toMatchObject({ ok: false });

    const precioRoto: any = crearRespaldo(datos());
    precioRoto.precios.cemento = '25';
    expect(parsearRespaldo(JSON.stringify(precioRoto))).toMatchObject({ ok: false });
  });

  it('normaliza un proyecto activo que ya no existe', () => {
    const raw: any = crearRespaldo(datos());
    raw.proyectoActivoId = 'proy-borrado';
    raw.pisoActivo = 4;
    const parsed = parsearRespaldo(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.proyectoActivoId).toBeNull();
    expect(parsed.data.pisoActivo).toBe(1);
  });

  it('rechaza proyectos con un número de pisos fuera del producto', () => {
    const raw: any = crearRespaldo(datos());
    raw.proyectos[0].pisos = 2;
    expect(parsearRespaldo(JSON.stringify(raw))).toMatchObject({ ok: false });
  });

  it('genera un nombre de archivo estable por fecha', () => {
    expect(nombreArchivoRespaldo(new Date(2026, 10, 2))).toBe('obra-exacta-2026-11-02.json');
  });
});
