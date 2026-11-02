import { describe, expect, it } from 'vitest';
import type { ResultadoCalculo } from '../engine/types';
import type { EtapaGuardada, ProyectoEdificio } from './obraStore';
import { copiarEtapaAPisos, moverEtapa } from './organizar';

const resultado: ResultadoCalculo = {
  titulo: 'Cimientos',
  detalle: '10 m',
  resumen: [],
  mats: [],
  avisos: [],
  pasos: [],
};

const proyecto: ProyectoEdificio = {
  id: 'proy-1',
  nombre: 'Edificio de prueba',
  pisos: 3,
  creado: 1,
};

function etapa(cambios: Partial<EtapaGuardada> = {}): EtapaGuardada {
  return {
    id: 'cimientos',
    titulo: 'Cimientos',
    detalle: '10 m de cimiento corrido',
    resultado,
    timestamp: 1,
    ...cambios,
  };
}

describe('mover partidas entre proyectos y pisos', () => {
  it('mueve a un proyecto y ajusta el piso al rango del proyecto', () => {
    const etapas = [etapa()];
    const movidas = moverEtapa(etapas, 0, { proyectoId: 'proy-1', piso: 9 }, [proyecto]);
    expect(movidas).toHaveLength(1);
    expect(movidas[0].proyectoId).toBe('proy-1');
    expect(movidas[0].proyectoNombre).toBe('Edificio de prueba');
    expect(movidas[0].piso).toBe(3);
    expect(etapas[0].proyectoId).toBeUndefined();
  });

  it('mueve a Casa / obra general y limpia la ubicación de edificio', () => {
    const etapas = [etapa({ proyectoId: 'proy-1', proyectoNombre: 'Edificio de prueba', piso: 2 })];
    const movidas = moverEtapa(etapas, 0, {}, [proyecto]);
    expect(movidas[0].proyectoId).toBeUndefined();
    expect(movidas[0].proyectoNombre).toBeUndefined();
    expect(movidas[0].piso).toBeUndefined();
  });

  it('no cambia nada si el índice o el proyecto no existen', () => {
    const etapas = [etapa()];
    expect(moverEtapa(etapas, 5, { proyectoId: 'proy-1' }, [proyecto])).toBe(etapas);
    expect(moverEtapa(etapas, 0, { proyectoId: 'proy-inexistente' }, [proyecto])).toBe(etapas);
  });
});

describe('copiar una partida a los pisos de un proyecto', () => {
  it('crea una copia por piso y conserva la partida original', () => {
    const etapas = [etapa()];
    const copiadas = copiarEtapaAPisos(etapas, 0, proyecto);
    expect(copiadas).toHaveLength(4); // original + 3 pisos
    expect(copiadas.slice(1).map(e => e.piso)).toEqual([1, 2, 3]);
    expect(copiadas.slice(1).every(e => e.proyectoId === 'proy-1')).toBe(true);
    expect(copiadas[0].proyectoId).toBeUndefined();
    expect(etapas).toHaveLength(1);
  });

  it('no duplica el piso donde ya está la partida', () => {
    const etapas = [etapa({ proyectoId: 'proy-1', proyectoNombre: 'Edificio de prueba', piso: 2 })];
    const copiadas = copiarEtapaAPisos(etapas, 0, proyecto);
    expect(copiadas).toHaveLength(3); // original (piso 2) + pisos 1 y 3
    expect(copiadas.map(e => e.piso).sort()).toEqual([1, 2, 3]);
  });

  it('acepta una lista de pisos, elimina duplicados y descarta los fuera de rango', () => {
    const etapas = [etapa()];
    const copiadas = copiarEtapaAPisos(etapas, 0, proyecto, [1, 1, 2, 9, 0]);
    expect(copiadas).toHaveLength(3); // original + pisos 1 y 2
    expect(copiadas.slice(1).map(e => e.piso)).toEqual([1, 2]);
  });

  it('no hace nada con un índice inexistente o sin pisos válidos', () => {
    const etapas = [etapa()];
    expect(copiarEtapaAPisos(etapas, 4, proyecto)).toBe(etapas);
    expect(copiarEtapaAPisos(etapas, 0, proyecto, [0, 9])).toBe(etapas);
  });
});
