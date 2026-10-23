import React from 'react';

interface Props {
  realLargo: number;
  realAncho: number;
  realProf: number;
  realEsp: number;
  realAlto: number;
}

export const CimientoCorte2D: React.FC<Props> = ({
  realLargo,
  realAncho,
  realProf,
  realEsp,
  realAlto,
}) => {
  return (
    <div className="viewer-2d">
      <svg
        viewBox="0 0 540 380"
        role="img"
        aria-label="Corte transversal acotado de cimiento corrido y sobrecimiento"
      >
        <defs>
          <marker id="arrow-cyan" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker id="arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" />
          </marker>
          <pattern id="hatch-piedra" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="3.5" fill="#475569" fillOpacity="0.6" />
            <circle cx="15" cy="14" r="4.5" fill="#475569" fillOpacity="0.6" />
          </pattern>
          <pattern id="hatch-ladrillo" width="20" height="10" patternUnits="userSpaceOnUse">
            <rect width="20" height="10" fill="#7f1d1d" fillOpacity="0.5" />
            <line x1="0" y1="10" x2="20" y2="10" stroke="#b91c1c" strokeWidth="1" />
            <line x1="10" y1="0" x2="10" y2="10" stroke="#b91c1c" strokeWidth="1" />
          </pattern>
          <pattern id="hatch-sobrecimiento" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2.5" fill="#94a3b8" fillOpacity="0.5" />
            <circle cx="12" cy="12" r="3" fill="#94a3b8" fillOpacity="0.5" />
          </pattern>
        </defs>

        {/* Nivel de Terreno Natural (NTN) */}
        <line x1="30" y1="200" x2="510" y2="200" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x="30" y="194" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">▼ N.T.N. (Terreno natural ±0.00)</text>

        {/* Suelo a los lados */}
        <rect x="30" y="200" width="130" height="140" fill="#2d1c10" fillOpacity="0.5" />
        <rect x="380" y="200" width="130" height="140" fill="#2d1c10" fillOpacity="0.5" />

        {/* Cimiento Corrido */}
        <rect x="160" y="200" width="220" height="140" fill="#334155" stroke="#38bdf8" strokeWidth="2" />
        <rect x="160" y="200" width="220" height="140" fill="url(#hatch-piedra)" />
        <text x="270" y="260" fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">
          Cimiento Corrido 1:10
        </text>
        <text x="270" y="282" fill="#94a3b8" fontSize="10" textAnchor="middle">
          (+30% Piedra Grande)
        </text>

        {/* Sobrecimiento */}
        <rect x="195" y="120" width="70" height="80" fill="#475569" stroke="#fbbf24" strokeWidth="2" />
        <rect x="195" y="120" width="70" height="80" fill="url(#hatch-sobrecimiento)" />
        <text x="230" y="152" fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">
          Sobrecimiento
        </text>
        <text x="230" y="167" fill="#cbd5e1" fontSize="9" textAnchor="middle">
          1:8 + 25% PM
        </text>

        {/* Muro guía */}
        <rect x="197" y="65" width="66" height="55" fill="url(#hatch-ladrillo)" stroke="#ef4444" strokeWidth="1.5" />
        <text x="230" y="95" fill="#fecaca" fontSize="10" fontWeight="bold" textAnchor="middle">
          Muro Ladrillo
        </text>

        {/* COTAS ARQUITECTÓNICAS */}
        {/* 1. Cota Ancho Cimiento */}
        <line x1="160" y1="350" x2="380" y2="350" stroke="#38bdf8" strokeWidth="2" markerStart="url(#arrow-cyan)" markerEnd="url(#arrow-cyan)" />
        <line x1="160" y1="330" x2="160" y2="360" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="380" y1="330" x2="380" y2="360" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
        <rect x="230" y="340" width="80" height="20" rx="4" fill="#0b1329" stroke="#38bdf8" strokeWidth="1" />
        <text x="270" y="354" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
          {realAncho.toFixed(2)} m
        </text>

        {/* 2. Cota Profundidad Zanja */}
        <line x1="410" y1="200" x2="410" y2="340" stroke="#38bdf8" strokeWidth="2" markerStart="url(#arrow-cyan)" markerEnd="url(#arrow-cyan)" />
        <line x1="390" y1="200" x2="430" y2="200" stroke="#38bdf8" strokeWidth="1" />
        <line x1="390" y1="340" x2="430" y2="340" stroke="#38bdf8" strokeWidth="1" />
        <rect x="420" y="258" width="80" height="20" rx="4" fill="#0b1329" stroke="#38bdf8" strokeWidth="1" />
        <text x="460" y="272" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
          {realProf.toFixed(2)} m
        </text>

        {/* 3. Cota Altura Sobrecimiento */}
        <line x1="285" y1="120" x2="285" y2="200" stroke="#fbbf24" strokeWidth="2" markerStart="url(#arrow-amber)" markerEnd="url(#arrow-amber)" />
        <line x1="270" y1="120" x2="300" y2="120" stroke="#fbbf24" strokeWidth="1" />
        <line x1="270" y1="200" x2="300" y2="200" stroke="#fbbf24" strokeWidth="1" />
        <rect x="293" y="148" width="75" height="20" rx="4" fill="#1f1807" stroke="#fbbf24" strokeWidth="1" />
        <text x="330" y="162" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
          {realAlto.toFixed(2)} m
        </text>

        {/* 4. Cota Espesor Sobrecimiento */}
        <line x1="195" y1="35" x2="265" y2="35" stroke="#fbbf24" strokeWidth="2" markerStart="url(#arrow-amber)" markerEnd="url(#arrow-amber)" />
        <line x1="195" y1="27" x2="195" y2="43" stroke="#fbbf24" strokeWidth="1" />
        <line x1="265" y1="27" x2="265" y2="43" stroke="#fbbf24" strokeWidth="1" />
        <rect x="200" y="13" width="60" height="18" rx="4" fill="#1f1807" stroke="#fbbf24" strokeWidth="1" />
        <text x="230" y="26" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
          {realEsp.toFixed(2)} m
        </text>

        {/* 5. Cota Largo Total */}
        <line x1="130" y1="360" x2="410" y2="360" stroke="#10b981" strokeWidth="2" markerStart="url(#arrow-cyan)" markerEnd="url(#arrow-cyan)" />
        <line x1="130" y1="350" x2="130" y2="375" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="410" y1="350" x2="410" y2="375" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
        <rect x="220" y="355" width="100" height="20" rx="4" fill="#0b1329" stroke="#10b981" strokeWidth="1" />
        <text x="270" y="369" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
          L = {realLargo.toFixed(1)} m
        </text>
      </svg>

      <div className="viewer-2d-desc">
        📐 <strong>Corte transversal acotado:</strong> Cimiento corrido ciclópeo + sobrecimiento + muro guía. Valores actualizados al instante.
      </div>
    </div>
  );
};