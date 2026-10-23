import React from 'react';
import { ConsejosZona } from './ConsejosZona';

/**
 * Referencia de la zapata aislada. Mismo envoltorio y tarjetas que el
 * resto de visores (.ref-wrap / .ref-card).
 */
export const ZapataReferencia: React.FC = () => {
  return (
    <div className="ref-wrap">
      <div className="ref-grid">
        <div className="ref-card">
          <div className="ref-card__title">⬜ ¿Cuándo usar?</div>
          <div className="ref-card__body">
            Debajo de <strong>columnas independientes</strong>. Si el cimiento corre
            bajo un muro, corresponde usar <strong>Cimientos corridos</strong>.
          </div>
        </div>

        <div className="ref-card">
          <div className="ref-card__title">🌎 Presión admisible (pa)</div>
          <div className="ref-card__body">
            Blando <strong>~0.80</strong> · Intermedio <strong>~1.20</strong> ·
            Duro <strong>~2.00 kg/cm²</strong>. Si tienes estudio de suelos,
            usa el valor del estudio.
          </div>
        </div>
      </div>

      <div className="ref-card ref-card--accent">
        <div className="ref-card__title">📐 Cómo se dimensiona</div>
        <div className="ref-card__body">
          • Área necesaria = <strong>carga ÷ presión del suelo</strong>.<br />
          • Como suele ser cuadrada, el lado = raíz del área.<br />
          • Se redondea al múltiplo de <strong>5 cm hacia arriba</strong>.<br />
          • Espesor usual: <strong>0.40 m o más</strong>, cuidando punzonamiento y corte.<br />
          • Malla inferior en ambas direcciones (X-Y) con recubrimiento ~5 cm.
        </div>
      </div>

      <ConsejosZona />

      <div className="ref-card ref-card--warn">
        <div className="ref-card__title">⚠️ Importante</div>
        <div className="ref-card__body">
          Este metrado es <strong>referencial</strong>. Para obra ejecutiva se requiere
          cálculo estructural, plano aprobado y, de ser el caso, estudio de mecánica
          de suelos (RNE E.050). Obra Exacta no reemplaza un diseño estructural.
        </div>
      </div>
    </div>
  );
};
