import CATALOGO_JSON from '../engine/catalogo.json';
import type { Catalogo } from '../engine/types';

/**
 * Catálogo de materiales con su unidad de venta y precio de referencia.
 * Vive aparte del store para que el motor de consolidado se pueda probar
 * sin montar zustand.
 */
export const CATALOGO: Catalogo = CATALOGO_JSON as Catalogo;
