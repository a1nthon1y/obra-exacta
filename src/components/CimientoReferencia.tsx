import React from 'react';
import { ConsejosZona } from './ConsejosZona';

export const CimientoReferencia: React.FC = () => {
  return (
    <div className="ref-wrap">
      <div className="ref-grid">
        <div className="ref-card">
          <div className="ref-card__title">🏗️ Cimiento corrido (zanja)</div>
          <div className="ref-card__body">
            • Concreto ciclópeo <strong>1:10</strong> (cemento:arena:grava)<br />
            • <strong>+30% piedra grande</strong> (PG) incrustada<br />
            • Resistencia: ~100-150 kg/cm²<br />
            • Uso: cimientos continuos bajo muros portantes
          </div>
        </div>

        <div className="ref-card">
          <div className="ref-card__title">📏 Sobrecimiento</div>
          <div className="ref-card__body">
            • Concreto <strong>1:8</strong> + 25% piedra mediana (PM)<br />
            • Altura típica: <strong>0.30 - 0.50 m</strong> sobre NTN<br />
            • Ancho = espesor del muro que soporta<br />
            • Distribuye la carga al cimiento
          </div>
        </div>
      </div>

      <div className="ref-card ref-card--accent">
        <div className="ref-card__title">📋 Norma técnica peruana (RNE E.070 / E.060)</div>
        <div className="ref-card__body">
          • Profundidad mínima de cimiento: <strong>0.80 m</strong> en suelos normales (E.060 Art. 15.2.2)<br />
          • Ancho mínimo: <strong>espesor del muro + 0.10 m</strong> a cada lado (E.060 Art. 15.2.3)<br />
          • Sobrecimiento mínimo: <strong>0.30 m</strong> sobre NTN para evitar humedad (E.070)<br />
          • Concreto ciclópeo: <strong>1:10</strong> con piedra ≤ 2/3 del espesor del cimiento<br />
          • Compactación del fondo de zanja obligatoria antes del vaciado<br />
          • Curado mínimo 7 días antes de cargar
        </div>
      </div>

      <ConsejosZona />

      <div className="ref-card ref-card--warn">
        <div className="ref-card__title">⚡ Recomendaciones prácticas (SENCICO)</div>
        <div className="ref-card__body">
          • Verificar capacidad de carga del suelo (SPT o pozo de prueba)<br />
          • Nivelar fondo de zanja con concreto magro (1:15) si el suelo es blando<br />
          • Espaciar piedras grandes ≥ 5 cm entre sí y de las caras<br />
          • Vibrar concreto en sobrecimiento para evitar huecos<br />
          • Impermeabilizar la cara externa si hay napas freáticas
        </div>
      </div>
    </div>
  );
};
