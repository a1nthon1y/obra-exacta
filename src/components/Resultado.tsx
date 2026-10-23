import React, { useState } from 'react';
import type { Aviso, ResultadoCalculo } from '../engine/types';
import { useObraStore, CATALOGO } from '../store/obraStore';
import type { EtapaGuardada } from '../store/obraStore';
import { exportarReportePdf } from '../utils/exportarPdf';

interface Props {
  resultado: ResultadoCalculo;
  idCalc: string;
  esEjemplo: boolean;
}

export const Resultado: React.FC<Props> = ({ resultado, idCalc, esEjemplo }) => {
  const [pastosAbiertos, setPastosAbiertos] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const agregarEtapa = useObraStore(s => s.agregarEtapa);
  const precios = useObraStore(s => s.precios);

  const hayBad = resultado.avisos.some(a => a.n === 'bad');

  const avisoOrden: Aviso[] = [
    ...resultado.avisos.filter(a => a.n === 'bad'),
    ...resultado.avisos.filter(a => a.n === 'warn'),
    ...resultado.avisos.filter(a => a.n === 'ok'),
  ];

  const okCount = resultado.avisos.filter(a => a.n === 'ok').length;

  function handleAgregar() {
    if (hayBad) { setConfirmar(true); return; }
    doAgregar();
  }

  function doAgregar() {
    const etapa: EtapaGuardada = {
      id: idCalc,
      titulo: resultado.titulo,
      detalle: resultado.detalle,
      resultado,
      timestamp: Date.now(),
    };
    agregarEtapa(etapa);
    setConfirmar(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  }

  const totalEstimado = resultado.mats.reduce((acc, m) => {
    const cat = CATALOGO[m.id];
    const precio = precios[m.id] ?? cat?.precio ?? 0;
    return acc + m.comprar * precio;
  }, 0);

  function imprimirPdf() {
    exportarReportePdf({
      titulo: `Presupuesto de Materiales — ${resultado.titulo}`,
      etapasStr: `${resultado.titulo} (${resultado.detalle})`,
      totalEstimado,
      items: resultado.mats.map(m => {
        const cat = CATALOGO[m.id];
        const precio = precios[m.id] ?? cat?.precio ?? 0;
        return {
          nombre: cat?.nombre ?? m.id,
          cantidad: m.comprar,
          unidad: cat?.unidad ?? '',
          desglose: m.desglose ?? m.nota,
          precio,
          subtotal: m.comprar * precio,
        };
      }),
      pasos: resultado.pasos,
      avisos: resultado.avisos.map(a => a.t),
    });
  }

  return (
    <div className="resultado">
      {/* Avisos */}
      {avisoOrden.length > 0 && (
        <div className="avisos-lista">
          {avisoOrden
            .filter(a => a.n !== 'ok')
            .map((a, i) => (
              <div key={i} className={`aviso ${a.n}`}>
                <span className="aviso-icon">
                  {a.n === 'bad' ? '🔴' : '🟡'}
                </span>
                {a.t}
              </div>
            ))}
          {okCount > 0 && (
            <div className="aviso ok">
              <span className="aviso-icon">🟢</span>
              Cumple {okCount} regla{okCount > 1 ? 's' : ''} mínima{okCount > 1 ? 's' : ''} habitual{okCount > 1 ? 'es' : ''}. Esto no certifica la obra.
            </div>
          )}
        </div>
      )}

      {/* Resumen */}
      <div className="resumen-card">
        <div className="resumen-titulo">
          {resultado.titulo}
          {esEjemplo && <span className="ejemplo-badge">EJEMPLO</span>}
          <span className="resumen-detalle">{resultado.detalle}</span>
        </div>
        <div className="resumen-grid">
          {resultado.resumen.map((r, i) => (
            <div key={i} className="resumen-item">
              <div className="r-label">{r.nombre}</div>
              <div className="r-valor">{r.valor}</div>
              <div className="r-unidad">{r.unidad}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Materiales */}
      <div className="mats-card">
        <div className="mats-header">Qué comprar en ferretería</div>
        {resultado.mats.map((m, i) => {
          const cat = CATALOGO[m.id];
          const precio = precios[m.id] ?? cat?.precio ?? 0;
          return (
            <div key={i} className="mat-fila">
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <div className="mat-nombre">{cat?.nombre ?? m.id}</div>
                {m.nota && <div className="mat-nota">{m.nota}</div>}
                {m.desglose && (
                  <div className="mat-desglose-box">
                    ↳ {m.desglose}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="mat-badge-compra">
                  <span className="mat-badge-num">{m.comprar}</span>
                  <span className="mat-badge-und">{cat?.unidad ?? ''}</span>
                </div>
                {precio > 0 && (
                  <div className="mat-subtotal-soles">
                    S/ {(m.comprar * precio).toFixed(0)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Pasos */}
        <button className="pasos-toggle" onClick={() => setPastosAbiertos(p => !p)}>
          <span>{pastosAbiertos ? '▲' : '▼'}</span>
          Cómo se calculó
        </button>
        {pastosAbiertos && (
          <div className="pasos-content">
            {resultado.pasos.map((p, i) => (
              <div key={i} className="paso-linea">{p}</div>
            ))}
          </div>
        )}
      </div>

      {/* Total estimado */}
      {totalEstimado > 0 && (
        <div style={{ textAlign: 'right', color: 'var(--c-muted)', fontSize: '0.82rem', marginBottom: '10px' }}>
          Estimado: <strong style={{ color: 'var(--c-text)', fontFamily: 'var(--font-mono)' }}>S/ {totalEstimado.toFixed(0)}</strong>
          <span style={{ fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>Precios de referencia (Lima, oct-2026). Toca el S/ c/u en Mi obra para ajustarlos a tu ferretería.</span>
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button className="btn-miobra" style={{ flex: 1.3 }} onClick={handleAgregar}>
          {guardado ? '✓ Guardado' : '+ Agregar a Mi obra'}
        </button>
        <button
          type="button"
          className="btn-pdf"
          style={{ flex: 1 }}
          onClick={imprimirPdf}
        >
          <span>📄</span> Imprimir / PDF
        </button>
      </div>

      {/* Aviso legal */}
      <p className="aviso-legal">
        Obra Exacta calcula cantidades referenciales y muestra mínimos habituales del RNE.<br />
        No es un diseño estructural. Confirmar con el maestro o capataz antes de comprar.
      </p>

      {/* Confirmación si hay bad */}
      {confirmar && (
        <div className="confirm-overlay" onClick={() => setConfirmar(false)}>
          <div className="confirm-panel" onClick={e => e.stopPropagation()}>
            <h3>🔴 Hay medidas por revisar</h3>
            <p>
              Una o más medidas están por debajo del mínimo habitual.
              ¿Agregar igual a Mi obra para tenerlo como referencia?
            </p>
            <div className="confirm-btns">
              <button className="btn-secondary" onClick={() => setConfirmar(false)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={doAgregar} style={{ flex: 1, marginTop: 0 }}>
                Agregar igual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
