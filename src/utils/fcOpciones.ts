/**
 * Opciones del selector de resistencia del concreto, con su uso típico.
 * f'c depende de la función estructural, NO de la zona geográfica:
 * RNE E.060 no distingue costa/sierra/selva para la dosificación,
 * solo cambia el curado y la exposición (ver ConsejosZona).
 */
export const FC_OPCIONES: Array<{ valor: number; etiqueta: string }> = [
  { valor: 140, etiqueta: '140 · sin carga (firme, contrapiso)' },
  { valor: 175, etiqueta: '175 · partes no estructurales' },
  { valor: 210, etiqueta: '210 · casa habitación ✓ recomendado' },
  { valor: 245, etiqueta: '245 · cargas altas / 3 pisos' },
  { valor: 280, etiqueta: '280 · diseño especial' },
];

/** Ayuda corta bajo el select de f'c. */
export const FC_AYUDA = "Casa habitación: f'c 210. Si tienes plano estructural, usa el que diga el plano.";
