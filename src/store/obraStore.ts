import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import CATALOGO_JSON from '../engine/catalogo.json';
import type { Catalogo, ResultadoCalculo } from '../engine/types';

export type { CatItem, Catalogo } from '../engine/types';

export const CATALOGO: Catalogo = CATALOGO_JSON as Catalogo;

export interface EtapaGuardada {
  id: string;         // 'cimientos' | 'muros' | ...
  titulo: string;
  detalle: string;
  resultado: ResultadoCalculo;
  timestamp: number;
}

export interface PreciosUsuario {
  [matId: string]: number;
}

interface ObraState {
  etapas: EtapaGuardada[];
  precios: PreciosUsuario;
  agregarEtapa: (e: EtapaGuardada) => void;
  quitarEtapa: (idx: number) => void;
  setPrecio: (id: string, precio: number) => void;
  quitarPrecio: (id: string) => void;
  limpiarPrecios: () => void;
  limpiarObra: () => void;
}

export const useObraStore = create<ObraState>()(
  persist(
    (set) => ({
      etapas: [],
      precios: {},
      agregarEtapa: (e) => set((s) => {
    // Permitir guardar la misma calculadora varias veces con medidas distintas (pisos diferentes)
    // Solo evitamos el caso extremo de doble clic que genere exactamente la misma entrada
    if (s.etapas.length > 0) {
      const ultimo = s.etapas[s.etapas.length - 1];
      if (ultimo.id === e.id && ultimo.titulo === e.titulo && ultimo.detalle === e.detalle && ultimo.timestamp === e.timestamp) {
        return s;
      }
    }
    return { etapas: [...s.etapas, e] };
  }),
      quitarEtapa: (idx) => set((s) => ({ etapas: s.etapas.filter((_, i) => i !== idx) })),
      setPrecio: (id, precio) => set((s) => ({ precios: { ...s.precios, [id]: precio } })),
      quitarPrecio: (id) => set((s) => {
        const nuevo = { ...s.precios };
        delete nuevo[id];
        return { precios: nuevo };
      }),
      limpiarPrecios: () => set({ precios: {} }),
      limpiarObra: () => set({ etapas: [] }),
    }),
    { name: 'obra-exacta-v1' }
  )
);

// ─── Totalizar Mi obra (suma antes de redondear) ───────────────────────────────
export function totalizarObra(etapas: EtapaGuardada[], precios: PreciosUsuario) {
  const acum: Record<string, {
    cant: number;
    comprar: number;
    partes: Array<{ etapa: string; cant: number }>;
  }> = {};

  for (const etapa of etapas) {
    for (const mat of etapa.resultado.mats) {
      if (!acum[mat.id]) acum[mat.id] = { cant: 0, comprar: 0, partes: [] };
      acum[mat.id].cant += mat.cant;
      acum[mat.id].partes.push({
        etapa: etapa.titulo,
        cant: mat.cant,
      });
    }
  }

  // Redondear después de sumar (regla de oro de obra: sumar antes de redondear)
  for (const id in acum) {
    const cat = CATALOGO[id];
    if (!cat) continue;
    // Si la unidad es m³ redondeamos a 1 decimal para fletes/camión, si es bolsa/varilla/und al entero superior
    if (cat.unidad.includes('m³') || cat.unidad.includes('m²')) {
      acum[id].comprar = Math.ceil(acum[id].cant * 10) / 10;
    } else {
      acum[id].comprar = Math.ceil(acum[id].cant);
    }
  }

  let totalSoles = 0;
  const lineas = Object.entries(acum)
    .filter(([, v]) => v.cant > 0)
    .map(([id, v]) => {
      const cat = CATALOGO[id];
      const precio = precios[id] ?? cat?.precio ?? 0;
      const subtotal = v.comprar * precio;
      totalSoles += subtotal;

      // Desglose de origen consolidado
      let desglose = '';
      if (v.partes.length > 1) {
        const sumandos = v.partes.map(p => {
          const valStr = p.cant < 10 ? p.cant.toFixed(1) : Math.round(p.cant).toString();
          return `${p.etapa} (${valStr})`;
        }).join(' + ');
        desglose = `${sumandos} = ${v.cant < 10 ? v.cant.toFixed(2) : v.cant.toFixed(1)} ${cat?.unidad ?? ''}`;
      } else if (v.partes.length === 1) {
        desglose = `${v.partes[0].etapa}: ${v.cant < 10 ? v.cant.toFixed(2) : v.cant.toFixed(1)} ${cat?.unidad ?? ''}`;
      }

      return {
        id,
        nombre: cat?.nombre ?? id,
        unidad: cat?.unidad ?? '',
        cantidad: v.comprar,
        cantCalculada: v.cant,
        desglose,
        precio,
        subtotal,
        grupo: cat?.grupo ?? 'Otros',
      };
    });

  return { lineas, totalSoles };
}
