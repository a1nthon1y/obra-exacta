import type { EtapaGuardada, ProyectoEdificio } from './obraStore';

export interface DestinoPartida {
  proyectoId?: string;
  piso?: number;
}

/**
 * Mueve una partida a otro proyecto/piso. Si el destino es Casa/obra general
 * (`proyectoId` vacío), limpia la ubicación de edificio. Si el proyecto o el
 * índice no existen, devuelve el arreglo original.
 */
export function moverEtapa(
  etapas: EtapaGuardada[],
  idx: number,
  destino: DestinoPartida,
  proyectos: ProyectoEdificio[],
): EtapaGuardada[] {
  const etapa = etapas[idx];
  if (!etapa) return etapas;

  const proyecto = destino.proyectoId
    ? proyectos.find(p => p.id === destino.proyectoId)
    : undefined;
  if (destino.proyectoId && !proyecto) return etapas;

  const pisoSolicitado = Number.isFinite(destino.piso) ? Math.round(destino.piso as number) : 1;
  const piso = proyecto
    ? Math.max(1, Math.min(proyecto.pisos, pisoSolicitado))
    : undefined;

  const actualizada: EtapaGuardada = {
    ...etapa,
    proyectoId: proyecto?.id,
    proyectoNombre: proyecto?.nombre,
    piso,
  };

  return etapas.map((e, i) => (i === idx ? actualizada : e));
}

/**
 * Copia una partida a los pisos de un proyecto. Por defecto usa todos los
 * pisos; si la partida original ya está en uno de ellos, no duplica ese piso.
 * La partida original no se modifica.
 */
export function copiarEtapaAPisos(
  etapas: EtapaGuardada[],
  idx: number,
  proyecto: ProyectoEdificio,
  pisos?: number[],
): EtapaGuardada[] {
  const etapa = etapas[idx];
  if (!etapa) return etapas;

  const solicitados = pisos ?? Array.from({ length: proyecto.pisos }, (_, i) => i + 1);
  const destinos = [...new Set(
    solicitados
      .filter(p => Number.isInteger(p) && p >= 1 && p <= proyecto.pisos)
      .filter(p => !(etapa.proyectoId === proyecto.id && etapa.piso === p)),
  )];
  if (destinos.length === 0) return etapas;

  const base = Date.now();
  const copias: EtapaGuardada[] = destinos.map((piso, i) => ({
    ...etapa,
    proyectoId: proyecto.id,
    proyectoNombre: proyecto.nombre,
    piso,
    timestamp: base + i,
  }));

  return [...etapas, ...copias];
}
