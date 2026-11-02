import React from 'react';

interface Props {
  icon: string;
  titulo: string;
}

/**
 * Fallback mientras se descarga el chunk del visor 3D. Mantiene el mismo
 * marco visual para que el cambio no se sienta como un salto de layout.
 */
export const ViewerCargando: React.FC<Props> = ({ icon, titulo }) => (
  <div className="viewer-card" style={{ marginBottom: 14 }}>
    <div className="viewer-bar">
      <div className="viewer-title">
        <span>{icon}</span> {titulo}
      </div>
      <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
        Cargando…
      </span>
    </div>

    <div
      role="status"
      aria-live="polite"
      style={{
        height: 320,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '24px 18px',
        background: '#070b14',
        color: '#cbd5e1',
      }}
    >
      <div style={{ fontSize: '2rem' }} aria-hidden="true">⏳</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginTop: 8 }}>
        Cargando visor 3D…
      </div>
      <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.55, maxWidth: 300, marginTop: 6 }}>
        El cálculo no se detiene. El visor aparece apenas termina de cargar.
      </div>
    </div>
  </div>
);
