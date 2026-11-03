import { useEffect, useState } from 'react';
import { useObraStore } from './store/obraStore';
import { CalcCimientos } from './pages/CalcCimientos';
import { CalcZapata }    from './pages/CalcZapata';
import { CalcMuros }    from './pages/CalcMuros';
import { CalcColumnas } from './pages/CalcColumnas';
import { CalcVigas, CalcLosa } from './pages/CalcVigasLosa';
import { CalcAcabados }  from './pages/CalcAcabados';
import { CalcEscalera }  from './pages/CalcEscalera';
import { MiObra }        from './pages/MiObra';
import { Edificio }      from './pages/Edificio';
import { ETAPAS, getEtapa } from './config/etapas';
import type { EtapaId } from './config/etapas';

type Tab = 'inicio' | 'obra';
type Calc = EtapaId | null;

const PREGUNTAS_FRECUENTES = [
  {
    pregunta: '¿Cómo calcula Metra Perú los materiales?',
    respuesta:
      'Convierte las medidas de cada elemento en volumen o área y aplica dosificaciones de Capeco y criterios del RNE. Para concreto usa bolsas de 42.5 kg, arena gruesa, piedra chancada y agua; para muros, ladrillo King Kong 18 huecos o pandereta; para acero, varillas de 9 m y estribos.',
  },
  {
    pregunta: "¿Cuántas bolsas de cemento se necesitan por m³ de concreto f'c 210?",
    respuesta:
      'Según la tabla Capeco para f\'c 210 kg/cm² con agregado de 1/2", se requieren 9.73 bolsas de 42.5 kg, 0.52 m³ de arena gruesa, 0.53 m³ de piedra chancada y 0.186 m³ de agua por metro cúbico de concreto.',
  },
  {
    pregunta: '¿Cuántos ladrillos King Kong entran por m² de muro?',
    respuesta:
      'Para King Kong 18 huecos de 24×13×9 cm, junta de 1.5 cm y aparejo de soga, entran 37 unidades por m². Con 5% de desperdicio se compran aproximadamente 39. En cabeza son 62 und/m² y en canto 25 und/m².',
  },
  {
    pregunta: '¿Es gratis y funciona sin internet?',
    respuesta:
      'Sí. Metra Perú es gratuita, no pide registro ni correo. Después de la primera visita, la app queda guardada en tu navegador y puedes seguir calculando sin conexión. Tus partidas se guardan solo en este dispositivo.',
  },
  {
    pregunta: '¿Puedo marcar lo que ya compré?',
    respuesta:
      'Sí. En Mi obra cada material tiene un check. Marca lo que ya compraste, mira el avance de tu lista y compártela por WhatsApp con tu maestro o con la ferretería. La lista también viaja en el respaldo JSON.',
  },
  {
    pregunta: '¿Puedo usarla para un edificio de 3 a 5 pisos?',
    respuesta:
      'Sí, con planos. La sección Edificio te permite organizar las partidas por piso, pero no sugiere medidas estructurales para 3 a 5 pisos: esas las define un ingeniero colegiado.',
  },
] as const;

export default function App() {
  const [tab, setTab]   = useState<Tab>('inicio');
  const [calc, setCalc] = useState<Calc>(null);
  const [enEdificio, setEnEdificio] = useState(false);
  const [modoObra, setModoObra] = useState(() => {
    try {
      return localStorage.getItem('metra-modo-obra') === '1';
    } catch {
      return false;
    }
  });
  const etapas = useObraStore(s => s.etapas);
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const pisoActivo = useObraStore(s => s.pisoActivo);
  const proyectoActivo = proyectos.find(p => p.id === proyectoActivoId) ?? null;

  // Cada cambio de pantalla debe empezar arriba.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab, calc, enEdificio]);

  // Modo obra: alto contraste y letras grandes para usar en campo.
  useEffect(() => {
    try {
      localStorage.setItem('metra-modo-obra', modoObra ? '1' : '0');
    } catch {
      // Sin almacenamiento: el modo funciona igual durante la sesión.
    }
  }, [modoObra]);

  // Título de la pestaña según la pantalla: útil para compartir y para el historial.
  useEffect(() => {
    if (calc) {
      document.title = `${getEtapa(calc).nombre} | Metra Perú`;
    } else if (enEdificio) {
      document.title = 'Edificio de 3 a 5 pisos | Metra Perú';
    } else if (tab === 'obra') {
      document.title = 'Mi obra y lista de compra | Metra Perú';
    } else {
      document.title = 'Calculadora de materiales de construcción | Metra Perú';
    }
  }, [calc, enEdificio, tab]);

  function abrirCalc(id: Calc) {
    setEnEdificio(false);
    setCalc(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function volverInicio() {
    setEnEdificio(false);
    setCalc(null);
    setTab('inicio');
  }

  // Render de calculadora activa
  const renderCalc = () => {
    if (!calc) return null;
    const back = () => { setCalc(null); };
    try {
      switch (calc) {
        case 'cimientos': return <CalcCimientos onBack={back} />;
        case 'zapata':     return <CalcZapata     onBack={back} />;
        case 'muros':     return <CalcMuros     onBack={back} />;
        case 'columnas':  return <CalcColumnas  onBack={back} />;
        case 'vigas':     return <CalcVigas     onBack={back} />;
        case 'losa':      return <CalcLosa      onBack={back} />;
        case 'escalera':  return <CalcEscalera  onBack={back} />;
        case 'acabados':  return <CalcAcabados  onBack={back} />;
        default:          console.error('[APP] DESCONOCIDA', calc); return <div style={{ padding: 20 }}>Calculadora: {String(calc)}</div>;
      }
    } catch (e) {
      console.error('[APP] Error renderizando', calc, e);
      return <div style={{ padding: 20 }}>Error al abrir {calc}. Revisa la consola.</div>;
    }
  };

  return (
    <div id="app" className={`app-shell ${modoObra ? 'modo-obra' : ''}`}>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <button
            className="header-logo"
            onClick={volverInicio}
            aria-label="Metra Perú, ir al inicio"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span className="brand-mark" aria-hidden="true">📐</span>
            <span className="brand-name">Metra</span>
            <span className="brand-pais">PERÚ</span>
          </button>
          <button
            className={`header-modo ${modoObra ? 'active' : ''}`}
            type="button"
            aria-pressed={modoObra}
            title={modoObra ? 'Desactivar modo obra' : 'Activar modo obra: alto contraste y letras grandes'}
            onClick={() => setModoObra(v => !v)}
          >
            <span aria-hidden="true">🦺</span>
            <span className="modo-label">Obra</span>
          </button>
          <button
            className="header-obra-badge"
            onClick={() => { setEnEdificio(false); setTab('obra'); setCalc(null); }}
          >
            🗂️ Mi obra {etapas.length > 0 && `(${etapas.length})`}
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {modoObra && (
          <div className="modo-obra-strip" role="status">
            🦺 Modo obra activo · letras grandes y alto contraste
          </div>
        )}
        {calc ? (
          renderCalc()
        ) : enEdificio ? (
          <Edificio
            onBack={() => setEnEdificio(false)}
            onIrCalculadoras={() => { setEnEdificio(false); setTab('inicio'); setCalc(null); }}
            onVerObra={() => { setEnEdificio(false); setTab('obra'); setCalc(null); }}
          />
        ) : tab === 'inicio' ? (
          <div className="page">
            {/* Hero: portada de plano */}
            <div className="inicio-portada">
              <div className="portada-tape" aria-hidden="true" />
              <div className="portada-cuerpo">
                <h1>De tu plano a la ferretería</h1>
                <p>
                  Metra Perú convierte las medidas de tu obra en una lista de compra clara.
                  Cemento, arena, ladrillos y fierro con criterios RNE/Capeco, visores 3D
                  y todo en tu teléfono. Sin cuentas, sin pagos.
                </p>
                <div className="portada-sellos" aria-label="Lo que hace diferente a Metra Perú">
                  <span className="sello">🇵🇪 Hecho para Perú</span>
                  <span className="sello">RNE + Capeco</span>
                  <span className="sello">Sin registro</span>
                  <span className="sello">Offline</span>
                </div>
              </div>
            </div>

            {/* Etapas = el orden real de construcción */}
            <div className="inicio-sec-title">El orden de tu obra</div>
            <p className="inicio-nota">
              Cimientos y Zapata son alternativas de cimentación: usa la que indique tu plano.
              El orden mostrado es para albañilería confinada.
            </p>
            <div className="etapas-grid">
              {ETAPAS.map((e, i) => (
                <button key={e.id} className="etapa-card" onClick={() => abrirCalc(e.id)}>
                  <span className="etapa-paso">{String(i + 1).padStart(2, '0')}</span>
                  <span className="etapa-icon">{e.icon}</span>
                  <span className="etapa-nombre">{e.nombre}</span>
                  <span className="etapa-desc">{e.desc}</span>
                </button>
              ))}
            </div>

            {/* Sección Edificio: 3–5 pisos, con planos o derivación a ingeniero */}
            <div className="sugerir-card" style={{ marginTop: 20 }}>
              <div className="sugerir-head">
                <div>
                  <div className="sugerir-title">
                    {proyectoActivo
                      ? `🏢 ${proyectoActivo.nombre}`
                      : '🏢 ¿Edificio de 3 a 5 pisos?'}
                  </div>
                  <div className="sugerir-sub">
                    {proyectoActivo
                      ? `Piso ${pisoActivo} de ${proyectoActivo.pisos}. Las partidas que guardes quedarán en este nivel.`
                      : 'Para 3+ pisos no damos una medida usual: el ingeniero define la estructura. La app te ayuda a meter material con sus planos.'}
                  </div>
                </div>
                <span className="sugerir-beta">{proyectoActivo ? 'EN CURSO' : 'CON PLANOS'}</span>
              </div>
              <button
                className="btn-secondary"
                style={{ marginTop: 10 }}
                onClick={() => { setEnEdificio(true); setCalc(null); setTab('inicio'); }}
              >
                {proyectoActivo ? `Continuar en Piso ${pisoActivo}` : 'Entrar a la sección Edificio'}
              </button>
            </div>

            {/* Contenido visible: ayuda al usuario y da contexto real a buscadores */}
            <section
              className="seo-guia"
              aria-labelledby="guia-materiales"
              style={{
                marginTop: 24,
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius)',
                padding: '16px',
              }}
            >
              <h2
                id="guia-materiales"
                style={{ fontSize: '1.02rem', fontWeight: 800, lineHeight: 1.25, marginBottom: 8 }}
              >
                Calculadora de materiales de construcción en Perú
              </h2>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--c-muted)', marginBottom: 14 }}>
                Metra Perú convierte las medidas de tu plano en una lista de compra: bolsas de
                cemento de 42.5 kg, metros cúbicos de arena gruesa y piedra chancada, ladrillos
                King Kong, varillas de fierro y materiales de acabados. Los cálculos usan
                dosificaciones habituales de Capeco y criterios del Reglamento Nacional de
                Edificaciones (RNE).
              </p>

              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 7 }}>
                ¿Qué puedes calcular?
              </h3>
              <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--c-muted)' }}>
                <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--c-text)' }}>Cimientos y zapatas:</strong> excavación, concreto ciclópeo, sobrecimiento y acero.</li>
                <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--c-text)' }}>Muros:</strong> ladrillo King Kong 18 huecos o pandereta en soga, cabeza o canto, mortero y esbeltez.</li>
                <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--c-text)' }}>Columnas y vigas:</strong> concreto, acero longitudinal, estribos y recubrimiento.</li>
                <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--c-text)' }}>Losa aligerada y escalera:</strong> viguetas, ladrillo de techo, concreto y acero.</li>
                <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--c-text)' }}>Acabados:</strong> tarrajeo, contrapiso, cerámico y pintura.</li>
                <li><strong style={{ color: 'var(--c-text)' }}>Mi obra:</strong> presupuesto en soles, checklist de compra con avance, WhatsApp, PDF y respaldo JSON.</li>
                <li><strong style={{ color: 'var(--c-text)' }}>Modo obra:</strong> alto contraste y letras grandes para revisar la lista en campo, con una mano y bajo el sol.</li>
              </ul>

              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 7 }}>
                Cómo funciona
              </h3>
              <ol style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--c-muted)' }}>
                <li style={{ marginBottom: 4 }}>Elige la etapa de tu obra.</li>
                <li style={{ marginBottom: 4 }}>Ingresa las medidas del plano o usa una medida usual orientativa.</li>
                <li style={{ marginBottom: 4 }}>Revisa la lista de materiales y guárdala en Mi obra.</li>
                <li>Marca lo que ya compraste y comparte la lista por WhatsApp.</li>
              </ol>

              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 4 }}>
                Preguntas frecuentes
              </h3>
              {PREGUNTAS_FRECUENTES.map(({ pregunta, respuesta }, index) => (
                <details
                  key={pregunta}
                  open={index === 0}
                  style={{ borderTop: '1px solid var(--c-border)', padding: '8px 0' }}
                >
                  <summary
                    style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-text)' }}
                  >
                    {pregunta}
                  </summary>
                  <p style={{ marginTop: 6, fontSize: '0.8rem', lineHeight: 1.55, color: 'var(--c-muted)' }}>
                    {respuesta}
                  </p>
                </details>
              ))}

              <p className="aviso-legal" style={{ marginTop: 12, paddingBottom: 0, textAlign: 'left' }}>
                <strong>Antes de comprar:</strong> las cantidades son referenciales y dependen del
                tipo de suelo, los planos y las prácticas de tu zona. Confirma el metrado con tu
                maestro de obra y las medidas estructurales con un ingeniero colegiado.
              </p>
            </section>

            <footer
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--c-border)',
                textAlign: 'center',
                fontSize: '0.7rem',
                color: 'var(--c-muted)',
                lineHeight: 1.55,
              }}
            >
              Metra Perú · De tu plano a la ferretería<br />
              Tus datos se guardan solo en este navegador. Sin cuentas ni publicidad.
            </footer>
          </div>
        ) : (
          <MiObra onIrCalculadoras={() => { setEnEdificio(false); setTab('inicio'); setCalc(null); }} />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button
          id="nav-inicio"
          className={`nav-tab ${tab === 'inicio' && !calc && !enEdificio ? 'active' : ''}`}
          onClick={volverInicio}
        >
          <span className="nav-icon">🏠</span>
          Inicio
        </button>
        {enEdificio && !calc && (
          <button
            id="nav-edificio"
            className="nav-tab active"
            onClick={() => { setEnEdificio(true); setCalc(null); setTab('inicio'); }}
          >
            <span className="nav-icon">🏢</span>
            Edificio
          </button>
        )}
        {calc && (
          <button
            id="nav-calculadora"
            className="nav-tab active"
          >
            <span className="nav-icon">{getEtapa(calc).icon}</span>
            {getEtapa(calc).nombre}
          </button>
        )}
        <button
          id="nav-mi-obra"
          className={`nav-tab ${tab === 'obra' && !calc && !enEdificio ? 'active' : ''}`}
          onClick={() => { setEnEdificio(false); setTab('obra'); setCalc(null); }}
        >
          <span className="nav-icon">🗂️</span>
          Mi obra {etapas.length > 0 && <span className="nav-count">{etapas.length}</span>}
        </button>
      </nav>
    </div>
  );
}
