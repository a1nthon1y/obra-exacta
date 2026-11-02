import React, { Suspense, useState } from 'react';
import { calcular } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { ProyectoActivoBar } from '../components/ProyectoActivoBar';
import { ViewerCargando } from '../components/ViewerCargando';
import { ViewerEspera } from '../components/ViewerEspera';
import { FC_OPCIONES, FC_AYUDA } from '../utils/fcOpciones';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('escalera');

const EscaleraViewer3D = React.lazy(() =>
  import('../components/EscaleraViewer3D').then(m => ({ default: m.EscaleraViewer3D }))
);

const HUELLAS = ['auto', 26, 27, 28] as const;

export const CalcEscalera: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [altura, setAltura] = useState('');
  const [ancho, setAncho]   = useState('');
  const [huella, setHuella] = useState<'auto' | 26 | 27 | 28>('auto');
  const [lanza, setLanza]   = useState('15');
  const [fc, setFc]         = useState<140|175|210|245|280>(210);
  const [avanzado, setAvanzado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError]       = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [campoActivo, setCampoActivo] = useState<string | null>(null);

  const huellaCm = huella === 'auto' ? 27 : huella;

  function cargarEjemplo() {
    setAltura('2.8'); setAncho('0.9'); setHuella('auto'); setLanza('15'); setFc(210);
    setEsEjemplo(true); setResultado(null); setError('');
  }

  function calcular_() {
    setError(''); setResultado(null);
    const r = calcular('escalera', {
      altura: Number(altura), ancho: Number(ancho),
      huella, lanza: Number(lanza) || 15, fc,
    });
    if ('error' in r) { setError(r.error); return; }
    setResultado(r);
  }

  const reset = () => setEsEjemplo(false);

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapa.icon} {etapa.tituloCalc}</div>
      </div>

      <ProyectoActivoBar />

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      {Number(altura) > 0 && Number(ancho) > 0 ? (
        <Suspense fallback={<ViewerCargando icon={etapa.icon} titulo={etapa.tituloVisor} />}>
          <EscaleraViewer3D
            altura={Number(altura) || 0}
            ancho={Number(ancho) || 0}
            huellaCm={huellaCm}
            lanzaCm={Number(lanza) || 15}
            campoActivo={campoActivo}
          />
        </Suspense>
      ) : (
        <ViewerEspera
          icon={etapa.icon}
          titulo={etapa.tituloVisor}
          mensaje="Ingresa la altura entre pisos y el ancho de la escalera. El visor mostrará tus escalones, no medidas de ejemplo."
        />
      )}

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>
        <div className="form-grid-2">
          <div className="campo">
            <label>Altura entre pisos <span className="unidad">(m)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 2.80" value={altura}
              onFocus={() => setCampoActivo('altura')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setAltura(e.target.value); reset(); }} />
          </div>
          <div className="campo">
            <label>Ancho de la escalera <span className="unidad">(m)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 0.90" value={ancho}
              onFocus={() => setCampoActivo('ancho')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setAncho(e.target.value); reset(); }} />
          </div>
        </div>

        <div className="campo">
          <label>Huella del escalón <span className="unidad">(donde pones el pie)</span></label>
          <div className="aparejo-grid">
            {HUELLAS.map(v => (
              <button key={v} className={`aparejo-btn ${huella === v ? 'active' : ''}`}
                onClick={() => { setHuella(v); setCampoActivo('huella'); reset(); }}>
                <span className="ap-label">{v === 'auto' ? 'Automática 27' : `${v} cm`}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="avanzado-toggle" onClick={() => setAvanzado(a => !a)}>
          {avanzado ? '▲' : '▼'} Ajustes avanzados
        </button>
        {avanzado && (
          <div className="form-grid-2" style={{ marginTop: 8 }}>
            <div className="campo">
              <label>Espesor de la losa (lanza) <span className="unidad">(cm)</span></label>
              <input type="number" inputMode="decimal" placeholder="Usual: 15" value={lanza}
                onFocus={() => setCampoActivo('lanza')} onBlur={() => setCampoActivo(null)}
                onChange={e => { setLanza(e.target.value); reset(); }} />
              <div className="form-hint">En vivienda va de 12 a 15 cm. Más espesor significa más concreto.</div>
            </div>
            <div className="campo">
              <label>Resistencia del concreto <span className="unidad">(kg/cm²)</span></label>
              <select value={fc} onChange={e => { setFc(Number(e.target.value) as 140|175|210|245|280); reset(); }}>
                {FC_OPCIONES.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
              <div style={{ fontSize: '0.68rem', color: 'var(--c-muted)', marginTop: 4 }}>{FC_AYUDA}</div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="aviso bad" style={{ marginBottom: 12 }}><span className="aviso-icon">🔴</span>{error}</div>}
      <button className="btn-primary" onClick={calcular_} disabled={!altura || !ancho}>Calcular materiales</button>
      {resultado && <div style={{ marginTop: 20 }}><Resultado resultado={resultado} idCalc="escalera" esEjemplo={esEjemplo} /></div>}
    </div>
  );
};
