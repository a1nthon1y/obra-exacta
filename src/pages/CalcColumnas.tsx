import React, { Suspense, useRef, useState } from 'react';
import { calcular } from '../engine/calc';
import { sugerirColumna } from '../engine/sugerir';
import type { SugerenciaColumna } from '../engine/sugerir';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { AvisoEdificio } from '../components/AvisoEdificio';
import { ProyectoActivoBar } from '../components/ProyectoActivoBar';
import { ViewerCargando } from '../components/ViewerCargando';
import { ViewerEspera } from '../components/ViewerEspera';
import { FC_OPCIONES, FC_AYUDA } from '../utils/fcOpciones';
import { getEtapa } from '../config/etapas';
import { useObraStore } from '../store/obraStore';

const etapa = getEtapa('columnas');

const ColumnaViewer3D = React.lazy(() =>
  import('../components/ColumnaViewer3D').then(m => ({ default: m.ColumnaViewer3D }))
);

const DIAMETROS = ['3/8', '1/2', '5/8', '3/4', '1/4'] as const;

export const CalcColumnas: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const proyectoActivo = proyectos.find(p => p.id === proyectoActivoId) ?? null;
  const esEdificio = proyectoActivo !== null;

  const [modo, setModo] = useState<'sugerir' | 'medida'>('sugerir');
  // En un proyecto de 3–5 pisos no existe "No sé la medida": la sección sale
  // de los planos del ingeniero. Forzamos la puerta de medida sin depender
  // de que el usuario cambie de pestaña.
  const modoActual = esEdificio ? 'medida' : modo;
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

  // Modo "No sé la medida"
  const [pisos, setPisos] = useState<1|2|3>(1);
  const [luz, setLuz] = useState('');
  const [sugerencia, setSugerencia] = useState<SugerenciaColumna | null>(null);
  const [sugerirError, setSugerirError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  function limpiarSugerencia() {
    setSugerencia(null);
    setSugerirError('');
    setResultado(null);
    setError('');
  }

  function irASugerir() {
    if (esEdificio) {
      setModo('medida');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setModo('sugerir');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function irAMedida() {
    setModo('medida');
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  function cargarEjemplo() {
    setModo('medida');
    setB('13'); setH('25'); setAlto('2.5'); setCant('6');
    setNVar('4'); setDVar('3/8'); setDEst('1/4'); setSis('confinada');
    setRec('4'); setFc(210);
    setEsEjemplo(true); setResultado(null); setError('');
    setSugerencia(null); setSugerirError('');
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

  function aplicarSugerencia() {
    setSugerirError('');
    setError('');
    if (esEdificio) {
      setSugerirError('En un edificio de 3–5 pisos no damos una medida usual. Usa “Ya tengo la medida” con los planos aprobados por tu ingeniero.');
      return;
    }
    const l = Number(luz);
    if (!l || l <= 0) {
      setSugerirError('Escribe la distancia entre columnas (ej. 4).');
      return;
    }

    const s = sugerirColumna({ pisos, sis, luz: l });
    setSugerencia(s);
    setResultado(null);

    // Fuera de la envolvente: no calculamos una medida como si fuera segura.
    if (s.requiereIngeniero) return;

    const altoNum = Number(alto) || 2.5;
    const cantNum = Number(cant) || 6;
    setB(String(s.b));
    setH(String(s.h));
    setNVar(String(s.nVar));
    setDVar(s.dVar);
    setDEst(s.dEst);
    if (!alto) setAlto(String(altoNum));
    if (!cant) setCant(String(cantNum));

    const r = calcular('columnas', {
      b: s.b, h: s.h, alto: altoNum, cant: cantNum,
      nVar: s.nVar, dVar: s.dVar, dEst: s.dEst, rec: Number(rec), fc, sis,
    });
    if ('error' in r) { setError(r.error); return; }
    setEsEjemplo(false);
    setResultado(r);
  }

  const reset = () => { setEsEjemplo(false); setResultado(null); };
  const tieneMedidas = Number(b) > 0 && Number(h) > 0 && Number(alto) > 0;

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapa.icon} {etapa.tituloCalc}</div>
      </div>

      <ProyectoActivoBar />

      <AvisoEdificio conProyecto={false}>
        <strong>No usamos “Sugiéreme” en edificios de 3–5 pisos.</strong>{' '}
        Ingresa la sección y el acero de los planos aprobados por tu ingeniero.
      </AvisoEdificio>

      <button className="btn-ejemplo" onClick={cargarEjemplo}>📐 Ver un ejemplo</button>

      {/* Dos puertas: no sé / ya tengo la medida */}
      <div className="modo-switch">
        <button
          type="button"
          className={modoActual === 'sugerir' ? 'active' : ''}
          onClick={() => setModo('sugerir')}
          disabled={esEdificio}
          title={esEdificio ? 'No disponible para proyectos de 3–5 pisos' : undefined}
          style={esEdificio ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        >
          No sé la medida
        </button>
        <button
          type="button"
          className={modoActual === 'medida' ? 'active' : ''}
          onClick={() => setModo('medida')}
        >
          Ya tengo la medida
        </button>
      </div>

      {modoActual === 'sugerir' && (
        <div className="sugerir-card">
          <div className="sugerir-head">
            <div>
              <div className="sugerir-title">¿De cuánto por cuánto?</div>
              <div className="sugerir-sub">
                Dinos lo básico y te damos una medida usual. No es un diseño estructural.
              </div>
            </div>
            <span className="sugerir-beta">ORIENTATIVO</span>
          </div>

          <div className="campo">
            <label id="col-sug-sis-label">¿Dónde va la columna?</label>
            <div className="btn-row" role="group" aria-labelledby="col-sug-sis-label">
              {([['confinada', 'Entre muros'], ['porticos', 'Libre (pórtico)']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={`aparejo-btn ${sis === v ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => { setSis(v); setRec(v === 'confinada' ? '2' : '4'); limpiarSugerencia(); }}
                >
                  <span className="ap-label" style={{ fontSize: '0.76rem' }}>{label}</span>
                </button>
              ))}
            </div>
            <div className="form-hint">Entre muros es lo usual en una casa de albañilería confinada.</div>
          </div>

          <div className="campo">
            <label id="col-sug-pisos-label">¿Para cuántos pisos?</label>
            <div className="btn-row" role="group" aria-labelledby="col-sug-pisos-label">
              {([1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  className={`aparejo-btn ${pisos === n ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => { setPisos(n); limpiarSugerencia(); }}
                >
                  <span className="ap-label" style={{ fontSize: '0.76rem' }}>
                    {n} piso{n > 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="campo">
            <label htmlFor="col-luz">¿Cuánto hay de columna a columna? <span className="unidad">(m)</span></label>
            <input
              id="col-luz"
              type="number"
              inputMode="decimal"
              placeholder="Ej: 4"
              value={luz}
              onChange={e => { setLuz(e.target.value); limpiarSugerencia(); }}
            />
            <div className="form-hint">Mide el espacio libre entre una columna y la siguiente.</div>
          </div>

          <button className="btn-primary" onClick={aplicarSugerencia} disabled={!luz}>
            Sugiéreme la medida
          </button>

          {sugerirError && (
            <div className="aviso bad" style={{ marginTop: 10 }}>
              <span className="aviso-icon">🔴</span>{sugerirError}
            </div>
          )}

          {sugerencia && (
            <div className={`sugerir-resultado ${sugerencia.requiereIngeniero ? 'warn' : 'ok'}`}>
              <div className="sugerir-medida">
                {sugerencia.requiereIngeniero
                  ? 'Revisión de ingeniero'
                  : `${sugerencia.b} × ${sugerencia.h} cm`}
              </div>

              {!sugerencia.requiereIngeniero && (
                <div className="sugerir-fierro">
                  {sugerencia.nVar} varillas de {sugerencia.dVar}" · estribos de {sugerencia.dEst}"
                </div>
              )}

              <p>{sugerencia.explicacion}</p>

              {sugerencia.requiereIngeniero && sugerencia.motivo && (
                <p className="sugerir-motivo">{sugerencia.motivo}</p>
              )}

              <details>
                <summary>¿Por qué y cuándo no aplica?</summary>
                <div className="sugerir-detalle">
                  <strong>Supuestos</strong>
                  <ul>{sugerencia.supuestos.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  <strong>No aplica si</strong>
                  <ul>{sugerencia.noAplica.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              </details>

              {!sugerencia.requiereIngeniero && (
                <>
                  <div className="sugerir-nota">
                    Calculado con {Number(cant) || 6} columnas de {Number(alto) || 2.5} m.
                    Puedes ajustar la altura y la cantidad.
                  </div>
                  <button className="btn-secondary" style={{ marginTop: 8 }} onClick={irAMedida}>
                    Ajustar la medida
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!tieneMedidas ? (
        <ViewerEspera
          icon={etapa.icon}
          titulo={etapa.tituloVisor}
          mensaje={esEdificio
            ? 'Ingresa la sección y el acero de los planos abajo. El visor mostrará tu columna, no una medida sugerida.'
            : 'Ingresa las medidas de la columna o usa “No sé la medida”. El visor se activa con tus datos, no con valores de ejemplo.'}
        />
      ) : (
        <Suspense fallback={<ViewerCargando icon={etapa.icon} titulo={etapa.tituloVisor} />}>
          <ColumnaViewer3D
            b={Number(b) || 0}
            h={Number(h) || 0}
            alto={Number(alto) || 0}
            nVar={Number(nVar) || 0}
            dVar={dVar}
            dEst={dEst}
            rec={Number(rec) || 0}
            campoActivo={campoActivo}
            onNoSe={esEdificio ? undefined : irASugerir}
            onEditar={irAMedida}
            guia={modoActual === 'sugerir'}
          />
        </Suspense>
      )}

      {modoActual === 'medida' && (
        <>
          <div className="form-card" ref={formRef}>
            <div className="form-section-title">Medidas de la columna</div>
            <div className="campo">
              <label htmlFor="col-cant">¿Cuántas columnas? <span className="unidad">(und)</span></label>
              <input id="col-cant" type="number" inputMode="decimal" placeholder="Ej: 6" value={cant} onChange={e => { setCant(e.target.value); reset(); }} />
            </div>
            <div className="form-grid-2">
              <div className="campo">
                <label htmlFor="col-b">Ancho de la sección <span className="unidad">(cm)</span></label>
                <input id="col-b" type="number" inputMode="decimal" placeholder={sis === 'confinada' ? 'Ej: 13' : 'Ej: 25'} value={b}
                  onFocus={() => setCampoActivo('b')} onBlur={() => setCampoActivo(null)}
                  onChange={e => { setB(e.target.value); reset(); }} />
              </div>
              <div className="campo">
                <label htmlFor="col-h">Largo de la sección <span className="unidad">(cm)</span></label>
                <input id="col-h" type="number" inputMode="decimal" placeholder="Ej: 25" value={h}
                  onFocus={() => setCampoActivo('h')} onBlur={() => setCampoActivo(null)}
                  onChange={e => { setH(e.target.value); reset(); }} />
              </div>
            </div>
            <div className="form-hint" style={{ marginTop: -6, marginBottom: 10 }}>
              {sis === 'confinada'
                ? 'Se escribe ancho × largo. En albañilería confinada: 13 × 25 cm (13 cm es el espesor del muro de soga).'
                : 'Se escribe ancho × largo. En pórticos: 25 × 25 cm como mínimo.'}
            </div>
            <div className="campo">
              <label htmlFor="col-alto">¿Qué tan alta es la columna? <span className="unidad">(m)</span></label>
              <input id="col-alto" type="number" inputMode="decimal" placeholder="Ej: 2.5" value={alto}
                onFocus={() => setCampoActivo('alto')} onBlur={() => setCampoActivo(null)}
                onChange={e => { setAlto(e.target.value); reset(); }} />
            </div>

            <div className="campo">
              <label id="col-fierro-label">Fierro — ¿cuántas varillas y de qué grosor?</label>
              <div className="form-grid-2" role="group" aria-labelledby="col-fierro-label">
                <input id="col-nvar" aria-label="Cantidad de varillas" type="number" inputMode="decimal" placeholder="Cantidad de varillas" value={nVar}
                  onFocus={() => setCampoActivo('nVar')} onBlur={() => setCampoActivo(null)}
                  onChange={e => { setNVar(e.target.value); reset(); }} />
                <select id="col-dvar" aria-label="Diámetro de las varillas" value={dVar}
                  onFocus={() => setCampoActivo('dVar')} onBlur={() => setCampoActivo(null)}
                  onChange={e => { setDVar(e.target.value); reset(); }}>
                  {DIAMETROS.map(d => <option key={d} value={d}>{d}"</option>)}
                </select>
              </div>
            </div>

            <div className="campo">
              <label id="col-sis-label">¿La columna está entre muros o es libre?</label>
              <div className="btn-row" role="group" aria-labelledby="col-sis-label">
                {([['confinada','Entre muros (confinada)'],['porticos','Libre (pórtico)']] as const).map(([v, label]) => (
                  <button key={v} className={`aparejo-btn ${sis === v ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => { setSis(v); setRec(v === 'confinada' ? '2' : '4'); reset(); }}>
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
                  <label htmlFor="col-dest">Estribo <span className="unidad">(diámetro)</span></label>
                  <select id="col-dest" value={dEst}
                    onFocus={() => setCampoActivo('dEst')} onBlur={() => setCampoActivo(null)}
                    onChange={e => { setDEst(e.target.value); reset(); }}>
                    {DIAMETROS.map(d => <option key={d} value={d}>{d}"</option>)}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="col-rec">Recubrimiento <span className="unidad">(cm)</span></label>
                  <input id="col-rec" type="number" inputMode="decimal" placeholder="Usual: 4" value={rec} onChange={e => { setRec(e.target.value); reset(); }} />
                </div>
                <div className="campo" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="col-fc">Resistencia del concreto <span className="unidad">(kg/cm²)</span></label>
                  <select id="col-fc" value={fc} onChange={e => { setFc(Number(e.target.value) as 140|175|210|245|280); reset(); }}>
                    {FC_OPCIONES.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                  </select>
                  <div style={{ fontSize: '0.68rem', color: 'var(--c-muted)', marginTop: 4 }}>{FC_AYUDA}</div>
                </div>
              </div>
            )}
          </div>

          <button className="btn-primary" onClick={calcular_} disabled={!b || !h || !alto || !cant}>
            Calcular materiales
          </button>
        </>
      )}

      {error && <div className="aviso bad" style={{ marginTop: 12 }}><span className="aviso-icon">🔴</span>{error}</div>}

      {resultado && (
        <div style={{ marginTop: 20 }}>
          <Resultado resultado={resultado} idCalc="columnas" esEjemplo={esEjemplo} />
        </div>
      )}
    </div>
  );
};
