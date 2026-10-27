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

export default function App() {
  const [tab, setTab]   = useState<Tab>('inicio');
  const [calc, setCalc] = useState<Calc>(null);
  const [enEdificio, setEnEdificio] = useState(false);
  const etapas = useObraStore(s => s.etapas);
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const pisoActivo = useObraStore(s => s.pisoActivo);
  const proyectoActivo = proyectos.find(p => p.id === proyectoActivoId) ?? null;

  // Cada cambio de pantalla debe empezar arriba.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab, calc, enEdificio]);

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
    <div id="app" className="app-shell">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <button
            className="header-logo"
            onClick={volverInicio}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span>⚒️</span> Obra Exacta
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
                <h1>Tu obra, calculada</h1>
                <p>
                  Entra las medidas de tu obra y te decimos cuánto material comprar.
                  Sin cuentas, sin pagos — todo en tu teléfono.
                </p>
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

            {/* Aviso referencial */}
            <p className="aviso-legal" style={{ marginTop: 20 }}>
              Obra Exacta muestra cantidades referenciales basadas en prácticas habituales peruanas (RNE).<br />
              Confirmar las cantidades con el maestro de obra y las medidas estructurales con un ingeniero colegiado.
            </p>
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
