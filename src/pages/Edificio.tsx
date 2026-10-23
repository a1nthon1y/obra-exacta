import React, { useState } from 'react';
import { useObraStore, totalizarObra } from '../store/obraStore';

interface Props {
  onBack: () => void;
  onIrCalculadoras: () => void;
  onVerObra: () => void;
}

const CHECKLIST_METRADO = [
  'Columnas: sección, altura, acero y estribos.',
  'Vigas: sección, longitud y acero.',
  'Losa: espesor, viguetas y ladrillo de techo.',
  'Muros: tipo de ladrillo, espesor y altura.',
  'Escalera: ancho, huella y contrahuella.',
  'Cimentación: zapatas o cimiento corrido según el plano.',
];

const CHECKLIST_INGENIERO = [
  'Uso del edificio: vivienda, comercio o mixto.',
  'Ubicación y distrito (zona sísmica).',
  'Tipo de suelo o estudio de mecánica de suelos.',
  'Planos de arquitectura: plantas y cortes.',
  'Luces entre columnas y altura de piso.',
  'Sistema estructural previsto: pórticos, muros o dual.',
  'Cargas especiales: tanque, azotea, maquinaria.',
  'Planos de cimentación y detalles.',
];

function textoIngeniero(pisos: number, nombre?: string): string {
  return [
    `DATOS PARA MI INGENIERO — ${nombre ? `${nombre.toUpperCase()} · ` : ''}EDIFICIO DE ${pisos} PISOS`,
    `- Número de pisos: ${pisos}`,
    ...CHECKLIST_INGENIERO.map(item => `- ${item}`),
    '',
    'Necesito revisión estructural y planos antes de comprar material.',
  ].join('\n');
}

export const Edificio: React.FC<Props> = ({ onBack, onIrCalculadoras, onVerObra }) => {
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const pisoActivo = useObraStore(s => s.pisoActivo);
  const etapas = useObraStore(s => s.etapas);
  const precios = useObraStore(s => s.precios);
  const crearProyecto = useObraStore(s => s.crearProyecto);
  const setProyectoActivo = useObraStore(s => s.setProyectoActivo);
  const setPisoActivo = useObraStore(s => s.setPisoActivo);
  const eliminarProyecto = useObraStore(s => s.eliminarProyecto);

  const [nombre, setNombre] = useState('');
  const [pisos, setPisos] = useState<3 | 4 | 5>(3);
  const [copiado, setCopiado] = useState(false);

  const proyectoActivo = proyectos.find(p => p.id === proyectoActivoId) ?? null;
  const pisosReferencia = proyectoActivo?.pisos ?? pisos;
  const etapasProyecto = proyectoActivo
    ? etapas.filter(e => e.proyectoId === proyectoActivo.id)
    : [];
  const sinPiso = etapasProyecto.filter(e => !e.piso).length;

  function contarPiso(n: number): number {
    return etapasProyecto.filter(e => e.piso === n).length;
  }

  function totalPiso(n: number): number {
    return totalizarObra(etapasProyecto.filter(e => e.piso === n), precios).totalSoles;
  }

  const totalProyecto = proyectoActivo
    ? totalizarObra(etapasProyecto, precios).totalSoles
    : 0;

  function proyectoTieneEtapas(id: string): boolean {
    return etapas.some(e => e.proyectoId === id);
  }

  function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este proyecto vacío?')) return;
    eliminarProyecto(id);
  }

  function crear() {
    crearProyecto(nombre, pisos);
    setNombre('');
  }

  async function copiarLista() {
    const texto = textoIngeniero(pisosReferencia, proyectoActivo?.nombre);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      setCopiado(false);
    }
  }

  function compartirWhatsApp() {
    const texto = textoIngeniero(pisosReferencia, proyectoActivo?.nombre);
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="page">
      <div className="calc-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="calc-title">🏢 Edificio / 3–5 pisos</div>
      </div>

      <div className="sugerir-card">
        <div className="sugerir-head">
          <div>
            <div className="sugerir-title">Para 3 a 5 pisos</div>
            <div className="sugerir-sub">
              La estructura la define un ingeniero. La app te ayuda a meter el material de sus planos,
              piso por piso.
            </div>
          </div>
          <span className="sugerir-beta">{proyectoActivo ? 'PROYECTO ACTIVO' : 'CON PLANOS'}</span>
        </div>

        {!proyectoActivo ? (
          <>
            <div className="form-section-title">Crear proyecto de edificio</div>
            <p style={{ fontSize: '0.86rem', lineHeight: 1.5, margin: '6px 0 12px' }}>
              Crea el proyecto antes de calcular. Así cada partida queda ordenada por piso y puedes
              ver el total del edificio o de un nivel.
            </p>

            <div className="campo">
              <label htmlFor="proyecto-nombre">Nombre del proyecto <span className="unidad">(opcional)</span></label>
              <input
                id="proyecto-nombre"
                type="text"
                value={nombre}
                maxLength={40}
                placeholder={`Edificio de ${pisos} pisos`}
                onChange={e => setNombre(e.target.value)}
              />
            </div>

            <div className="campo">
              <label>¿Cuántos pisos tendrá?</label>
              <div className="btn-row">
                {([3, 4, 5] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`aparejo-btn ${pisos === n ? 'active' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setPisos(n)}
                  >
                    <span className="ap-label" style={{ fontSize: '0.76rem' }}>{n} pisos</span>
                  </button>
                ))}
              </div>
              <div className="form-hint">
                Para 1–2 pisos usa las calculadoras de casa. Más de 5 pisos no lo cubrimos.
              </div>
            </div>

            <button className="btn-primary" onClick={crear}>
              Crear proyecto y metrar por piso
            </button>

            {proyectos.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="form-hint" style={{ marginBottom: 6 }}>O continúa un proyecto guardado:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {proyectos.map(p => (
                    <div key={p.id} style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ textAlign: 'left', flex: 1, minWidth: 0 }}
                        onClick={() => setProyectoActivo(p.id)}
                      >
                        🏢 {p.nombre} · {p.pisos} pisos
                      </button>
                      {!proyectoTieneEtapas(p.id) && (
                        <button
                          type="button"
                          className="btn-secondary"
                          title="Eliminar proyecto vacío"
                          aria-label={`Eliminar proyecto vacío ${p.nombre}`}
                          style={{ width: 44, flexShrink: 0, padding: 0 }}
                          onClick={() => eliminar(p.id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="form-section-title">Proyecto activo</div>
            <div
              style={{
                background: 'var(--c-surface2)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>🏢 {proyectoActivo.nombre}</div>
              <div className="form-hint" style={{ marginTop: 2 }}>
                {proyectoActivo.pisos} pisos · {etapasProyecto.length} partida{etapasProyecto.length === 1 ? '' : 's'} guardada{etapasProyecto.length === 1 ? '' : 's'}
                {etapasProyecto.length > 0 ? ` · S/ ${totalProyecto.toFixed(0)}` : ''}
              </div>
            </div>

            <div className="campo" style={{ marginTop: 14 }}>
              <label>Piso que estás metrando</label>
              <div className="btn-row">
                {Array.from({ length: proyectoActivo.pisos }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`aparejo-btn ${pisoActivo === n ? 'active' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setPisoActivo(n)}
                  >
                    <span className="ap-label" style={{ fontSize: '0.76rem' }}>Piso {n}</span>
                  </button>
                ))}
              </div>
              <div className="form-hint">
                Al guardar una calculadora, la partida queda en este piso. También puedes cambiarlo
                en el resultado antes de agregarla a Mi obra.
              </div>
            </div>

            <div
              style={{
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                marginBottom: 12,
              }}
            >
              {Array.from({ length: proyectoActivo.pisos }, (_, i) => i + 1).map(n => {
                const count = contarPiso(n);
                return (
                  <div
                    key={n}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      padding: '6px 0',
                      borderBottom: n < proyectoActivo.pisos || sinPiso > 0 ? '1px solid var(--c-border)' : 'none',
                    }}
                  >
                    <span>Piso {n}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--c-muted)' }}>
                        {count} partida{count === 1 ? '' : 's'}
                      </div>
                      {count > 0 && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>S/ {totalPiso(n).toFixed(0)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {sinPiso > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 0' }}>
                  <span>Sin piso</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--c-muted)' }}>{sinPiso} partida{sinPiso === 1 ? '' : 's'}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      S/ {totalizarObra(etapasProyecto.filter(e => !e.piso), precios).totalSoles.toFixed(0)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {etapasProyecto.length > 0 && (
              <div className="form-hint" style={{ marginTop: 6, marginBottom: 12 }}>
                Costos por piso referenciales; el total del proyecto suma todo antes de redondear.
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1, minWidth: 180 }} onClick={onIrCalculadoras}>
                Ir a calcular este piso
              </button>
              <button className="btn-secondary" style={{ flex: 1, minWidth: 140 }} onClick={onVerObra}>
                Ver Mi obra
              </button>
            </div>

            <button
              type="button"
              onClick={() => setProyectoActivo(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--c-muted)',
                fontSize: '0.75rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '8px 0',
              }}
            >
              Salir del proyecto (modo casa)
            </button>
          </>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(148,163,184,0.25)', margin: '20px 0' }} />

        <div className="form-section-title">
          📐 Tengo planos o medidas del ingeniero
        </div>
        <p style={{ fontSize: '0.86rem', lineHeight: 1.5, margin: '6px 0 10px' }}>
          {proyectoActivo
            ? `Estás en ${proyectoActivo.nombre}, Piso ${pisoActivo}. Usa “Ya tengo la medida” en cada calculadora y guarda la partida.`
            : 'Crea el proyecto arriba para que cada partida quede en su piso. Si no lo creas, la partida se guarda como casa.'}
          {' '}Ingresa las medidas del plano; si los pisos son iguales, puedes repetir el cálculo
          cambiando solo el piso.
        </p>
        <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: '0.8rem', lineHeight: 1.55 }}>
          {CHECKLIST_METRADO.map(item => <li key={item}>{item}</li>)}
        </ul>
        <button className="btn-secondary" onClick={onIrCalculadoras}>
          Ir a las calculadoras
        </button>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(148,163,184,0.25)', margin: '20px 0' }} />

        <div className="form-section-title">
          🧑‍🔧 No tengo planos todavía
        </div>
        <p style={{ fontSize: '0.86rem', lineHeight: 1.5, margin: '6px 0 10px' }}>
          Para 3–5 pisos no improvises la estructura. Busca un ingeniero civil o estructural y
          llévale estos datos.
        </p>
        <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: '0.8rem', lineHeight: 1.55 }}>
          <li>Número de pisos: {pisosReferencia}.</li>
          {CHECKLIST_INGENIERO.map(item => <li key={item}>{item}</li>)}
        </ul>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-secondary" onClick={copiarLista}>
            {copiado ? '✅ Listo' : '📋 Copiar lista para el ingeniero'}
          </button>
          <button className="btn-whatsapp" onClick={compartirWhatsApp}>
            📲 Compartir por WhatsApp
          </button>
        </div>
      </div>

      <p className="aviso-legal" style={{ marginTop: 16 }}>
        La app no hace análisis sísmico ni firma planos. Para 3–5 pisos, el metrado se hace de los
        planos aprobados por un ingeniero. No compres acero ni concreto de la estructura sin planos.
      </p>
    </div>
  );
};
