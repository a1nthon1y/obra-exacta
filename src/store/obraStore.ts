import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResultadoCalculo } from '../engine/types';
import type { PreciosUsuario } from './totalizar';
import {
  copiarEtapaAPisos as copiarEtapaDatos,
  moverEtapa as moverEtapaDatos,
} from './organizar';
import type { DestinoPartida } from './organizar';

export type { CatItem, Catalogo } from '../engine/types';
export { CATALOGO } from './catalogo';
export type { EtapaParaTotalizar, PreciosUsuario } from './totalizar';

export interface EtapaGuardada {
  id: string;         // 'cimientos' | 'muros' | ...
  titulo: string;
  detalle: string;
  resultado: ResultadoCalculo;
  timestamp: number;
  proyectoId?: string;     // proyecto de edificio al que pertenece la partida
  proyectoNombre?: string; // nombre al momento de guardar (para desgloses y PDF)
  piso?: number;           // 1..5; undefined = obra general / casa
}

export interface ProyectoEdificio {
  id: string;
  nombre: string;
  pisos: number;   // 3..5 (límite de producto)
  creado: number;
}

/** Datos que viajan en un respaldo JSON. No incluye las acciones del store. */
export interface ObraDatos {
  etapas: EtapaGuardada[];
  precios: PreciosUsuario;
  proyectos: ProyectoEdificio[];
  proyectoActivoId: string | null;
  pisoActivo: number;
}

interface ObraState {
  etapas: EtapaGuardada[];
  precios: PreciosUsuario;
  proyectos: ProyectoEdificio[];
  proyectoActivoId: string | null;
  pisoActivo: number;
  agregarEtapa: (e: EtapaGuardada) => void;
  quitarEtapa: (idx: number) => void;
  crearProyecto: (nombre: string, pisos: number) => string;
  setProyectoActivo: (id: string | null) => void;
  setPisoActivo: (piso: number) => void;
  eliminarProyecto: (id: string) => void;
  setPrecio: (id: string, precio: number) => void;
  quitarPrecio: (id: string) => void;
  limpiarPrecios: () => void;
  limpiarObra: () => void;
  cargarRespaldo: (datos: ObraDatos) => void;
  moverEtapa: (idx: number, destino: DestinoPartida) => void;
  copiarEtapaAPisos: (idx: number, proyectoId: string, pisos?: number[]) => void;
}

export const useObraStore = create<ObraState>()(
  persist(
    (set) => ({
      etapas: [],
      precios: {},
      proyectos: [],
      proyectoActivoId: null,
      pisoActivo: 1,
      agregarEtapa: (e) => set((s) => {
    // Permitir guardar la misma calculadora varias veces con medidas distintas (pisos diferentes)
    // Solo evitamos el caso extremo de doble clic que genere exactamente la misma entrada
    if (s.etapas.length > 0) {
      const ultimo = s.etapas[s.etapas.length - 1];
      if (
        ultimo.id === e.id &&
        ultimo.titulo === e.titulo &&
        ultimo.detalle === e.detalle &&
        ultimo.timestamp === e.timestamp &&
        ultimo.proyectoId === e.proyectoId &&
        ultimo.piso === e.piso
      ) {
        return s;
      }
    }
    return { etapas: [...s.etapas, e] };
  }),
      quitarEtapa: (idx) => set((s) => ({ etapas: s.etapas.filter((_, i) => i !== idx) })),
      crearProyecto: (nombre, pisos) => {
        const n = Number.isFinite(pisos) ? Math.round(pisos) : 3;
        const proyecto: ProyectoEdificio = {
          id: `proy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          nombre: nombre.trim() || `Edificio de ${Math.min(5, Math.max(3, n))} pisos`,
          pisos: Math.min(5, Math.max(3, n)),
          creado: Date.now(),
        };
        set((s) => ({
          proyectos: [...s.proyectos, proyecto],
          proyectoActivoId: proyecto.id,
          pisoActivo: 1,
        }));
        return proyecto.id;
      },
      setProyectoActivo: (id) => set((s) => {
        if (!id) return { proyectoActivoId: null, pisoActivo: 1 };
        const proyecto = s.proyectos.find(p => p.id === id);
        if (!proyecto) return { proyectoActivoId: null, pisoActivo: 1 };
        return {
          proyectoActivoId: proyecto.id,
          pisoActivo: Math.max(1, Math.min(proyecto.pisos, s.pisoActivo)),
        };
      }),
      setPisoActivo: (piso) => set((s) => {
        const proyecto = s.proyectos.find(p => p.id === s.proyectoActivoId);
        const max = proyecto?.pisos ?? 5;
        const n = Number.isFinite(piso) ? Math.round(piso) : 1;
        return { pisoActivo: Math.max(1, Math.min(max, n)) };
      }),
      eliminarProyecto: (id) => set((s) => {
        // Solo se elimina si está vacío; las partidas guardadas son del usuario.
        if (s.etapas.some(e => e.proyectoId === id)) return s;
        const eraActivo = s.proyectoActivoId === id;
        return {
          proyectos: s.proyectos.filter(p => p.id !== id),
          proyectoActivoId: eraActivo ? null : s.proyectoActivoId,
          pisoActivo: eraActivo ? 1 : s.pisoActivo,
        };
      }),
      setPrecio: (id, precio) => set((s) => ({ precios: { ...s.precios, [id]: precio } })),
      quitarPrecio: (id) => set((s) => {
        const nuevo = { ...s.precios };
        delete nuevo[id];
        return { precios: nuevo };
      }),
      limpiarPrecios: () => set({ precios: {} }),
      limpiarObra: () => set({ etapas: [] }),
      cargarRespaldo: (datos) => set({
        etapas: datos.etapas,
        precios: datos.precios,
        proyectos: datos.proyectos,
        proyectoActivoId: datos.proyectoActivoId,
        pisoActivo: datos.pisoActivo,
      }),
      moverEtapa: (idx, destino) => set((s) => {
        const etapas = moverEtapaDatos(s.etapas, idx, destino, s.proyectos);
        return etapas === s.etapas ? s : { etapas };
      }),
      copiarEtapaAPisos: (idx, proyectoId, pisos) => set((s) => {
        const proyecto = s.proyectos.find(p => p.id === proyectoId);
        if (!proyecto) return s;
        const etapas = copiarEtapaDatos(s.etapas, idx, proyecto, pisos);
        return etapas === s.etapas ? s : { etapas };
      }),
    }),
    { name: 'obra-exacta-v1' }
  )
);

// ─── Consolidado de Mi obra ───────────────────────────────────────────────────
// La lógica vive en ./totalizar para poder probarla sin montar zustand.
export { totalizarObra } from './totalizar';
