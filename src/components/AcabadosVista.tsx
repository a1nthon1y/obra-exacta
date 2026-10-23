import React, { useState } from 'react';
import { ViewerShell } from './ViewerShell';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('acabados');

/**
 * Vista de acabados: plano de ambiente en estilo técnico (azul blueprint)
 * que muestra el piso con cerámico, las paredes con tarrajeo/pintura y el
 * contrapiso en corte. No usa 3D porque lo que se calcula son superficies.
 */
interface Props {
  aTarr: number;   // m²
  aPint: number;   // m²
  aPiso: number;   // m²
  contra: 'si' | 'no';
  eContra: number; // cm
  eTarr: number;   // cm
  manos: number;
  rendP: number;   // m²/gal
}

export const AcabadosVista: React.FC<Props> = ({
  aTarr, aPint, aPiso, contra, eContra, eTarr, manos, rendP,
}) => {
  const [tab, setTab] = useState<'plano' | 'referencia'>('plano');

  const badges = [
    { id: 'tarr', icon: '🧱', label: 'Tarrajeo', value: `${aTarr || '—'} m²` },
    { id: 'pint', icon: '🎨', label: 'Pintura', value: `${aPint || '—'} m²` },
    { id: 'piso', icon: '▦', label: 'Piso', value: `${aPiso || '—'} m²` },
    { id: 'contra', icon: '🟫', label: 'Contrapiso', value: contra === 'si' ? `${eContra} cm` : 'no va' },
  ];

  return (
    <ViewerShell
      icon={etapa.icon}
      titulo={etapa.tituloVisor}
      tabs={[
        { id: 'plano', label: 'Plano del ambiente' },
        { id: 'referencia', label: 'Referencia' },
      ]}
      tab={tab}
      onTab={id => setTab(id as 'plano' | 'referencia')}
      badges={badges}
    >
      {tab === 'plano' ? (
        <div className="viewer-canvas-wrap" style={{ height: '350px', background: '#070b14', overflow: 'auto' }}>
          <svg viewBox="0 0 480 330" width="100%" height="100%" role="img" aria-label="Plano del ambiente con pisos, paredes y contrapiso">
            {/* Pared fondo */}
            <polygon points="110,60 420,60 420,190 110,190" fill="#141d30" stroke="#334155" strokeWidth="1.5" />
            {/* Pared izquierda */}
            <polygon points="60,90 110,60 110,190 60,215" fill="#101828" stroke="#334155" strokeWidth="1.5" />

            {/* Suelo */}
            <polygon points="60,215 110,190 420,190 370,215 370,240 60,240" fill="#182233" stroke="#334155" strokeWidth="1.5" />
            {/* Retícula de cerámico en el suelo */}
            {[0.2, 0.4, 0.6, 0.8].map(f => (
              <line
                key={f}
                x1={60 + (370 - 60) * f}
                y1={215}
                x2={110 + (420 - 110) * f}
                y2={190}
                stroke="#334155"
                strokeWidth="0.8"
                opacity="0.7"
              />
            ))}
            {[0.33, 0.66].map(f => (
              <line
                key={`h${f}`}
                x1="60"
                y1={215 + (240 - 215) * f}
                x2="370"
                y2={215 + (240 - 215) * f}
                stroke="#334155"
                strokeWidth="0.8"
                opacity="0.5"
              />
            ))}

            {/* Contrapiso en corte (opcional) */}
            {contra === 'si' && (
              <>
                <rect x="60" y="240" width="310" height="12" fill="#1f1807" stroke="#d97706" strokeWidth="1" />
                <text x="215" y="249" fill="#fbbf24" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  CONTRAPISO {eContra} cm
                </text>
              </>
            )}

            {/* Acotación del suelo */}
            <line x1="60" y1="270" x2="370" y2="270" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="60" y1="265" x2="60" y2="275" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="370" y1="265" x2="370" y2="275" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="150" y="277" width="130" height="20" rx="4" fill="#0b1329" stroke="#38bdf8" strokeWidth="1" />
            <text x="215" y="291" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              PISO: {aPiso || '—'} m²
            </text>

            {/* Etiqueta pared fondo: pintura + tarrajeo */}
            <rect x="190" y="95" width="160" height="38" rx="4" fill="#0b1329" stroke="#fbbf24" strokeWidth="1" />
            <text x="270" y="111" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              PINTURA: {aPint || '—'} m²
            </text>
            <text x="270" y="126" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
              {manos} mano(s) · {rendP} m²/gal
            </text>

            {/* Etiqueta pared izquierda: tarrajeo */}
            <rect x="52" y="120" width="90" height="30" rx="4" fill="#0b1329" stroke="#38bdf8" strokeWidth="1" />
            <text x="97" y="133" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              TARRAJEO
            </text>
            <text x="97" y="145" fill="#94a3b8" fontSize="8.5" fontFamily="monospace" textAnchor="middle">
              {aTarr || '—'} m² · {eTarr} cm
            </text>
          </svg>
        </div>
      ) : (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: 6 }}>
              🧱 Tarrajeo habitual
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              En muro de ladrillo el tarrajeo va de 1.5 cm (una mano de regule +
              acabado). Para paredes de ladrillo visto no se tarrajea la cara
              expuesta — recuerda descontarla del área.
            </div>
          </div>
          <div style={{ border: '1px solid #0284c7', borderRadius: 8, padding: '10px 12px', background: 'rgba(56, 189, 248, 0.08)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              🎨 Pintura y cerámico
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              Lo usual: 2 manos de pinturalatex o vinílica (≈30 m² por galón).
              Para el cerámico deja entre 5% y 10% de desperdicio por cortes —
              el cálculo ya lo incluye con el porcentaje que indiques.
            </div>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
            Valores de referencia habituales en obra peruana.
          </div>
        </div>
      )}
    </ViewerShell>
  );
};
