import React, { useState } from 'react';
import { calcular } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { AcabadosVista } from '../components/AcabadosVista';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('acabados');

export const CalcAcabados: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [aTarr, setATarr]   = useState('');
  const [aPint, setAPint]   = useState('');
  const [aPiso, setAPiso]   = useState('');
  const [avanzado, setAvanzado] = useState(false);
  const [eTarr, setETarr]   = useState('1.5');
  const [manos, setManos]   = useState('2');
  const [rendP, setRendP]   = useState('30');
  const [perd, setPerd]     = useState('5');
  const [contra, setContra] = useState<'si'|'no'>('si');
  const [eContra, setEContra] = useState('4');
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError]   = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);

  function cargarEjemplo() {
    setATarr('60'); setAPint('60'); setAPiso('20');
    setETarr('1.5'); setManos('2'); setRendP('30');
    setPerd('10'); setContra('si'); setEContra('4');
    setEsEjemplo(true); setResultado(null); setError('');
  }

  function calcular_() {
    setError(''); setResultado(null);
    const r = calcular('acabados', {
      aTarr: Number(aTarr), eTarr: Number(eTarr),
      aPint: Number(aPint), manos: Number(manos), rendP: Number(rendP),
      aPiso: Number(aPiso), perd: Number(perd), contra, eContra: Number(eContra),
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

      <AcabadosVista
        aTarr={Number(aTarr) || 0}
        aPint={Number(aPint) || 0}
        aPiso={Number(aPiso) || 0}
        contra={contra}
        eContra={Number(eContra) || 0}
        eTarr={Number(eTarr) || 0}
        manos={Number(manos) || 0}
        rendP={Number(rendP) || 0}
      />

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>
        <div className="campo">
          <label>¿Cuántos m² va a tarrajear? <span className="unidad">(m²)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 60" value={aTarr} onChange={e => { setATarr(e.target.value); reset(); }} />
        </div>
        <div className="campo">
          <label>¿Cuántos m² va a pintar? <span className="unidad">(m²)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 60" value={aPint} onChange={e => { setAPint(e.target.value); reset(); }} />
        </div>
        <div className="campo">
          <label>¿Cuántos m² de piso (cerámico)? <span className="unidad">(m²)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 20" value={aPiso} onChange={e => { setAPiso(e.target.value); reset(); }} />
        </div>

        <div className="campo">
          <label>¿Va a poner contrapiso?</label>
          <div className="btn-row">
            {([['si','Sí'],['no','No']] as const).map(([v, label]) => (
              <button key={v} className={`aparejo-btn ${contra === v ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => { setContra(v); reset(); }}>
                <span className="ap-label">{label}</span>
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
              <label>Espesor del tarrajeo <span className="unidad">(cm)</span></label>
              <input type="number" inputMode="decimal" placeholder="Usual: 1.5" value={eTarr} onChange={e => { setETarr(e.target.value); reset(); }} />
            </div>
            <div className="campo">
              <label>Manos de pintura</label>
              <input type="number" inputMode="decimal" placeholder="Usual: 2" value={manos} onChange={e => { setManos(e.target.value); reset(); }} />
            </div>
            <div className="campo">
              <label>Rendimiento de pintura <span className="unidad">(m²/gal)</span></label>
              <input type="number" inputMode="decimal" placeholder="Usual: 30" value={rendP} onChange={e => { setRendP(e.target.value); reset(); }} />
            </div>
            <div className="campo">
              <label>Desperdicio de cerámico <span className="unidad">(%)</span></label>
              <input type="number" inputMode="decimal" placeholder="Usual: 5" value={perd} onChange={e => { setPerd(e.target.value); reset(); }} />
            </div>
            {contra === 'si' && (
              <div className="campo" style={{ gridColumn: 'span 2' }}>
                <label>Espesor del contrapiso <span className="unidad">(cm)</span></label>
                <input type="number" inputMode="decimal" placeholder="Usual: 4" value={eContra} onChange={e => { setEContra(e.target.value); reset(); }} />
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="aviso bad" style={{ marginBottom: 12 }}><span className="aviso-icon">🔴</span>{error}</div>}
      <button className="btn-primary" onClick={calcular_} disabled={!aTarr && !aPint && !aPiso}>Calcular materiales</button>
      {resultado && <div style={{ marginTop: 20 }}><Resultado resultado={resultado} idCalc="acabados" esEjemplo={esEjemplo} /></div>}
    </div>
  );
};
