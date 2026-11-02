import React, { useState } from 'react';
import { calcular } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { CimientoViewer3D } from '../components/CimientoViewer3D';
import { ProyectoActivoBar } from '../components/ProyectoActivoBar';
import { ViewerEspera } from '../components/ViewerEspera';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('cimientos');

const EJEMPLO: Record<string, object> = {
  cimientos: { largo: 30, ancho: 0.6, prof: 1.0, esp: 0.15, alto: 0.4, altoCimiento: 0.5 },
};

export const CalcCimientos: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [largo, setLargo]   = useState('');
  const [ancho, setAncho]   = useState('');
  const [prof, setProf]     = useState('');
  const [esp, setEsp]       = useState('0.15');
  const [alto, setAlto]     = useState('0.4');
  const [altoCimiento, setAltoCimiento] = useState('');
  const [campoActivo, setCampoActivo] = useState<string | null>(null);
  const [avanzado, setAvanzado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError]   = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);

  const reset = () => setEsEjemplo(false);

  function cargarEjemplo() {
    const e = EJEMPLO.cimientos as any;
    setLargo(String(e.largo)); setAncho(String(e.ancho));
    setProf(String(e.prof));   setEsp(String(e.esp)); setAlto(String(e.alto)); setAltoCimiento(String(e.altoCimiento));
    setEsEjemplo(true); setResultado(null); setError('');
  }

  function calcular_() {
    setError(''); setResultado(null);
    const r = calcular('cimientos', {
      largo: Number(largo), ancho: Number(ancho),
      prof: Number(prof), esp: Number(esp), alto: Number(alto),
      altoCimiento: Number(altoCimiento) || undefined,
    });
    if ('error' in r) { setError(r.error); return; }
    setResultado(r);
  }

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapa.icon} {etapa.tituloCalc}</div>
      </div>

      <ProyectoActivoBar />

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      {Number(largo) > 0 && Number(ancho) > 0 && Number(prof) > 0 && Number(alto) > 0 ? (
        <CimientoViewer3D
          largo={Number(largo) || 0}
          ancho={Number(ancho) || 0}
          prof={Number(prof) || 0}
          esp={Number(esp) || 0}
          alto={Number(alto) || 0}
          altoCimiento={Number(altoCimiento) || Math.min(0.5, Number(prof) || 0.5)}
          campoActivo={campoActivo}
        />
      ) : (
        <ViewerEspera
          icon={etapa.icon}
          titulo={etapa.tituloVisor}
          mensaje="Ingresa largo, ancho, profundidad de zanja y alto del sobrecimiento. El visor mostrará el cimiento en el fondo de la zanja, no medidas de ejemplo."
        />
      )}

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>
        <div className="campo">
          <label>¿Cuántos metros mide el cimiento de largo? <span className="unidad">(m)</span></label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Ej: 30"
            value={largo}
            onFocus={() => setCampoActivo('largo')}
            onBlur={() => setCampoActivo(null)}
            onChange={e => { setLargo(e.target.value); reset(); }}
          />
        </div>
        <div className="campo">
          <label>¿Qué tan ancho va el cimiento? <span className="unidad">(m)</span></label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Ej: 0.6"
            value={ancho}
            onFocus={() => setCampoActivo('ancho')}
            onBlur={() => setCampoActivo(null)}
            onChange={e => { setAncho(e.target.value); reset(); }}
          />
        </div>
        <div className="campo">
          <label>¿Qué tan profundo se va a cavar? <span className="unidad">(m)</span></label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Ej: 1.0"
            value={prof}
            onFocus={() => setCampoActivo('prof')}
            onBlur={() => setCampoActivo(null)}
            onChange={e => { setProf(e.target.value); reset(); }}
          />
        </div>
        <div className="campo">
          <label>¿Qué tan alto va el sobrecimiento? <span className="unidad">(m, visible sobre el terreno)</span></label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Ej: 0.4"
            value={alto}
            onFocus={() => setCampoActivo('alto')}
            onBlur={() => setCampoActivo(null)}
            onChange={e => { setAlto(e.target.value); reset(); }}
          />
        </div>

        <button className="avanzado-toggle" onClick={() => setAvanzado(a => !a)}>
          {avanzado ? '▲' : '▼'} Ajustes avanzados
        </button>
        {avanzado && (
          <>
            <div className="campo">
              <label>Espesor del sobrecimiento <span className="unidad">(m)</span></label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Usual: 0.15"
                value={esp}
                onFocus={() => setCampoActivo('esp')}
                onBlur={() => setCampoActivo(null)}
                onChange={e => { setEsp(e.target.value); reset(); }}
              />
            </div>
            <div className="campo">
              <label>Altura del cimiento ciclópeo <span className="unidad">(m)</span></label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Usual: 0.50 (se ajusta a la zanja)"
                value={altoCimiento}
                onFocus={() => setCampoActivo('altoCimiento')}
                onBlur={() => setCampoActivo(null)}
                onChange={e => { setAltoCimiento(e.target.value); reset(); }}
              />
            </div>
          </>
        )}
      </div>

      {error && <div className="aviso bad" style={{ marginBottom: 12 }}><span className="aviso-icon">🔴</span>{error}</div>}

      <button className="btn-primary" onClick={calcular_} disabled={!largo || !ancho || !prof || !alto}>
        Calcular materiales
      </button>

      {resultado && <div style={{ marginTop: 20 }}><Resultado resultado={resultado} idCalc="cimientos" esEjemplo={esEjemplo} /></div>}
    </div>
  );
};
