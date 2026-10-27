import React from 'react';

interface Props {
  /** Icono de la etapa, para que la espera mantenga la misma identidad del visor. */
  icon: string;
  /** Título de la barra del visor. */
  titulo: string;
  /** Explicación corta de qué falta para activar el visor. */
  mensaje: string;
  /** Alto del área de espera; 320 es el mismo alto útil de los visores. */
  height?: number;
}

/**
 * Estado vacío común de los visores.
 *
 * No dibujamos geometría de ejemplo ni calculamos advertencias con valores por
 * defecto: el visor aparece recién cuando el usuario ingresó sus medidas.
 */
export const ViewerEspera: React.FC<Props> = ({ icon, titulo, mensaje, height = 320 }) => (
  <div className="viewer-card" style={{ marginBottom: 14 }}>
    <div className="viewer-bar">
      <div className="viewer-title">
        <span>{icon}</span> {titulo}
      </div>
      <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
        Sin medidas
      </span>
    </div>

    <div
      style={{
        height,
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
      <div style={{ fontSize: '2rem' }} aria-hidden="true">📐</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginTop: 8 }}>
        El visor se activa con tus medidas
      </div>
      <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.55, maxWidth: 300, marginTop: 6 }}>
        {mensaje}
      </div>
    </div>
  </div>
);
