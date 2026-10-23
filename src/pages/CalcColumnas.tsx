import React, { useState } from 'react';
import { calcular } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { ColumnaViewer3D } from '../components/ColumnaViewer3D';
import { FC_OPCIONES, FC_AYUDA } from '../utils/fcOpciones';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('columnas');

const DIAMETROS = ['3/8', '1/2', '5/8', '3/4', '1/4'] as const;

export const CalcColumnas: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [b, setB]       = useState('');
  const [h, setH]       = useState('');
  const [alto, setAlto] = useState('');
  const [cant, setCant] = useState('');
  const [nVar, setNVar] = useState('4');
  const [dVar, setDVar] = useState<string>('5/8');
  const [dEst, setDEst] = useState<string>('1/4');
  const [sis, setSis]   = useState<'confinada'|'porticos'>('confinada');
  const [avanzado, setAvanzado] = useState(false);
  const [rec, setRec]   = useState('4');
  const [fc, setFc]     = useState<140|175|210|245|280>(210);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError]       = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [campoActivo, setCampoActivo] = useState<string | null>(null);

  function cargarEjemplo() {
    setB('25'); setH('25'); setAlto('2.5'); setCant('6');
    setNVar('4'); setDVar('5/8'); setDEst('1/4'); setSis('confinada');
    setRec('4'); setFc(210);
    setEsEjemplo(true); setResultado(null); setError('');
  }

  function calcular_() {
    setError(''); setResultado(null);
    const r = calcular('columnas', {
      b: Number(b), h: Number(h), alto: Number(alto), cant: Number(cant),
      nVar: Number(nVar), dVar, dEst, rec: Number(rec), fc, sis,
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

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      <ColumnaViewer3D
        b={Number(b) || 0}
        h={Number(h) || 0}
        alto={Number(alto) || 0}
        nVar={Number(nVar) || 0}
        dVar={dVar}
        dEst={dEst}
        rec={Number(rec) || 0}
        campoActivo={campoActivo}
      />

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>
        <div className="campo">
          <label>¿Cuántas columnas? <span className="unidad">(und)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 6" value={cant} onChange={e => { setCant(e.target.value); reset(); }} />
        </div>
        <div className="form-grid-2">
          <div className="campo">
            <label>¿Cuánto mide la base? <span className="unidad">(cm)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 25" value={b}
              onFocus={() => setCampoActivo('b')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setB(e.target.value); reset(); }} />
          </div>
          <div className="campo">
            <label>¿Cuánto mide de largo? <span className="unidad">(cm)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 25" value={h}
              onFocus={() => setCampoActivo('h')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setH(e.target.value); reset(); }} />
          </div>
        </div>
        <div className="campo">
          <label>¿Qué tan alta es la columna? <span className="unidad">(m)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 2.5" value={alto}
            onFocus={() => setCampoActivo('alto')} onBlur={() => setCampoActivo(null)}
            onChange={e => { setAlto(e.target.value); reset(); }} />
        </div>

        <div className="campo">
          <label>Fierro — ¿cuántas varillas y de qué grosor?</label>
          <div className="form-grid-2">
            <input type="number" inputMode="decimal" placeholder="Cantidad de varillas" value={nVar}
              onFocus={() => setCampoActivo('nVar')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setNVar(e.target.value); reset(); }} />
            <select value={dVar}
              onFocus={() => setCampoActivo('dVar')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setDVar(e.target.value); reset(); }}>
              {DIAMETROS.map(d => <option key={d} value={d}>{d}"</option>)}
            </select>
          </div>
        </div>

        <div className="campo">
          <label>¿La columna está entre muros o es libre?</label>
          <div className="btn-row">
            {([['confinada','Entre muros (confinada)'],['porticos','Libre (pórtico)']] as const).map(([v, label]) => (
              <button key={v} className={`aparejo-btn ${sis === v ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => { setSis(v); reset(); }}>
                <span className="ap-label" style={{ fontSize: '0.76rem' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="avanzado-toggle" onClick={() => setAvanzado(a => !a)}>
          {avanzado ? '▲' : '▼'} Ajustes avanzados
        </button>
        {avanzado && (
          <div className="form-grid-2">
            <div className="campo">
              <label>Estribo <span className="unidad">(diámetro)</span></label>
              <select value={dEst}
                onFocus={() => setCampoActivo('dEst')} onBlur={() => setCampoActivo(null)}
                onChange={e => { setDEst(e.target.value); reset(); }}>
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
      <button className="btn-primary" onClick={calcular_} disabled={!b || !h || !alto || !cant}>Calcular materiales</button>
      {resultado && <div style={{ marginTop: 20 }}><Resultado resultado={resultado} idCalc="columnas" esEjemplo={esEjemplo} /></div>}
    </div>
  );
};
