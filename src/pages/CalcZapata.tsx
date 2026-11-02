import React, { Suspense, useRef, useState } from 'react';
import { calcular, dimensionarZapata } from '../engine/calc';
import { sugerirZapata } from '../engine/sugerir';
import type { SugerenciaZapata } from '../engine/sugerir';
import type { ResultadoCalculo } from '../engine/types';
import { Resultado } from '../components/Resultado';
import { AvisoEdificio } from '../components/AvisoEdificio';
import { ProyectoActivoBar } from '../components/ProyectoActivoBar';
import { ViewerCargando } from '../components/ViewerCargando';
import { ViewerEspera } from '../components/ViewerEspera';
import { FC_OPCIONES, FC_AYUDA } from '../utils/fcOpciones';
import { getEtapa } from '../config/etapas';
import { useObraStore } from '../store/obraStore';

const etapa = getEtapa('zapata');

const ZapataViewer3D = React.lazy(() =>
  import('../components/ZapataViewer3D').then(m => ({ default: m.ZapataViewer3D }))
);

const EJEMPLO: any = {
  zapata: { bCol: 30, hCol: 30, carga: 15, suelo: 'intermedio', pa: 1.2, espesor: 40, dVar: '5/8', fc: 210, cant: 4 }
};

const SUELOS = [
  { valor: 'blando',     label: 'Blando',     detalle: '0.80 kg/cm²' },
  { valor: 'intermedio', label: 'Intermedio', detalle: '1.20 kg/cm²' },
  { valor: 'duro',       label: 'Duro',       detalle: '2.00 kg/cm²' },
  { valor: 'manual',     label: 'Otro',       detalle: 'ingresar pa' },
] as const;

const SUELO_LABEL: Record<string, string> = {
  blando: 'Blando',
  intermedio: 'Intermedio',
  duro: 'Duro',
  manual: 'Otro',
};

const POS_LABEL: Record<string, string> = {
  esquina: 'Esquina',
  borde: 'Borde',
  centro: 'Centro',
};

export const CalcZapata: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const proyectoActivo = proyectos.find(p => p.id === proyectoActivoId) ?? null;
  const esEdificio = proyectoActivo !== null;

  const [modo, setModo] = useState<'sugerir' | 'medida'>('sugerir');
  // En un proyecto de 3–5 pisos la zapata viene del plano estructural.
  // "Sugiéreme" queda bloqueado también si queda un estado viejo en memoria.
  const modoActual = esEdificio ? 'medida' : modo;
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

  // Modo "No sé la medida": paño entre columnas + suelo, sin pedir toneladas.
  const [sis, setSis] = useState<'confinada' | 'porticos'>('confinada');
  const [pos, setPos] = useState<'esquina' | 'borde' | 'centro'>('esquina');
  const [pisos, setPisos] = useState<1 | 2 | 3>(1);
  const [luz, setLuz] = useState('');
  const [sugerencia, setSugerencia] = useState<SugerenciaZapata | null>(null);
  const [sugerirError, setSugerirError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const reset = () => { setEsEjemplo(false); setResultado(null); };

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
    const e = EJEMPLO.zapata;
    setModo('medida');
    setBCol(String(e.bCol)); setHCol(String(e.hCol));
    setCarga(String(e.carga)); setSuelo(e.suelo); setPa(String(e.pa));
    setEspesor(String(e.espesor)); setDVar(e.dVar); setFc(e.fc); setCant(String(e.cant));
    setAvanzado(false);
    setEsEjemplo(true); setResultado(null); setError('');
    setSugerencia(null); setSugerirError('');
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

  function aplicarSugerencia() {
    setSugerirError('');
    setError('');
    if (esEdificio) {
      setSugerirError('En un edificio de 3–5 pisos no estimamos la zapata con el paño. Usa “Ya tengo la medida” con los planos aprobados por tu ingeniero.');
      return;
    }
    const l = Number(luz);
    if (!l || l <= 0) {
      setSugerirError('Escribe la distancia entre columnas (ej. 4).');
      return;
    }
    if (suelo === 'manual' && (!pa || Number(pa) <= 0)) {
      setSugerirError('Escribe la presión admisible del suelo.');
      return;
    }

    const s = sugerirZapata({ pisos, luz: l, suelo, pa: Number(pa), sis, pos });
    setSugerencia(s);
    setResultado(null);

    // Fuera de la envolvente: no calculamos una medida como si fuera segura.
    if (s.requiereIngeniero) return;

    setBCol(String(s.bCol));
    setHCol(String(s.hCol));
    setCarga(String(s.carga));
    setSuelo(s.suelo);
    setPa(String(s.pa));
    setEspesor(String(Math.round(s.espesor * 100)));
    setCant(String(s.cant));

    const r = calcular('zapata', {
      tipo: 'aislada',
      bCol: s.bCol,
      hCol: s.hCol,
      carga: s.carga,
      suelo: s.suelo,
      pa: s.suelo === 'manual' ? s.pa : 0,
      espesor: Math.round(s.espesor * 100),
      dVar,
      fc,
      cant: s.cant,
    } as any);
    if ('error' in r) { setError(r.error); return; }
    setEsEjemplo(false);
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
  const puedeSugerir = !!luz && (suelo !== 'manual' || !!pa);
  const tieneMedidas = nBCol > 0 && nHCol > 0 && nCarga > 0;

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">{etapa.icon} {etapa.tituloCalc}</div>
      </div>

      <ProyectoActivoBar />

      <AvisoEdificio conProyecto={false}>
        <strong>No usamos “Sugiéreme” en edificios de 3–5 pisos.</strong>{' '}
        Ingresa la medida, la carga y el suelo de los planos aprobados por tu ingeniero.
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
                Dinos el paño y el suelo; te damos una zapata usual. No es un diseño estructural.
              </div>
            </div>
            <span className="sugerir-beta">ORIENTATIVO</span>
          </div>

          <div className="campo">
            <label>¿Dónde va la zapata?</label>
            <div className="btn-row">
              {([['confinada', 'Entre muros'], ['porticos', 'Columna libre']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={`aparejo-btn ${sis === v ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => { setSis(v); limpiarSugerencia(); }}
                >
                  <span className="ap-label" style={{ fontSize: '0.76rem' }}>{label}</span>
                </button>
              ))}
            </div>
            <div className="form-hint">
              En albañilería confinada lo usual es cimiento corrido. La zapata aislada se usa más en pórticos.
            </div>
          </div>

          <div className="campo">
            <label>¿Dónde está la columna?</label>
            <div className="btn-row">
              {([['esquina', 'Esquina'], ['borde', 'Borde'], ['centro', 'Centro']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={`aparejo-btn ${pos === v ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => { setPos(v); limpiarSugerencia(); }}
                >
                  <span className="ap-label" style={{ fontSize: '0.76rem' }}>{label}</span>
                </button>
              ))}
            </div>
            <div className="form-hint">
              Esquina: 2 muros. Borde: 1 muro. Centro: columna interior. De eso depende cuánta carga baja.
            </div>
          </div>

          <div className="campo">
            <label>¿Para cuántos pisos?</label>
            <div className="btn-row">
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
            <label>¿De columna a columna cuánto hay? <span className="unidad">(m)</span></label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Ej: 4"
              value={luz}
              onChange={e => { setLuz(e.target.value); limpiarSugerencia(); }}
            />
            <div className="form-hint">
              Con la posición de la columna calculamos el área que baja a la zapata. En una esquina es la cuarta parte del paño.
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
                  onClick={() => { setSuelo(s.valor); limpiarSugerencia(); }}
                >
                  <span className="ap-label" style={{ fontSize: '0.76rem' }}>{s.label}</span>
                  <span style={{ fontSize: '0.64rem', color: 'var(--c-muted)' }}>{s.detalle}</span>
                </button>
              ))}
            </div>
          </div>

          {suelo === 'manual' && (
            <div className="campo">
              <label>Presión admisible del suelo <span className="unidad">(kg/cm²)</span></label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Ej: 1.0"
                value={pa}
                onChange={e => { setPa(e.target.value); limpiarSugerencia(); }}
              />
            </div>
          )}

          <button className="btn-primary" onClick={aplicarSugerencia} disabled={!puedeSugerir}>
            Sugiéreme la medida
          </button>

          {sugerirError && (
            <div className="aviso bad" style={{ marginTop: 10 }}>
              <span className="aviso-icon">🔴</span>{sugerirError}
            </div>
          )}

          {sugerencia && (
            <div className={`sugerir-resultado ${sugerencia.requiereIngeniero || sugerencia.aviso ? 'warn' : 'ok'}`}>
              <div className="sugerir-medida">
                {sugerencia.requiereIngeniero
                  ? 'Revisión de ingeniero'
                  : `${sugerencia.lado.toFixed(2)} × ${sugerencia.lado.toFixed(2)} m`}
              </div>

              {!sugerencia.requiereIngeniero && (
                <>
                  <div className="sugerir-fierro">
                    Espesor {(sugerencia.espesor * 100).toFixed(0)} cm · Columna {sugerencia.bCol} × {sugerencia.hCol} cm
                  </div>
                  <div className="sugerir-fierro" style={{ fontWeight: 500, fontSize: '0.78rem' }}>
                    Área que baja: {sugerencia.areaTrib.toFixed(1)} m² ({POS_LABEL[sugerencia.pos]}) · Carga estimada: {sugerencia.carga} t
                  </div>
                  <div className="sugerir-fierro" style={{ fontWeight: 500, fontSize: '0.78rem' }}>
                    {SUELO_LABEL[sugerencia.suelo]} ({sugerencia.pa.toFixed(2)} kg/cm²)
                  </div>
                </>
              )}

              <p>
                {sugerencia.requiereIngeniero
                  ? sugerencia.motivo
                  : 'Esta es la medida orientativa para el paño y el suelo que indicaste.'}
              </p>

              {sugerencia.aviso && <p className="sugerir-motivo">{sugerencia.aviso}</p>}

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
                    Calculado con {sugerencia.cant} zapatas. Ajusta la cantidad en “Ya tengo la medida”.
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
            ? 'Ingresa la medida y la carga del plano abajo. El visor mostrará tu zapata, no una medida sugerida.'
            : 'Ingresa las medidas de la zapata o usa “No sé la medida”. El visor se activa con tus datos, no con valores de ejemplo.'}
        />
      ) : (
        <Suspense fallback={<ViewerCargando icon={etapa.icon} titulo={etapa.tituloVisor} />}>
          <ZapataViewer3D
            bCol={nBCol}
            hCol={nHCol}
            bZap={ladoZap}
            hZap={ladoZap}
            espesor={espesorM}
            carga={nCarga}
            cant={nCant}
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
            <div className="form-section-title">Medidas de la zapata</div>

            <div className="campo">
              <label>¿Cuántas zapatas vas a vaciar? <span className="unidad">(und)</span></label>
              <input type="number" inputMode="decimal" placeholder="Ej: 4" value={cant}
                onFocus={() => setCampoActivo('cant')} onBlur={() => setCampoActivo(null)}
                onChange={e => { setCant(e.target.value); reset(); }} />
            </div>

            <div className="form-grid-2">
              <div className="campo">
                <label>Ancho de la columna <span className="unidad">(cm)</span></label>
                <input type="number" inputMode="decimal" placeholder="Ej: 30" value={bCol}
                  onFocus={() => setCampoActivo('bCol')} onBlur={() => setCampoActivo(null)}
                  onChange={e => { setBCol(e.target.value); reset(); }} />
              </div>
              <div className="campo">
                <label>Largo de la columna <span className="unidad">(cm)</span></label>
                <input type="number" inputMode="decimal" placeholder="Ej: 30" value={hCol}
                  onFocus={() => setCampoActivo('hCol')} onBlur={() => setCampoActivo(null)}
                  onChange={e => { setHCol(e.target.value); reset(); }} />
              </div>
            </div>

            <div className="campo">
              <label>Carga sobre la zapata <span className="unidad">(toneladas)</span></label>
              <input type="number" inputMode="decimal" placeholder="Ej: 15" value={carga}
                onFocus={() => setCampoActivo('carga')} onBlur={() => setCampoActivo(null)}
                onChange={e => { setCarga(e.target.value); reset(); }} />
              <div className="form-hint">
                {esEdificio
                  ? 'Usa la carga de los planos aprobados por el ingeniero. Si no está indicada, pídesela antes de comprar.'
                  : 'Si no la sabes, usa “No sé la medida” y la estimamos con el paño entre columnas.'}
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

          <button className="btn-primary" onClick={calcular_} disabled={!puedeCalcular}>
            Calcular materiales
          </button>
        </>
      )}

      {error && <div className="aviso bad" style={{ marginTop: 12 }}><span className="aviso-icon">🔴</span>{error}</div>}

      {resultado && (
        <div style={{ marginTop: 20 }}>
          <Resultado resultado={resultado} idCalc="zapata" esEjemplo={esEjemplo} />
        </div>
      )}
    </div>
  );
};
