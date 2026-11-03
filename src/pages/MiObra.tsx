import React, { useRef, useState } from 'react';
import { useObraStore, CATALOGO, totalizarObra } from '../store/obraStore';
import { exportarReportePdf } from '../utils/exportarPdf';
import {
  nombreArchivoRespaldo,
  parsearRespaldo,
  serializarRespaldo,
} from '../store/respaldo';

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
  const pisoActivo = useObraStore(s => s.pisoActivo);
  const quitarEtapa = useObraStore(s => s.quitarEtapa);
  const setPrecio = useObraStore(s => s.setPrecio);
  const quitarPrecio = useObraStore(s => s.quitarPrecio);
  const limpiarPrecios = useObraStore(s => s.limpiarPrecios);
  const cargarRespaldo = useObraStore(s => s.cargarRespaldo);
  const moverEtapa = useObraStore(s => s.moverEtapa);
  const copiarEtapaAPisos = useObraStore(s => s.copiarEtapaAPisos);

  const fileRef = useRef<HTMLInputElement>(null);
  const [respaldoMsg, setRespaldoMsg] = useState<{ tipo: 'ok' | 'bad'; texto: string } | null>(null);
  const [partidaSel, setPartidaSel] = useState('');
  const [destinoProyecto, setDestinoProyecto] = useState('casa');
  const [destinoPiso, setDestinoPiso] = useState('1');
  const [organizarMsg, setOrganizarMsg] = useState<{ tipo: 'ok' | 'bad'; texto: string } | null>(null);

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
  const proyectoDestino = proyectos.find(p => p.id === destinoProyecto) ?? null;
  const pisosDestino = proyectoDestino
    ? Array.from({ length: proyectoDestino.pisos }, (_, i) => i + 1)
    : [];
  const etapaSeleccionada = partidaSel === '' ? null : etapas[Number(partidaSel)] ?? null;

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
    texto += `Cantidades referenciales. Las medidas estructurales debe validarlas un ingeniero colegiado.`;

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

  function exportarRespaldo() {
    const json = serializarRespaldo({ etapas, precios, proyectos, proyectoActivoId, pisoActivo });
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivoRespaldo();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setRespaldoMsg({
      tipo: 'ok',
      texto: `Respaldo descargado con ${etapas.length} partida(s) y ${proyectos.length} proyecto(s).`,
    });
  }

  async function importarRespaldo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setRespaldoMsg(null);
    try {
      const parsed = parsearRespaldo(await file.text());
      if (!parsed.ok) {
        setRespaldoMsg({ tipo: 'bad', texto: parsed.error });
        return;
      }

      const hayDatos = etapas.length > 0 || proyectos.length > 0 || Object.keys(precios).length > 0;
      if (hayDatos && !window.confirm(
        `Este respaldo reemplazará tu obra actual (${etapas.length} partida(s), ${proyectos.length} proyecto(s)). ¿Continuar?`
      )) return;

      cargarRespaldo(parsed.data);
      setFiltro('todo');
      setPisoFiltro('todos');
      setRespaldoMsg({
        tipo: 'ok',
        texto: `Respaldo importado: ${parsed.data.etapas.length} partida(s), ${parsed.data.proyectos.length} proyecto(s) y ${Object.keys(parsed.data.precios).length} precio(s) propios.`,
      });
    } catch {
      setRespaldoMsg({ tipo: 'bad', texto: 'No se pudo leer el archivo. Intenta descargarlo de nuevo.' });
    }
  }

  function moverPartida() {
    if (partidaSel === '') return;
    const idx = Number(partidaSel);
    if (!Number.isInteger(idx) || !etapas[idx]) return;
    const piso = proyectoDestino ? Number(destinoPiso) : undefined;
    moverEtapa(idx, { proyectoId: proyectoDestino?.id, piso });
    const destino = proyectoDestino
      ? `${proyectoDestino.nombre} · Piso ${piso ?? 1}`
      : 'Casa / obra general';
    setOrganizarMsg({ tipo: 'ok', texto: `Partida movida a ${destino}.` });
    setFiltro(proyectoDestino?.id ?? 'casa');
    setPisoFiltro('todos');
  }

  function copiarPartida() {
    if (partidaSel === '') return;
    const idx = Number(partidaSel);
    if (!proyectoDestino || !Number.isInteger(idx) || !etapas[idx]) return;
    copiarEtapaAPisos(idx, proyectoDestino.id);
    setOrganizarMsg({
      tipo: 'ok',
      texto: `Copias creadas en los pisos de ${proyectoDestino.nombre}.`,
    });
    setFiltro(proyectoDestino.id);
    setPisoFiltro('todos');
  }

  const inputRespaldo = (
    <input
      ref={fileRef}
      type="file"
      accept=".json,application/json"
      style={{ display: 'none' }}
      onChange={importarRespaldo}
      tabIndex={-1}
      aria-hidden="true"
    />
  );

  const mensajeRespaldo = respaldoMsg ? (
    <div className={`aviso ${respaldoMsg.tipo}`} style={{ marginTop: 10 }} role="status">
      <span className="aviso-icon">{respaldoMsg.tipo === 'ok' ? '✅' : '🔴'}</span>
      {respaldoMsg.texto}
    </div>
  ) : null;

  const mensajeOrganizar = organizarMsg ? (
    <div className={`aviso ${organizarMsg.tipo}`} style={{ marginTop: 10 }} role="status">
      <span className="aviso-icon">{organizarMsg.tipo === 'ok' ? '✅' : '🔴'}</span>
      {organizarMsg.texto}
    </div>
  ) : null;

  if (etapas.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="e-icon">🏗️</div>
          <p>Todavía no hay etapas en tu obra.<br />Calcula una etapa y toca <strong>"+ Agregar a Mi obra"</strong>.</p>
          <button className="btn-primary" style={{ marginTop: 18, maxWidth: 280 }} onClick={onIrCalculadoras}>
            📐 Ir a las calculadoras
          </button>
          <button
            className="btn-secondary"
            type="button"
            style={{ marginTop: 8, maxWidth: 280 }}
            onClick={() => fileRef.current?.click()}
          >
            ⬆ Importar respaldo (.json)
          </button>
          {inputRespaldo}
          {mensajeRespaldo}
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

      {hayProyectos && (
        <div className="form-card" style={{ marginTop: 0, marginBottom: 14 }}>
          <div className="form-section-title">Organizar partidas por piso</div>
          <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--c-muted)', lineHeight: 1.5 }}>
            Mueve una partida a otro proyecto o piso, o cópiala a todos los pisos del proyecto.
          </p>

          <div className="campo">
            <label htmlFor="org-partida">Partida <span className="unidad">(elige una)</span></label>
            <select
              id="org-partida"
              value={partidaSel}
              onChange={e => { setPartidaSel(e.target.value); setOrganizarMsg(null); }}
            >
              <option value="">Selecciona una partida</option>
              {etapas.map((e, idx) => {
                const pn = e.proyectoNombre
                  ?? (e.proyectoId ? proyectos.find(p => p.id === e.proyectoId)?.nombre : undefined);
                return (
                  <option key={`${e.timestamp}-${idx}`} value={idx}>
                    {e.titulo}{e.piso ? ` · Piso ${e.piso}` : ''}{pn ? ` · ${pn}` : ''} — {e.detalle}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="org-proyecto">Proyecto destino</label>
            <select
              id="org-proyecto"
              value={destinoProyecto}
              onChange={e => { setDestinoProyecto(e.target.value); setDestinoPiso('1'); setOrganizarMsg(null); }}
            >
              <option value="casa">Casa / obra general</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {proyectoDestino && (
            <div className="campo">
              <label htmlFor="org-piso">Piso destino</label>
              <select
                id="org-piso"
                value={destinoPiso}
                onChange={e => { setDestinoPiso(e.target.value); setOrganizarMsg(null); }}
              >
                {pisosDestino.map(n => <option key={n} value={n}>Piso {n}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn-secondary" disabled={!etapaSeleccionada} onClick={moverPartida}>
              Mover
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!etapaSeleccionada || !proyectoDestino}
              onClick={copiarPartida}
            >
              Copiar a todos los pisos
            </button>
          </div>
          {mensajeOrganizar}
        </div>
      )}

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
                        aria-label={`Precio por ${labelPrecioUnidad(CATALOGO[l.id]?.unidad ?? l.unidad)} de ${l.nombre}`}
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

      <div className="form-card" style={{ marginTop: 16 }}>
        <div className="form-section-title">Respaldo de la obra</div>
        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--c-muted)', lineHeight: 1.5 }}>
          Descarga un archivo JSON con todas las partidas, precios y proyectos. Sirve para
          guardar una copia o restaurar la obra en otro teléfono.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn-secondary" type="button" onClick={exportarRespaldo}>
            ⬇ Descargar respaldo
          </button>
          <button className="btn-secondary" type="button" onClick={() => fileRef.current?.click()}>
            ⬆ Importar respaldo
          </button>
        </div>
        {inputRespaldo}
        {mensajeRespaldo}
      </div>

      <p className="aviso-legal" style={{ marginTop: 16 }}>
        Cantidades referenciales: confírmalas con el maestro de obra. Las medidas estructurales, con un ingeniero colegiado.
      </p>
    </div>
  );
};
