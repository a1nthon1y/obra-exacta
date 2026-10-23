import React from 'react';

/**
 * Chrome común de los visores (tarjeta, barra con pestañas, tira de
 * medidas, HUD de "editando" y controles de giro). Mismo aspecto que
 * CimientoViewer3D / MuroViewer3D para que toda la app sea consistente.
 */

export interface ShellBadge {
  id: string;
  icon: string;
  label: string;
  value: string;
  tone?: 'cyan' | 'amber';
}

export interface ShellTab {
  id: string;
  label: string;
}

interface Props {
  icon: string;
  titulo: string;
  tabs: ShellTab[];
  tab: string;
  onTab: (id: string) => void;
  badges?: ShellBadge[];
  /** Texto del HUD "📍 Editando: …" (solo sobre el canvas 3D) */
  hudTexto?: string | null;
  /** Botón de auto-rotación (solo sobre el canvas 3D) */
  autoRotar?: boolean;
  onToggleRotar?: () => void;
  /** true cuando el contenido activo es el canvas 3D (para HUD/rotación) */
  esCanvas3D?: boolean;
  children: React.ReactNode;
}

export const ViewerShell: React.FC<Props> = ({
  icon,
  titulo,
  tabs,
  tab,
  onTab,
  badges,
  hudTexto,
  autoRotar,
  onToggleRotar,
  esCanvas3D,
  children,
}) => (
  <div className="viewer-card">
    <div className="viewer-bar">
      <div className="viewer-title">
        <span>{icon}</span> {titulo}
      </div>
      <div className="viewer-toggles">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            className={`viewer-toggle-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>

    {badges && badges.length > 0 && (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '8px 12px',
          background: 'rgba(9, 11, 16, 0.95)',
          borderBottom: '1px solid #333a47',
        }}
      >
        {badges.map(b => (
          <span
            key={b.id}
            className={`viewer-badge ${b.tone ?? 'cyan'}`}
            style={{ transition: 'all 0.2s' }}
          >
            <span className="viewer-badge-dot"></span>
            <span>
              {b.icon} {b.label}: <strong>{b.value}</strong>
            </span>
          </span>
        ))}
      </div>
    )}

    <div style={{ position: 'relative' }}>
      {children}

      {esCanvas3D && hudTexto && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            background: 'rgba(245, 158, 11, 0.92)',
            color: '#0f172a',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          📍 Editando: {hudTexto}
        </div>
      )}

      {esCanvas3D && onToggleRotar && (
        <div className="viewer-footer-controls">
          <button type="button" className="viewer-btn-ctrl" onClick={onToggleRotar}>
            {autoRotar ? '⏸ Detener giro' : '⟳ Auto-rotar'}
          </button>
          <span className="viewer-hint">🖱️ Arrastra para girar • Rueda para zoom</span>
        </div>
      )}
    </div>
  </div>
);
