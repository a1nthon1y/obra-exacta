import React, { useState } from 'react';
import { useObraStore, CATALOGO, totalizarObra } from '../store/obraStore';
import { exportarReportePdf } from '../utils/exportarPdf';

const FECHA_PRECIOS = 'Octubre 2026, Lima';

function fechaHoy(): string {
  return new Date().toLocaleDateString('es-PE');
}

// Fuera del componente para no marcar impureza en render (oxlint react/purity)
function labelPrecioUnidad(unidad: string) {
  if (unidad.includes('varilla')) return 'varilla';
  if (unidad.includes('bolsa')) return 'bolsa';
  if (unidad === 'gal') return 'gal';
  if (unidad === 'und') return 'und';
  if (unidad === 'kg') return 'kg';
  if (unidad === 'm³') return 'm³';
  if (unidad === 'm²') return 'm²';
  return unidad;
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    cursor: 'pointer',
    fontFamily: 'inherit',
    lineHeight: 1.35,
    background: active ? 'var(--c-accent-dim)' : 'var(--c-surface2)',
    borderColor: active ? 'var(--c-accent)' : 'var(--c-border)',
    color: active ? 'var(--c-text)' : 'var(--c-muted)',
  };
}

export const MiObra: React.FC<{ onIrCalculadoras: () => void }> = ({ onIrCalculadoras }) => {
  const etapas    = useObraStore(s => s.etapas);
  const precios   = useObraStore(s => s.precios);
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const quitarEtapa = useObraStore(s => s.quitarEtapa);
  const setPrecio = useObraStore(s => s.setPrecio);
  const quitarPrecio = useObraStore(s => s.quitarPrecio);
  const limpiarPrecios = useObraStore(s => s.limpiarPrecios);

  const [filtro, setFiltro] = useState<string>(() => {
    if (!proyectoActivoId) return 'todo';
    return etapas.some(e => e.proyectoId === proyectoActivoId) ? proyectoActivoId : 'todo';
  });
  const [pisoFiltro, setPisoFiltro] = useState<'todos' | number>('todos');

  const proyectoSeleccionado = proyectos.find(p => p.id === filtro) ?? null;
  const pisosProyecto = proyectoSeleccionado
    ? Array.from({ length: proyectoSeleccionado.pisos }, (_, i) => i + 1)
    : [];

  const etapasFiltradas = etapas.filter(e => {
    if (filtro === 'todo') return true;
    if (filtro === 'casa') return !e.proyectoId;
    if (e.proyectoId !== filtro) return false;
    if (pisoFiltro !== 'todos' && e.piso !== pisoFiltro) return false;
    return true;
  });

  const { lineas, totalSoles } = totalizarObra(etapasFiltradas, precios);
  const grupos = [...new Set(lineas.map(l => l.grupo))];
  const hayProyectos = proyectos.length > 0 || etapas.some(e => !!e.proyectoId);

  const scopeLabel = filtro === 'todo'
    ? 'Toda la obra'
    : filtro === 'casa'
      ? 'Casa / obra general'
      : `${proyectoSeleccionado?.nombre ?? 'Proyecto'}${pisoFiltro === 'todos' ? ' · Todos los pisos' : ` · Piso ${pisoFiltro}`}`;

  const hayPreciosEditados = Object.keys(precios).length > 0;

  const filtrosUI = (
    <div style={{ marginBottom: 14 }}>
      {hayProyectos && (
        <>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Ver metrado
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              type="button"
              className="etapa-tag"
              aria-pressed={filtro === 'todo'}
              style={chipStyle(filtro === 'todo')}
              onClick={() => { setFiltro('todo'); setPisoFiltro('todos'); }}
            >
              Toda la obra
            </button>
            <button
              type="button"
              className="etapa-tag"
              aria-pressed={filtro === 'casa'}
              style={chipStyle(filtro === 'casa')}
              onClick={() => { setFiltro('casa'); setPisoFiltro('todos'); }}
            >
              Casa / general
            </button>
            {proyectos.map(p => (
              <button
                key={p.id}
                type="button"
                className="etapa-tag"
                aria-pressed={filtro === p.id}
                style={chipStyle(filtro === p.id)}
                onClick={() => { setFiltro(p.id); setPisoFiltro('todos'); }}
              >
                🏢 {p.nombre}
              </button>
            ))}
          </div>
        </>
      )}

      {proyectoSeleccionado && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: hayProyectos ? 8 : 0 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Piso
          </span>
          <button
            type="button"
            className="etapa-tag"
            aria-pressed={pisoFiltro === 'todos'}
            style={chipStyle(pisoFiltro === 'todos')}
            onClick={() => setPisoFiltro('todos')}
          >
            Todos
          </button>
          {pisosProyecto.map(n => (
            <button
              key={n}
              type="button"
              className="etapa-tag"
              aria-pressed={pisoFiltro === n}
              style={chipStyle(pisoFiltro === n)}
              onClick={() => setPisoFiltro(n)}
            >
              Piso {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  function compartirWhatsApp() {
    const etapasUsadas = [...new Set(etapasFiltradas.map(e => {
      const proyectoNombre = e.proyectoNombre
        ?? (e.proyectoId ? proyectos.find(p => p.id === e.proyectoId)?.nombre : undefined);
      const base = `${e.titulo}${e.piso ? ` P${e.piso}` : ''}`;
      return filtro === 'todo' && proyectoNombre ? `${base} (${proyectoNombre})` : base;
    }))].join(' · ');

    let texto = `*OBRA EXACTA — ${scopeLabel.toUpperCase()}*\n`;
    texto += `📅 Calculado el ${fechaHoy()}\n`;
    texto += `Partidas: ${etapasUsadas}\n\n`;

    for (const grupo of grupos) {
      texto += `*${grupo.toUpperCase()}*\n`;
      lineas.filter(l => l.grupo === grupo).forEach(l => {
        texto += `• ${l.nombre}: ${l.cantidad} ${l.unidad} — S/ ${l.subtotal.toFixed(0)}\n`;
        if (l.desglose) texto += `  ↳ ${l.desglose}\n`;
      });
      texto += '\n';
    }

    texto += `*TOTAL ESTIMADO: S/ ${totalSoles.toFixed(0)}*\n`;
    texto += `\nPrecios de referencia ${FECHA_PRECIOS}.\n`;
    texto += `Cantidades referenciales. Confirmar con el capataz.`;

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  function exportarPdf() {
    const etapasStr = etapasFiltradas
      .map(e => `${e.titulo}${e.piso ? ` · Piso ${e.piso}` : ''} (${e.detalle})`)
      .join(', ');
    exportarReportePdf({
      titulo: `Presupuesto Consolidado de Materiales — ${scopeLabel}`,
      etapasStr,
      totalEstimado: totalSoles,
      items: lineas.map(l => ({
        nombre: l.nombre,
        cantidad: l.cantidad,
        unidad: l.unidad,
        desglose: l.desglose,
        precio: l.precio,
        subtotal: l.subtotal,
      })),
      pasos: [
        `Alcance: ${scopeLabel}. ${etapasFiltradas.length} partida(s) incluidas.`,
        `Consolidado de ${etapasFiltradas.length} etapa(s) de obra sumadas antes del redondeo comercial.`,
        `Precios referenciales actualizados al mercado de Lima/Perú.`,
      ],
    });
  }

  if (etapas.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="e-icon">🏗️</div>
          <p>Todavía no hay etapas en tu obra.<br />Calcula una etapa y toca <strong>"+ Agregar a Mi obra"</strong>.</p>
          <button className="btn-primary" style={{ marginTop: 18, maxWidth: 280 }} onClick={onIrCalculadoras}>
            📐 Ir a las calculadoras
          </button>
        </div>
      </div>
    );
  }

  if (etapasFiltradas.length === 0) {
    return (
      <div className="page">
        {filtrosUI}
        <div className="empty-state">
          <div className="e-icon">📐</div>
          <p>No hay partidas en <strong>{scopeLabel}</strong>.</p>
          <button className="btn-primary" style={{ marginTop: 18, maxWidth: 280 }} onClick={onIrCalculadoras}>
            📐 Ir a las calculadoras
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {filtrosUI}

      {/* Banner total */}
      <div className="obra-total-banner">
        <div>
          <div className="obra-total-label">Total estimado · {scopeLabel}</div>
          <div className="obra-total-valor">S/ {totalSoles.toFixed(0)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--c-muted)', marginTop: 4 }}>
            Precios de ref. {FECHA_PRECIOS} · {etapasFiltradas.length} partida{etapasFiltradas.length === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ fontSize: '2.5rem' }}>🏗️</div>
      </div>

      {/* Etapas incluidas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {etapasFiltradas.map((e) => {
          const idxReal = etapas.indexOf(e);
          const proyectoNombre = e.proyectoNombre
            ?? (e.proyectoId ? proyectos.find(p => p.id === e.proyectoId)?.nombre : undefined);
          return (
            <span key={`${e.timestamp}-${idxReal}`} className="etapa-tag">
              {e.titulo} <span style={{ opacity: 0.7 }}>· {e.detalle}</span>
              {e.piso ? <span style={{ color: 'var(--c-text)', opacity: 0.8 }}>· Piso {e.piso}</span> : null}
              {filtro === 'todo' && proyectoNombre ? <span style={{ opacity: 0.7 }}>· {proyectoNombre}</span> : null}
              <button onClick={() => quitarEtapa(idxReal)} title="Quitar etapa" aria-label={`Quitar etapa ${e.titulo}`}>✕</button>
            </span>
          );
        })}
      </div>

      {/* Lista de materiales agrupada */}
      <div className="mats-card" style={{ marginBottom: 14 }}>
        {grupos.map(grupo => (
          <div key={grupo}>
            <div className="grupo-titulo">{grupo}</div>
            {lineas.filter(l => l.grupo === grupo).map((l) => {
              const precioActual = precios[l.id] ?? CATALOGO[l.id]?.precio ?? 0;
              return (
                <div key={l.id} className="obra-mat-fila">
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <div className="obra-mat-nombre">{l.nombre}</div>
                    <div className="obra-badge-compra">
                      <span className="obra-badge-num">{l.cantidad}</span>
                      <span className="obra-badge-und">{l.unidad}</span>
                    </div>
                    {l.desglose && (
                      <div className="mat-desglose-box">
                        ↳ {l.desglose}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--c-muted)', marginBottom: 2 }}>S/ por {labelPrecioUnidad(CATALOGO[l.id]?.unidad ?? l.unidad)}</div>
                      <input
                        className="obra-precio-input"
                        type="number"
                        inputMode="decimal"
                        value={precioActual}
                        onChange={e => setPrecio(l.id, Number(e.target.value))}
                      />
                      {precios[l.id] !== undefined && precios[l.id] !== CATALOGO[l.id]?.precio && (
                        <button
                          type="button"
                          onClick={() => quitarPrecio(l.id)}
                          title={`Volver al precio de referencia (S/ ${CATALOGO[l.id]?.precio ?? 0})`}
                          aria-label={`Restablecer precio de ${l.nombre}`}
                          style={{
                            marginTop: 4, background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.62rem', color: 'var(--c-muted)', textDecoration: 'underline',
                            padding: 0, fontFamily: 'inherit',
                          }}
                        >
                          ↺ ref. S/ {CATALOGO[l.id]?.precio ?? 0}
                        </button>
                      )}
                    </div>
                    <div className="obra-subtotal">S/ {(l.cantidad * precioActual).toFixed(0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {hayPreciosEditados && (
        <button
          type="button"
          onClick={limpiarPrecios}
          style={{
            display: 'block', margin: '0 auto 14px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '0.72rem', color: 'var(--c-muted)',
            textDecoration: 'underline', fontFamily: 'inherit', padding: '4px',
          }}
        >
          ↺ Restablecer todos los precios a los de referencia ({FECHA_PRECIOS})
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button className="btn-whatsapp" onClick={compartirWhatsApp}>
          <span>📲</span> Compartir por WhatsApp
        </button>

        <button className="btn-pdf" type="button" onClick={exportarPdf}>
          <span>📄</span> Descargar / Imprimir Presupuesto en PDF
        </button>
      </div>

      <p className="aviso-legal" style={{ marginTop: 16 }}>
        Cantidades referenciales. Confirmar con el maestro o capataz antes de comprar.
      </p>
    </div>
  );
};
