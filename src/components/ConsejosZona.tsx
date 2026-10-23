import React from 'react';

/**
 * Consejos de curado y exposición por zona del Perú (costa / sierra / selva).
 * Es contenido, no un input: la resistencia f'c depende de la función
 * estructural y no cambia con la geografía — solo cambia el cuidado en obra.
 */
export const ConsejosZona: React.FC = () => (
  <div style={{ border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)' }}>
    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: 6 }}>
      🌎 Según tu zona (misma mezcla, otro cuidado)
    </div>
    <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
      • <b>Costa</b> — cerca al mar la salitre ataca el acero: recubrimiento +1 cm y buen curado.<br />
      • <b>Sierra</b> — el frío hace tomar más lento: no vaciar con heladas y mantener húmedo más días.<br />
      • <b>Selva</b> — la lluvia lava el concreto fresco: cubrir el vaciado y curar seguido.
    </div>
  </div>
);
