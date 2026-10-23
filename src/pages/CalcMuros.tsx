import React, { useState } from 'react';
import { calcular } from '../engine/calc';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { MuroViewer3D } from '../components/MuroViewer3D';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('muros');

export const CalcMuros: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [largo, setLargo]       = useState('');
  const [alto, setAlto]         = useState('');
  const [descontarVanos, setDescontarVanos] = useState(false);
  const [puertas, setPuertas]   = useState('0');
  const [altoP, setAltoP]       = useState('2.10');
  const [anchoP, setAnchoP]     = useState('0.90');
  const [ventanas, setVentanas] = useState('0');
  const [altoV, setAltoV]       = useState('1.20');
  const [anchoV, setAnchoV]     = useState('1.20');
  const [aparejo, setAparejo]   = useState<'soga'|'cabeza'|'canto'>('soga');
  const [ladrillo, setLadrillo] = useState<'kk18'|'pand'>('kk18');
  const [uso, setUso]           = useState<'portante'|'tabique'>('portante');
  const [campoActivo, setCampoActivo] = useState<string | null>(null);
  const [avanzado, setAvanzado] = useState(false);
  const [mezcla, setMezcla]     = useState('5');
  const [desL, setDesL]         = useState('5');
  const [desM, setDesM]         = useState('10');
  const [junta, setJunta]       = useState('1.5');
  const [lb, setLb] = useState('24'); const [ab, setAb] = useState('13'); const [hb, setHb] = useState('9');
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [error, setError]       = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);

  function cargarEjemplo() {
    setLargo('10'); setAlto('2.5');
    setDescontarVanos(true);
    setPuertas('1'); setAltoP('2.10'); setAnchoP('0.90');
    setVentanas('1'); setAltoV('1.20'); setAnchoV('1.20');
    setAparejo('soga'); setLadrillo('kk18'); setUso('portante');
    setMezcla('5'); setDesL('5'); setDesM('10'); setJunta('1.5');
    setLb('24'); setAb('13'); setHb('9');
    setEsEjemplo(true); setResultado(null); setError('');
  }

  const numPuertasEfectivo = descontarVanos ? (Number(puertas) || 0) : 0;
  const numVentanasEfectivo = descontarVanos ? (Number(ventanas) || 0) : 0;

  function calcular_() {
    setError(''); setResultado(null);
    const aberturas = numPuertasEfectivo * Number(altoP) * Number(anchoP)
                    + numVentanasEfectivo * Number(altoV) * Number(anchoV);
    const r = calcular('muros', {
      largo: Number(largo), alto: Number(alto), aberturas,
      aparejo, ladrillo, lb: Number(lb), ab: Number(ab), hb: Number(hb),
      junta: Number(junta), desL: Number(desL), desM: Number(desM),
      mezcla: Number(mezcla), uso,
    });
    if ('error' in r) { setError(r.error); return; }
    setResultado(r);
  }

  const reset = () => setEsEjemplo(false);

  // Espesor y Esbeltez para advertencias tempranas
  const eMuroCm = aparejo === 'soga' ? Number(ab) || 13 : aparejo === 'cabeza' ? Number(lb) || 24 : Number(hb) || 9;
  const esbeltezNum = (Number(alto) > 0 && eMuroCm > 0) ? (Number(alto) / (eMuroCm / 100)) : 0;
  const areaVanosM2 = numPuertasEfectivo * (Number(altoP) || 0) * (Number(anchoP) || 0)
                    + numVentanasEfectivo * (Number(altoV) || 0) * (Number(anchoV) || 0);

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapa.icon} {etapa.tituloCalc}</div>
      </div>

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      {/* Visualizador 3D y Técnico */}
      <MuroViewer3D
        largo={Number(largo) || 0}
        alto={Number(alto) || 0}
        aparejo={aparejo}
        ladrillo={ladrillo}
        uso={uso}
        puertas={numPuertasEfectivo}
        altoP={Number(altoP) || 2.10}
        anchoP={Number(anchoP) || 0.90}
        ventanas={numVentanasEfectivo}
        altoV={Number(altoV) || 1.20}
        anchoV={Number(anchoV) || 1.20}
        lb={Number(lb) || 24}
        ab={Number(ab) || 13}
        hb={Number(hb) || 9}
        campoActivo={campoActivo}
      />

      <div className="form-card">
        <div className="form-section-title">Medidas de la obra</div>

        {/* 1. Largo */}
        <div className="campo">
          <label>¿Cuántos metros mide el muro de largo? <span className="unidad">(m)</span></label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Ej: 10"
            value={largo}
            onFocus={() => setCampoActivo('largo')}
            onBlur={() => setCampoActivo(null)}
            onChange={e => { setLargo(e.target.value); reset(); }}
          />
        </div>

        {/* 2. Alto */}
        <div className="campo">
          <label>¿Cuánto mide de alto el muro? <span className="unidad">(m)</span></label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Ej: 2.5"
            value={alto}
            onFocus={() => setCampoActivo('alto')}
            onBlur={() => setCampoActivo(null)}
            onChange={e => { setAlto(e.target.value); reset(); }}
          />
        </div>

        {/* 3. Aparejo */}
        <div className="campo">
          <label>¿Cómo va colocado el ladrillo? (Aparejo / Espesor)</label>
          <div className="aparejo-grid">
            {([
              ['soga','🧱',`Soga (${Number(ab) || 13} cm)`],
              ['cabeza','🪨',`Cabeza (${Number(lb) || 24} cm)`],
              ['canto','📦',`Canto (${Number(hb) || 9} cm)`],
            ] as const).map(([v, icon, label]) => (
              <button
                key={v}
                type="button"
                className={`aparejo-btn ${aparejo === v ? 'active' : ''}`}
                onMouseEnter={() => setCampoActivo('aparejo')}
                onMouseLeave={() => setCampoActivo(null)}
                onClick={() => { setAparejo(v); setCampoActivo('aparejo'); reset(); }}
              >
                <span className="ap-icon">{icon}</span>
                <span className="ap-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Tipo de ladrillo */}
        <div className="campo">
          <label>¿Qué tipo de ladrillo se usará?</label>
          <div className="btn-row">
            {([['kk18','🧱 King Kong 18 huecos (Estructural)'],['pand','📦 Pandereta (Tabiquería)']] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={`aparejo-btn ${ladrillo === v ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => { setLadrillo(v); reset(); }}
              >
                <span className="ap-label" style={{ fontSize: '0.78rem' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Uso estructural */}
        <div className="campo">
          <label>¿El muro sostiene el techo o peso del piso superior?</label>
          <div className="btn-row">
            {([['portante','🏛️ Sí, sostiene techo (Portante)'],['tabique','🚪 No, solo división (Tabique)']] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={`aparejo-btn ${uso === v ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => { setUso(v); reset(); }}
              >
                <span className="ap-label" style={{ fontSize: '0.78rem' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alerta de Esbeltez interactiva */}
        {esbeltezNum > 20 && (
          <div className="aviso bad" style={{ margin: '8px 0 14px' }}>
            <span className="aviso-icon">🔴</span>
            <div>
              <strong>Esbeltez crítica {esbeltezNum.toFixed(1)}:</strong> La altura del muro supera el límite sísmico máximo de 20 permitido por la Norma E.070 para este espesor ({(eMuroCm)} cm). Se requiere viga de amarre intermedia o mayor espesor (aparejo de cabeza).
            </div>
          </div>
        )}

        {/* Alerta de Pandereta portante */}
        {ladrillo === 'pand' && uso === 'portante' && (
          <div className="aviso bad" style={{ margin: '8px 0 14px' }}>
            <span className="aviso-icon">⛔</span>
            <div>
              <strong>PROHIBIDO POR NORMA TÉCNICA E.070:</strong> El ladrillo pandereta tiene huecos tubulares que colapsan en sismos. <em>No debe usarse en muros portantes.</em> Usa King Kong 18 huecos.
            </div>
          </div>
        )}

        {/* ── SECCIÓN COLAPSABLE: PUERTAS Y VENTANAS ── */}
        <button
          type="button"
          className="avanzado-toggle"
          style={{
            marginTop: 6,
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: descontarVanos ? 'var(--c-accent)' : undefined,
          }}
          onClick={() => {
            setDescontarVanos(v => {
              const next = !v;
              if (next && puertas === '0' && ventanas === '0') {
                setPuertas('1');
              }
              return next;
            });
            reset();
          }}
        >
          <span>
            {descontarVanos ? '▲' : '▼'} Descontar puertas y ventanas (opcional)
          </span>
          {descontarVanos && areaVanosM2 > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--c-text)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              -{areaVanosM2.toFixed(2)} m²
            </span>
          )}
        </button>

        {descontarVanos && (
          <div style={{ marginBottom: 14, padding: '12px', background: 'var(--c-surface2)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--c-border)' }}>
            {/* Puertas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--c-muted)', margin: 0 }}>
                🚪 Puertas en este muro
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)', cursor: 'pointer' }}
                  onClick={() => { setPuertas('1'); setAltoP('2.10'); setAnchoP('0.90'); reset(); }}
                >
                  1 estándar (0.90×2.10)
                </button>
                {Number(puertas) > 0 && (
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => { setPuertas('0'); reset(); }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <div className="form-grid-3" style={{ marginBottom: 14 }}>
              <div className="campo" style={{ margin: 0 }}>
                <label>Cantidad <span className="unidad">(und)</span></label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={puertas}
                  onFocus={() => setCampoActivo('puertas')}
                  onBlur={() => setCampoActivo(null)}
                  onChange={e => { setPuertas(e.target.value); reset(); }}
                />
              </div>
              <div className="campo" style={{ margin: 0 }}>
                <label>Alto <span className="unidad">(m)</span></label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="2.10"
                  value={altoP}
                  onFocus={() => setCampoActivo('puertas')}
                  onBlur={() => setCampoActivo(null)}
                  onChange={e => { setAltoP(e.target.value); reset(); }}
                />
              </div>
              <div className="campo" style={{ margin: 0 }}>
                <label>Ancho <span className="unidad">(m)</span></label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.90"
                  value={anchoP}
                  onFocus={() => setCampoActivo('puertas')}
                  onBlur={() => setCampoActivo(null)}
                  onChange={e => { setAnchoP(e.target.value); reset(); }}
                />
              </div>
            </div>

            {/* Ventanas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--c-muted)', margin: 0 }}>
                🪟 Ventanas en este muro
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)', cursor: 'pointer' }}
                  onClick={() => { setVentanas('1'); setAltoV('1.20'); setAnchoV('1.20'); reset(); }}
                >
                  1 estándar (1.20×1.20)
                </button>
                {Number(ventanas) > 0 && (
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => { setVentanas('0'); reset(); }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <div className="form-grid-3">
              <div className="campo" style={{ margin: 0 }}>
                <label>Cantidad <span className="unidad">(und)</span></label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={ventanas}
                  onFocus={() => setCampoActivo('ventanas')}
                  onBlur={() => setCampoActivo(null)}
                  onChange={e => { setVentanas(e.target.value); reset(); }}
                />
              </div>
              <div className="campo" style={{ margin: 0 }}>
                <label>Alto <span className="unidad">(m)</span></label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="1.20"
                  value={altoV}
                  onFocus={() => setCampoActivo('ventanas')}
                  onBlur={() => setCampoActivo(null)}
                  onChange={e => { setAltoV(e.target.value); reset(); }}
                />
              </div>
              <div className="campo" style={{ margin: 0 }}>
                <label>Ancho <span className="unidad">(m)</span></label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="1.20"
                  value={anchoV}
                  onFocus={() => setCampoActivo('ventanas')}
                  onBlur={() => setCampoActivo(null)}
                  onChange={e => { setAnchoV(e.target.value); reset(); }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── SECCIÓN COLAPSABLE: AJUSTES AVANZADOS (ESTILO EXACTO A CIMIENTOS) ── */}
        <button type="button" className="avanzado-toggle" onClick={() => setAvanzado(a => !a)}>
          {avanzado ? '▲' : '▼'} Ajustes avanzados
        </button>

        {avanzado && (
          <div style={{ marginTop: 8, padding: '12px', background: 'var(--c-surface2)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--c-border)' }}>
            <div className="form-grid-2" style={{ marginBottom: 12 }}>
              <div className="campo" style={{ margin: 0 }}>
                <label>Proporción mortero <span className="unidad">(1:N)</span></label>
                <input type="number" inputMode="decimal" placeholder="Usual: 5" value={mezcla} onChange={e => { setMezcla(e.target.value); reset(); }} />
              </div>
              <div className="campo" style={{ margin: 0 }}>
                <label>Espesor de junta <span className="unidad">(cm)</span></label>
                <input type="number" inputMode="decimal" placeholder="Usual: 1.5" value={junta} onChange={e => { setJunta(e.target.value); reset(); }} />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: 14 }}>
              <div className="campo" style={{ margin: 0 }}>
                <label>Desperdicio de ladrillo <span className="unidad">(%)</span></label>
                <input type="number" inputMode="decimal" placeholder="Usual: 5" value={desL} onChange={e => { setDesL(e.target.value); reset(); }} />
              </div>
              <div className="campo" style={{ margin: 0 }}>
                <label>Desperdicio de mortero <span className="unidad">(%)</span></label>
                <input type="number" inputMode="decimal" placeholder="Usual: 10" value={desM} onChange={e => { setDesM(e.target.value); reset(); }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 10 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--c-muted)', marginBottom: 8 }}>
                Medidas del ladrillo comercial
              </div>
              <div className="form-grid-3">
                <div className="campo" style={{ margin: 0 }}>
                  <label>Largo <span className="unidad">(cm)</span></label>
                  <input type="number" inputMode="decimal" placeholder="24" value={lb} onChange={e => { setLb(e.target.value); reset(); }} />
                </div>
                <div className="campo" style={{ margin: 0 }}>
                  <label>Ancho <span className="unidad">(cm)</span></label>
                  <input type="number" inputMode="decimal" placeholder="13" value={ab} onChange={e => { setAb(e.target.value); reset(); }} />
                </div>
                <div className="campo" style={{ margin: 0 }}>
                  <label>Alto <span className="unidad">(cm)</span></label>
                  <input type="number" inputMode="decimal" placeholder="9" value={hb} onChange={e => { setHb(e.target.value); reset(); }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="aviso bad" style={{ marginBottom: 12 }}><span className="aviso-icon">🔴</span>{error}</div>}

      <button className="btn-primary" onClick={calcular_} disabled={!largo || !alto}>
        Calcular materiales
      </button>

      {resultado && (
        <div style={{ marginTop: 20 }}>
          <Resultado resultado={resultado} idCalc="muros" esEjemplo={esEjemplo} />
        </div>
      )}
    </div>
  );
};
