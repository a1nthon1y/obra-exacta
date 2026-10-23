import React from 'react';

interface Props {
  bZap: number;     // m
  hZap: number;     // m
  espesor: number;  // m
  bCol: number;     // m
  hCol: number;     // m
}

/**
 * Corte esquemático de la zapata aislada. Usa el mismo envoltorio
 * (.viewer-2d) que el resto de planos 2D para que todas las pestañas
 * se vean iguales.
 */
export const ZapataCorte2D: React.FC<Props> = ({ bZap, hZap, espesor, bCol, hCol }) => {
  const B = bZap > 0 ? bZap : 1.0;
  const Hz = hZap > 0 ? hZap : 1.0;
  const Hm = espesor > 0 ? espesor : 0.4;
  const bc = bCol > 0 ? bCol : 0.3;
  const hc = hCol > 0 ? hCol : 0.3;

  const cx = 280;
  const ntnY = 210;
  const escX = 65;
  const escY = 80;

  // Se limita solo el dibujo (el texto muestra la medida real)
  const Bvis = Math.min(B, 3.2);
  const Hvis = Math.min(Hm, 0.8);

  const zapW = Bvis * escX;
  const zapH = Hvis * escY;
  const xZapIzq = cx - zapW / 2;
  const xZapDer = cx + zapW / 2;
  const yZapSup = 245;
  const yZapInf = yZapSup + zapH;

  const colW = Math.max(bc * escX, 18);
  const colH = Math.max(hc * escY, 55);
  const xColIzq = cx - colW / 2;
  const yColSup = yZapSup - colH;

  const dimY = Math.min(yZapInf + 18, 324);

  return (
    <div className="viewer-2d">
      <svg viewBox="0 0 560 340" role="img" aria-label="Corte de zapata aislada con columna y medidas">
        <defs>
          <marker id="arrow-cyan-z" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker id="arrow-amber-z" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" />
          </marker>
          <pattern id="hatch-zapata" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="6" r="2.8" fill="#475569" fillOpacity="0.6" />
            <circle cx="13" cy="12" r="3.2" fill="#475569" fillOpacity="0.6" />
          </pattern>
          <pattern id="hatch-terreno-z" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2" fill="#7c4a2d" fillOpacity="0.55" />
            <circle cx="12" cy="11" r="2.6" fill="#7c4a2d" fillOpacity="0.45" />
          </pattern>
        </defs>

        {/* Terreno */}
        <rect x="30" y={ntnY} width="500" height={330 - ntnY} fill="#2d1c10" fillOpacity="0.45" />
        <rect x="30" y={ntnY} width="500" height={330 - ntnY} fill="url(#hatch-terreno-z)" />

        {/* Nivel de terreno natural */}
        <line x1="30" y1={ntnY} x2="530" y2={ntnY} stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x="30" y={ntnY - 6} fill="#94a3b8" fontSize="10" fontFamily="sans-serif">▼ N.T.N.</text>

        {/* Zapata */}
        <rect x={xZapIzq} y={yZapSup} width={zapW} height={zapH} fill="#334155" stroke="#38bdf8" strokeWidth="2" />
        <rect x={xZapIzq} y={yZapSup} width={zapW} height={zapH} fill="url(#hatch-zapata)" />

        {/* Malla inferior */}
        {Array.from({ length: 5 }, (_, i) => (
          <circle
            key={i}
            cx={xZapIzq + 12 + (i * (zapW - 24)) / 4}
            cy={yZapInf - 9}
            r="3"
            fill="#0f172a"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        <text x={cx} y={yZapSup + Math.max(zapH / 2 + 4, 16)} fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">Zapata aislada</text>
        {zapH > 44 && (
          <text x={cx} y={yZapSup + zapH / 2 + 20} fill="#94a3b8" fontSize="10" textAnchor="middle">Concreto armado</text>
        )}

        {/* Columna */}
        <rect x={xColIzq} y={yColSup} width={colW} height={colH} fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
        <text x={cx} y={yColSup + colH / 2 + 4} fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">Columna</text>

        {/* Cota del lado de la zapata */}
        <line x1={xZapIzq} y1={dimY} x2={xZapDer} y2={dimY} stroke="#38bdf8" strokeWidth="2" markerStart="url(#arrow-cyan-z)" markerEnd="url(#arrow-cyan-z)" />
        <line x1={xZapIzq} y1={dimY - 8} x2={xZapIzq} y2={dimY + 8} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={xZapDer} y1={dimY - 8} x2={xZapDer} y2={dimY + 8} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
        <rect x={cx - 30} y={dimY - 9} width={60} height={16} rx={4} fill="#0b1329" stroke="#38bdf8" strokeWidth={1} />
        <text x={cx} y={dimY + 2} fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{B.toFixed(2)} m</text>

        {/* Cota del espesor */}
        <line x1={xZapDer + 18} y1={yZapInf} x2={xZapDer + 18} y2={yZapSup} stroke="#fbbf24" strokeWidth="2" markerStart="url(#arrow-amber-z)" markerEnd="url(#arrow-amber-z)" />
        <line x1={xZapDer + 10} y1={yZapInf} x2={xZapDer + 26} y2={yZapInf} stroke="#fbbf24" strokeWidth="1" />
        <line x1={xZapDer + 10} y1={yZapSup} x2={xZapDer + 26} y2={yZapSup} stroke="#fbbf24" strokeWidth="1" />
        <rect x={xZapDer + 26} y={yZapSup + zapH / 2 - 8} width={52} height={16} rx={4} fill="#1f1807" stroke="#fbbf24" strokeWidth={1} />
        <text x={xZapDer + 52} y={yZapSup + zapH / 2 + 3} fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">h={Hm.toFixed(2)} m</text>

        {/* Cota de la columna */}
        <line x1={xColIzq} y1={yColSup - 12} x2={xColIzq + colW} y2={yColSup - 12} stroke="#38bdf8" strokeWidth="1.5" markerStart="url(#arrow-cyan-z)" markerEnd="url(#arrow-cyan-z)" />
        <text x={cx} y={yColSup - 18} fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">{bc.toFixed(2)} × {hc.toFixed(2)} m</text>
      </svg>

      <div className="viewer-2d-desc">
        <strong>Corte esquemático:</strong> zapata aislada de {B.toFixed(2)} × {Hz.toFixed(2)} m bajo columna. La malla inferior va en ambas direcciones. Valores orientativos.
      </div>
    </div>
  );
};
