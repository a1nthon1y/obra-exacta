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
        <div className="ref-card__title">📋 Norma y práctica (RNE / CAPECO)</div>
        <div className="ref-card__body">
          • Desplante usual en vivienda: <strong>0.80 m o más</strong>; la profundidad la define el estudio de suelos (RNE E.050)<br />
          • Ancho del cimiento corrido: <strong>0.50 m o más</strong> para muros portantes de 1–2 pisos (regla de obra; el ancho final lo define el diseño de cimentación)<br />
          • Sobrecimiento: <strong>0.30 m o más</strong> sobre el nivel del terreno para cortar la humedad (práctica CAPECO)<br />
          • Concreto ciclópeo: <strong>1:10</strong> con piedra grande 8"–10", bien acomodada y separada de las caras<br />
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
