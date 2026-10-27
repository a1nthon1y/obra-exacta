import React from 'react';
import { useObraStore } from '../store/obraStore';

/**
 * Contexto visible antes de calcular.
 *
 * Sin este bloque, una calculadora abierta dentro de un edificio de 3–5 pisos
 * se ve igual que una casa y la partida termina guardándose en el piso activo
 * sin que el usuario lo note.
 */
export const ProyectoActivoBar: React.FC = () => {
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const pisoActivo = useObraStore(s => s.pisoActivo);
  const setPisoActivo = useObraStore(s => s.setPisoActivo);

  const proyecto = proyectos.find(p => p.id === proyectoActivoId);
  if (!proyecto) return null;

  return (
    <div
      role="group"
      aria-label="Proyecto activo"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        background: 'var(--c-surface2)',
        border: '1.5px solid var(--c-accent)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
        marginBottom: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.66rem',
            color: 'var(--c-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Proyecto activo
        </div>
        <div
          style={{
            fontSize: '0.86rem',
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          🏢 {proyecto.nombre} · Piso {pisoActivo} de {proyecto.pisos}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--c-muted)', marginTop: 2 }}>
          Las partidas que guardes quedarán en este piso.
        </div>
      </div>

      <select
        aria-label="Piso activo del proyecto"
        value={pisoActivo}
        onChange={e => setPisoActivo(Number(e.target.value))}
        style={{
          background: 'var(--c-field)',
          border: '1.5px solid var(--c-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--c-text)',
          fontFamily: 'inherit',
          fontSize: '0.84rem',
          padding: '7px 8px',
          flexShrink: 0,
        }}
      >
        {Array.from({ length: proyecto.pisos }, (_, i) => i + 1).map(n => (
          <option key={n} value={n}>Piso {n}</option>
        ))}
      </select>
    </div>
  );
};
