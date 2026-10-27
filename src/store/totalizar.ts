import { CATALOGO } from './catalogo';
import type { CatItem, ResultadoCalculo } from '../engine/types';

/** Lo mínimo que necesita la consolidación; `EtapaGuardada` lo cumple. */
export interface EtapaParaTotalizar {
  titulo: string;
  resultado: ResultadoCalculo;
  piso?: number;
  proyectoNombre?: string;
}

export type PreciosUsuario = Record<string, number>;

function esVarilla(cat: CatItem | undefined): boolean {
  return Boolean(cat && cat.unidad.includes('varilla'));
}

/**
 * `MaterialResultado.cant` debe estar siempre en la unidad del catálogo
 * (varilla, bolsa, m³, kg…). Las partidas guardadas antes de corregir el
 * acero tienen `cant` en kg con unidad de venta "varilla 9 m"; se detectan
 * porque el peso en kilos supera la cantidad de varillas a comprar.
 * En ese caso se usa `comprar`, que siempre estuvo en varillas.
 */
function cantidadEnUnidadDeCatalogo(
  mat: { cant: number; comprar: number },
  cat: CatItem | undefined,
): number {
  if (esVarilla(cat) && mat.comprar > 0 && mat.cant > mat.comprar) {
    return mat.comprar;
  }
  return mat.cant;
}

// ─── Totalizar Mi obra (suma antes de redondear) ─────────────────────────────
export function totalizarObra(etapas: EtapaParaTotalizar[], precios: PreciosUsuario) {
  const etiquetaParte = (p: { etapa: string; piso?: number; proyecto?: string }) =>
    [p.etapa, p.piso ? `Piso ${p.piso}` : '', p.proyecto ?? ''].filter(Boolean).join(' · ');

  const acum: Record<string, {
    cant: number;
    comprar: number;
    partes: Array<{ etapa: string; cant: number; piso?: number; proyecto?: string }>;
  }> = {};

  for (const etapa of etapas) {
    for (const mat of etapa.resultado.mats) {
      if (!acum[mat.id]) acum[mat.id] = { cant: 0, comprar: 0, partes: [] };
      const cant = cantidadEnUnidadDeCatalogo(mat, CATALOGO[mat.id]);
      acum[mat.id].cant += cant;
      acum[mat.id].partes.push({
        etapa: etapa.titulo,
        cant,
        piso: etapa.piso,
        proyecto: etapa.proyectoNombre,
      });
    }
  }

  // Redondear después de sumar (regla de oro de obra: sumar antes de redondear)
  for (const id in acum) {
    const cat = CATALOGO[id];
    if (!cat) continue;
    // Si la unidad es m³/m² redondeamos a 1 decimal para fletes/camión; si es
    // bolsa/varilla/und al entero superior.
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
          return `${etiquetaParte(p)} (${valStr})`;
        }).join(' + ');
        desglose = `${sumandos} = ${v.cant < 10 ? v.cant.toFixed(2) : v.cant.toFixed(1)} ${cat?.unidad ?? ''}`;
      } else if (v.partes.length === 1) {
        desglose = `${etiquetaParte(v.partes[0])}: ${v.cant < 10 ? v.cant.toFixed(2) : v.cant.toFixed(1)} ${cat?.unidad ?? ''}`;
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
