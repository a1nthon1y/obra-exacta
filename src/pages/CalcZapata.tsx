import React, { useState } from 'react';
import { calcular, dimensionarZapata } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { ZapataViewer3D } from '../components/ZapataViewer3D';
import { FC_OPCIONES, FC_AYUDA } from '../utils/fcOpciones';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('zapata');

const EJEMPLO: any = {
  zapata: { bCol: 30, hCol: 30, carga: 15, suelo: 'intermedio', pa: 1.2, espesor: 40, dVar: '5/8', fc: 210, cant: 4 }
};

const SUELOS = [
  { valor: 'blando',     label: 'Blando',     detalle: '0.80 kg/cm²' },
  { valor: 'intermedio', label: 'Intermedio', detalle: '1.20 kg/cm²' },
  { valor: 'duro',       label: 'Duro',       detalle: '2.00 kg/cm²' },
  { valor: 'manual',     label: 'Otro',       detalle: 'ingresar pa' },
] as const;

export const CalcZapata: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [bCol, setBCol] = useState('');
  const [hCol, setHCol] = useState('');
  const [carga, setCarga] = useState('');
  const [suelo, setSuelo] = useState<'blando' | 'intermedio' | 'duro' | 'manual'>('intermedio');
  const [pa, setPa] = useState('1.2');
  const [espesor, setEspesor] = useState('40');
  const [dVar, setDVar] = useState('5/8');
  const [fc, setFc] = useState<210 | 175 | 140 | 245 | 280>(210);
  const [cant, setCant] = useState('1');
  const [avanzado, setAvanzado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError] = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [campoActivo, setCampoActivo] = useState<string | null>(null);

  const reset = () => setEsEjemplo(false);

  function cargarEjemplo() {
    const e = EJEMPLO.zapata;
    setBCol(String(e.bCol)); setHCol(String(e.hCol));
    setCarga(String(e.carga)); setSuelo(e.suelo); setPa(String(e.pa));
    setEspesor(String(e.espesor)); setDVar(e.dVar); setFc(e.fc); setCant(String(e.cant));
    setAvanzado(false);
    setEsEjemplo(true); setResultado(null); setError('');
  }

  function calcular_() {
    setError(''); setResultado(null);
    const r = calcular('zapata', {
      tipo: 'aislada',
      bCol: Number(bCol), hCol: Number(hCol),
      carga: Number(carga),
      suelo,
      pa: suelo === 'manual' ? Number(pa) : 0,
      espesor: Number(espesor),
      dVar,
      fc,
      cant: Number(cant),
    } as any);
    if ('error' in r) { setError(r.error); return; }
    setResultado(r);
  }

  // Vista previa: usa EXACTAMENTE el mismo dimensionado que el motor,
  // así el 3D y el plano muestran la zapata que sale en el resultado.
  const nBCol = Number(bCol) || 0;
  const nHCol = Number(hCol) || 0;
  const nCarga = Number(carga) || 0;
  const nEspesor = Number(espesor) || 0;
  const nCant = Number(cant) || 0;
  const paManual = Number(pa) || 0;

  const dim = nBCol > 0 && nHCol > 0 && nCarga > 0
    ? dimensionarZapata({
        bCol: nBCol, hCol: nHCol, carga: nCarga, suelo, pa: paManual,
        espesor: nEspesor,
      })
    : null;
  const ladoZap = dim && !('error' in dim) ? dim.lado : 1.0;
  const espesorM = dim && !('error' in dim) ? dim.espesor : (nEspesor || 40) / 100;

  const puedeCalcular = !!bCol && !!hCol && !!carga && !!cant && (suelo !== 'manual' || !!pa);

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapa.icon} {etapa.tituloCalc}</div>
      </div>

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      <ZapataViewer3D
        bCol={nBCol}
        hCol={nHCol}
        bZap={ladoZap}
        hZap={ladoZap}
        espesor={espesorM}
        carga={nCarga}
        cant={nCant}
        campoActivo={campoActivo}
      />

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>

        <div className="campo">
          <label>¿Cuántas zapatas vas a vaciar? <span className="unidad">(und)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 4" value={cant}
            onFocus={() => setCampoActivo('cant')} onBlur={() => setCampoActivo(null)}
            onChange={e => { setCant(e.target.value); reset(); }} />
        </div>

        <div className="form-grid-2">
          <div className="campo">
            <label>¿Cuánto mide la base de la columna? <span className="unidad">(cm)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 30" value={bCol}
              onFocus={() => setCampoActivo('bCol')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setBCol(e.target.value); reset(); }} />
          </div>
          <div className="campo">
            <label>¿Y el otro lado de la columna? <span className="unidad">(cm)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 30" value={hCol}
              onFocus={() => setCampoActivo('hCol')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setHCol(e.target.value); reset(); }} />
          </div>
        </div>

        <div className="campo">
          <label>¿Cuánta carga baja por la columna? <span className="unidad">(toneladas)</span></label>
          <input type="number" inputMode="decimal" placeholder="Ej: 15" value={carga}
            onFocus={() => setCampoActivo('carga')} onBlur={() => setCampoActivo(null)}
            onChange={e => { setCarga(e.target.value); reset(); }} />
          <div style={{ fontSize: '0.68rem', color: 'var(--c-muted)', marginTop: 4 }}>
            Peso de lo que apoya en la columna (vigas + techo + uso). Si no lo sabes, 15 tn sirve para una casa de 1 piso.
          </div>
        </div>

        <div className="campo">
          <label>¿Qué tipo de suelo hay?</label>
          <div className="form-grid-2">
            {SUELOS.map(s => (
              <button
                key={s.valor}
                type="button"
                className={`aparejo-btn ${suelo === s.valor ? 'active' : ''}`}
                onClick={() => { setSuelo(s.valor); reset(); }}
              >
                <span className="ap-label" style={{ fontSize: '0.76rem' }}>{s.label}</span>
                <span style={{ fontSize: '0.64rem', color: 'var(--c-muted)' }}>{s.detalle}</span>
              </button>
            ))}
          </div>
        </div>

        {suelo === 'manual' && (
          <div className="campo">
            <label>Presión admisible del suelo (pa) <span className="unidad">(kg/cm²)</span></label>
            <input type="number" inputMode="decimal" placeholder="Ej: 1.0" value={pa}
              onFocus={() => setCampoActivo('suelo')} onBlur={() => setCampoActivo(null)}
              onChange={e => { setPa(e.target.value); reset(); }} />
          </div>
        )}

        <div className="campo">
          <label>¿Qué espesor tendrá la zapata? <span className="unidad">(cm)</span></label>
          <input type="number" inputMode="decimal" placeholder="Usual: 40" value={espesor}
            onFocus={() => setCampoActivo('espesor')} onBlur={() => setCampoActivo(null)}
            onChange={e => { setEspesor(e.target.value); reset(); }} />
        </div>

        <button className="avanzado-toggle" onClick={() => setAvanzado(a => !a)}>
          {avanzado ? '▲' : '▼'} Ajustes avanzados
        </button>
        {avanzado && (
          <div className="form-grid-2">
            <div className="campo">
              <label>Varilla de la malla <span className="unidad">(diámetro)</span></label>
              <select value={dVar} onChange={e => { setDVar(e.target.value); reset(); }}>
                <option value="1/2">Ø 1/2"</option>
                <option value="5/8">Ø 5/8"</option>
                <option value="3/4">Ø 3/4"</option>
              </select>
            </div>
            <div className="campo">
              <label>Resistencia del concreto <span className="unidad">(kg/cm²)</span></label>
              <select value={fc} onChange={e => { setFc(Number(e.target.value) as 140 | 175 | 210 | 245 | 280); reset(); }}>
                {FC_OPCIONES.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
              <div style={{ fontSize: '0.68rem', color: 'var(--c-muted)', marginTop: 4 }}>{FC_AYUDA}</div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="aviso bad" style={{ marginBottom: 12 }}><span className="aviso-icon">🔴</span>{error}</div>}

      <button className="btn-primary" onClick={calcular_} disabled={!puedeCalcular}>
        Calcular materiales
      </button>

      {resultado && <div style={{ marginTop: 20 }}><Resultado resultado={resultado} idCalc="zapata" esEjemplo={esEjemplo} /></div>}
    </div>
  );
};
