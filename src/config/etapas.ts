/**
 * Fuente única de verdad de las etapas de obra.
 *
 * El mismo icono y el mismo nombre se usan en la tarjeta de inicio, en el
 * título de la calculadora y en la barra del visor. Si algo cambia, se
 * cambia AQUÍ y las 3 vistas quedan alineadas automáticamente.
 */

export type EtapaId =
  | 'cimientos'
  | 'zapata'
  | 'muros'
  | 'columnas'
  | 'vigas'
  | 'losa'
  | 'escalera'
  | 'acabados';

export interface EtapaConfig {
  id: EtapaId;
  /** Emoji único de la etapa (tarjeta + página + visor) */
  icon: string;
  /** Nombre corto para tarjetas y navegación */
  nombre: string;
  /** Descripción de una línea en la tarjeta de inicio */
  desc: string;
  /** Título de la página de la calculadora */
  tituloCalc: string;
  /** Título de la barra del visor técnico */
  tituloVisor: string;
}

export const ETAPAS: EtapaConfig[] = [
  {
    id: 'cimientos',
    icon: '🏗️',
    nombre: 'Cimientos',
    desc: 'Excavación, cimiento ciclópeo y sobrecimiento',
    tituloCalc: 'Cimientos',
    tituloVisor: 'Visualizador de Cimiento',
  },
  {
    id: 'zapata',
    icon: '⬜',
    nombre: 'Zapata aislada',
    desc: 'Por carga axial, suelo y presión admisible',
    tituloCalc: 'Zapata aislada',
    tituloVisor: 'Visualizador de Zapata Aislada',
  },
  {
    id: 'muros',
    icon: '🧱',
    nombre: 'Muros',
    desc: 'Ladrillo, mortero y esbeltez',
    tituloCalc: 'Muros de ladrillo',
    tituloVisor: 'Visualizador del Muro',
  },
  {
    id: 'columnas',
    icon: '🏛️',
    nombre: 'Columnas',
    desc: 'Concreto, fierro y estribos',
    tituloCalc: 'Columnas',
    tituloVisor: 'Visualizador de Columna',
  },
  {
    id: 'vigas',
    icon: '📐',
    nombre: 'Vigas',
    desc: 'Concreto y fierro de refuerzo',
    tituloCalc: 'Vigas',
    tituloVisor: 'Visualizador de Viga',
  },
  {
    id: 'losa',
    icon: '🔲',
    nombre: 'Losa aligerada',
    desc: 'Viguetas, ladrillo de techo y concreto',
    tituloCalc: 'Losa aligerada',
    tituloVisor: 'Visualizador de Losa Aligerada',
  },
  {
    id: 'escalera',
    icon: '🪜',
    nombre: 'Escalera',
    desc: 'Escalones, concreto y fierro',
    tituloCalc: 'Escalera',
    tituloVisor: 'Visualizador de Escalera',
  },
  {
    id: 'acabados',
    icon: '🎨',
    nombre: 'Acabados',
    desc: 'Tarrajeo, piso y pintura',
    tituloCalc: 'Acabados',
    tituloVisor: 'Vista de Acabados',
  },
];

export function getEtapa(id: EtapaId): EtapaConfig {
  return ETAPAS.find(e => e.id === id) ?? ETAPAS[0];
}
