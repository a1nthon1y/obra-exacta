import React, { useState } from 'react';
import { calcular } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { VigaViewer3D } from '../components/VigaViewer3D';
import { LosaViewer3D } from '../components/LosaViewer3D';
import { FC_OPCIONES, FC_AYUDA } from '../utils/fcOpciones';
import { getEtapa } from '../config/etapas';

const etapaVigas = getEtapa('vigas');
const etapaLosa = getEtapa('losa');

const DIAMETROS = ['3/8', '1/2', '5/8', '3/4', '1/4'] as const;

export const CalcVigas: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [b, setB]         = useState('');
  const [h, setH]         = useState('');
  const [luz, setLuz]     = useState('');
  const [cant, setCant]   = useState('');
  const [nSup, setNSup]   = useState('2');
  const [dSup, setDSup]   = useState<string>('1/2');
  const [nInf, setNInf]   = useState('3');
  const [dInf, setDInf]   = useState<string>('1/2');
  const [dEst, setDEst]   = useState<string>('3/8');
  const [avanzado, setAvanzado] = useState(false);
  const [rec, setRec]     = useState('4');
  const [fc, setFc]       = useState<140|175|210|245|280>(210);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError]       = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [campoActivo, setCampoActivo] = useState<string | null>(null);

  function cargarEjemplo() {
    setB('25'); setH('40'); setLuz('4'); setCant('4');
    setNSup('2'); setDSup('1/2'); setNInf('3'); setDInf('1/2');
    setDEst('3/8'); setRec('4'); setFc(210);
    setEsEjemplo(true); setResultado(null); setError('');
  }

  function calcular_() {
    setError(''); setResultado(null);
    const r = calcular('vigas', {
      b: Number(b), h: Number(h), luz: Number(luz), cant: Number(cant),
      nSup: Number(nSup), dSup, nInf: Number(nInf), dInf,
      dEst, rec: Number(rec), fc,
    });
    if ('error' in r) { setError(r.error); return; }
    setResultado(r);
  }

  const reset = () => setEsEjemplo(false);

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapaVigas.icon} {etapaVigas.tituloCalc}</div>
      </div>

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      <VigaViewer3D
        b={Number(b) || 0}
        h={Number(h) || 0}
        luz={Number(luz) || 0}
        nSup={Number(nSup) || 0}
        dSup={dSup}
        nInf={Number(nInf) || 0}
        dInf={dInf}
        dEst={dEst}
        rec={Number(rec) || 0}
        campoActivo={campoActivo}
      />

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>
        <div className="campo">
          <label>¿Cuántas vigas? <span className="unidad">(und)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 4" value={cant} onChange={e => { setCant(e.target.value); reset(); }} />
        </div>
        <div className="campo">
          <label>¿Cuántos metros mide la viga de largo? <span className="unidad">(m)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 4" value={luz}
            onFocus={() => setCampoActivo('luz')} onBlur={() => setCampoActivo(null)}
            onChange={e => { setLuz(e.target.value); reset(); }} />
        </div>
        <div className="form-grid-2">
          <div className="campo">
            <label>¿Cuánto mide la base? <span className="unidad">(cm)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 25" value={b}
              onFocus={() => setCampoActivo('b')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setB(e.target.value); reset(); }} />
          </div>
          <div className="campo">
            <label>¿Cuánto mide de alto (peralte)? <span className="unidad">(cm)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 40" value={h}
              onFocus={() => setCampoActivo('h')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setH(e.target.value); reset(); }} />
          </div>
        </div>

        <div className="campo">
          <label>Fierro de arriba — varillas y diámetro</label>
          <div className="form-grid-2">
            <input type="number" inputMode="decimal" placeholder="Cantidad" value={nSup}
              onFocus={() => setCampoActivo('nSup')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setNSup(e.target.value); reset(); }} />
            <select value={dSup}
              onFocus={() => setCampoActivo('dSup')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setDSup(e.target.value); reset(); }}>
              {DIAMETROS.map(d => <option key={d} value={d}>{d}"</option>)}
            </select>
          </div>
        </div>

        <div className="campo">
          <label>Fierro de abajo — varillas y diámetro</label>
          <div className="form-grid-2">
            <input type="number" inputMode="decimal" placeholder="Cantidad" value={nInf}
              onFocus={() => setCampoActivo('nInf')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setNInf(e.target.value); reset(); }} />
            <select value={dInf}
              onFocus={() => setCampoActivo('dInf')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setDInf(e.target.value); reset(); }}>
              {DIAMETROS.map(d => <option key={d} value={d}>{d}"</option>)}
            </select>
          </div>
        </div>

        <button className="avanzado-toggle" onClick={() => setAvanzado(a => !a)}>
          {avanzado ? '▲' : '▼'} Ajustes avanzados
        </button>
        {avanzado && (
          <div className="form-grid-2">
            <div className="campo">
              <label>Estribo <span className="unidad">(diámetro)</span></label>
              <select value={dEst} onChange={e => { setDEst(e.target.value); reset(); }}>
                {DIAMETROS.map(d => <option key={d} value={d}>{d}"</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Recubrimiento <span className="unidad">(cm)</span></label>
              <input type="number" inputMode="decimal" placeholder="Usual: 4" value={rec} onChange={e => { setRec(e.target.value); reset(); }} />
            </div>
            <div className="campo" style={{ gridColumn: 'span 2' }}>
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
      <button className="btn-primary" onClick={calcular_} disabled={!b || !h || !luz || !cant}>Calcular materiales</button>
      {resultado && <div style={{ marginTop: 20 }}><Resultado resultado={resultado} idCalc="vigas" esEjemplo={esEjemplo} /></div>}
    </div>
  );
};

// ─── Losa ──────────────────────────────────────────────────────────────────────
export const CalcLosa: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [largo, setLargo]   = useState('');
  const [ancho, setAncho]   = useState('');
  const [espesor, setEspesor] = useState<'auto'|17|20|25|30>('auto');
  const [fc, setFc]         = useState<140|175|210|245|280>(210);
  const [nInf, setNInf]     = useState('2');
  const [dInf, setDInf]     = useState<string>('1/2');
  const [nBast, setNBast]   = useState('1');
  const [dBast, setDBast]   = useState<string>('3/8');
  const [avanzado, setAvanzado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError]       = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [campoActivo, setCampoActivo] = useState<string | null>(null);

  function cargarEjemplo() {
    setLargo('4'); setAncho('3.5'); setEspesor('auto'); setFc(210);
    setNInf('2'); setDInf('1/2'); setNBast('1'); setDBast('3/8');
    setEsEjemplo(true); setResultado(null); setError('');
  }

  function calcular_() {
    setError(''); setResultado(null);
    const r = calcular('losa', {
      largo: Number(largo), ancho: Number(ancho),
      espesor, fc, nInf: Number(nInf), dInf,
      nBast: Number(nBast), dBast,
    });
    if ('error' in r) { setError(r.error); return; }
    setResultado(r);
  }

  const reset = () => setEsEjemplo(false);

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapaLosa.icon} {etapaLosa.tituloCalc}</div>
      </div>

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      <LosaViewer3D
        largo={Number(largo) || 0}
        ancho={Number(ancho) || 0}
        espesor={espesor === 'auto' ? 0 : Number(espesor)}
        campoActivo={campoActivo}
      />

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>
        <div className="form-grid-2">
          <div className="campo">
            <label>¿Cuántos metros mide de largo? <span className="unidad">(m)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 4" value={largo}
              onFocus={() => setCampoActivo('largo')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setLargo(e.target.value); reset(); }} />
          </div>
          <div className="campo">
            <label>¿Cuántos metros mide de ancho? <span className="unidad">(m)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 3.5" value={ancho}
              onFocus={() => setCampoActivo('ancho')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setAncho(e.target.value); reset(); }} />
          </div>
        </div>

        <div className="campo">
          <label>Espesor de la losa</label>
          <div className="aparejo-grid">
            {(['auto',17,20,25,30] as const).map(v => (
              <button key={v} className={`aparejo-btn ${espesor === v ? 'active' : ''}`} onClick={() => { setEspesor(v); reset(); }}>
                <span className="ap-label">{v === 'auto' ? 'Automático' : `${v} cm`}</span>
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
              <label>Varillas de vigueta <span className="unidad">(und)</span></label>
              <input type="number" inputMode="decimal" placeholder="2" value={nInf} onChange={e => { setNInf(e.target.value); reset(); }} />
            </div>
            <div className="campo">
              <label>Diámetro</label>
              <select value={dInf} onChange={e => { setDInf(e.target.value); reset(); }}>
                {(['3/8','1/2','5/8'] as const).map(d => <option key={d} value={d}>{d}"</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Bastones <span className="unidad">(und)</span></label>
              <input type="number" inputMode="decimal" placeholder="1" value={nBast} onChange={e => { setNBast(e.target.value); reset(); }} />
            </div>
            <div className="campo">
              <label>Diámetro</label>
              <select value={dBast} onChange={e => { setDBast(e.target.value); reset(); }}>
                {(['3/8','1/2'] as const).map(d => <option key={d} value={d}>{d}"</option>)}
              </select>
            </div>
            <div className="campo" style={{ gridColumn: 'span 2' }}>
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
      <button className="btn-primary" onClick={calcular_} disabled={!largo || !ancho}>Calcular materiales</button>
      {resultado && <div style={{ marginTop: 20 }}><Resultado resultado={resultado} idCalc="losa" esEjemplo={esEjemplo} /></div>}
    </div>
  );
};
