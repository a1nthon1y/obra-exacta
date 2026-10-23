import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  VIEWER_COLORS,
  createDimensionSprite,
  createDimensionLine,
  createStandardRenderer,
  createStandardLights,
  createStandardGrid,
  startAnimationLoop,
  setupResizeHandler,
  addHighlightEdges,
  applyStandardIsoCamera,
  varillaVisual,
} from './viewerUtils';
import { ViewerShell } from './ViewerShell';
import { ConsejosZona } from './ConsejosZona';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('columnas');

interface Props {
  b: number;       // cm — base
  h: number;       // cm — largo
  alto: number;    // m
  nVar: number;    // und — varillas
  dVar: string;    // pulg
  dEst: string;    // pulg — estribo
  rec: number;     // cm — recubrimiento
  campoActivo?: string | null;
}

const HUD: Record<string, string> = {
  b: 'BASE DE LA COLUMNA',
  h: 'LARGO DE LA COLUMNA',
  alto: 'ALTURA DE LA COLUMNA',
  nVar: 'CANTIDAD DE VARILLAS',
  dVar: 'DIÁMETRO DE VARILLAS',
  dEst: 'DIÁMETRO DEL ESTRIBO',
  rec: 'RECUBRIMIENTO',
};

// Radio en px de una varilla, según su diámetro en pulgadas y la escala px/cm
const radioVarPx = (pulg: string, escalaPx: number): number => {
  const partes = pulg.split('/');
  const inch = partes.length === 2 ? Number(partes[0]) / Number(partes[1]) : Number(pulg);
  if (!Number.isFinite(inch) || inch <= 0) return 3;
  return Math.max(3, (inch * 2.54 / 2) * escalaPx);
};

export const ColumnaViewer3D: React.FC<Props> = ({
  b, h, alto, nVar, dVar, dEst, rec, campoActivo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'3d' | 'plano2d' | 'referencia'>('3d');
  const [autoRotate, setAutoRotate] = useState(false);

  // Valores con fallbacks
  const realB = b > 0 ? b : 25;
  const realH = h > 0 ? h : 25;
  const realAlto = alto > 0 ? alto : 2.5;
  const realNVar = Math.min(Math.max(nVar > 0 ? nVar : 4, 1), 12);
  const realRec = rec > 0 ? rec : 4;

  // Escala visual: la columna ocupa bien el cuadro sin importar la medida real
  const visualAlto = Math.min(Math.max(realAlto * 0.8, 1.5), 3.0);
  const escala = visualAlto / realAlto;
  const vB = Math.min(Math.max((realB / 100) * escala, 0.25), 1.1);
  const vH = Math.min(Math.max((realH / 100) * escala, 0.25), 1.1);
  const vRec = Math.min(Math.max((realRec / 100) * escala, 0.03), 0.12);
  const rVar = varillaVisual(dVar, escala, 5, 0.014, 0.045);
  const rEst = varillaVisual(dEst, escala, 4, 0.010, 0.030);

  useEffect(() => {
    if (tab !== '3d' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = 350;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(VIEWER_COLORS.bg);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);

    const renderer = createStandardRenderer(container, width, height);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    applyStandardIsoCamera(camera, controls, Math.max(vB, vH, visualAlto), visualAlto / 2);
    controls.update();

    createStandardLights(scene);
    scene.add(createStandardGrid(6, 12, 0));

    // Concreto semitransparente: deja ver el armado por dentro
    const seccionActiva = campoActivo === 'b' || campoActivo === 'h';
    const concreto = new THREE.Mesh(
      new THREE.BoxGeometry(vB, visualAlto, vH),
      new THREE.MeshStandardMaterial({
        color: VIEWER_COLORS.concrete,
        transparent: true,
        opacity: 0.42,
        roughness: 0.85,
      })
    );
    concreto.position.y = visualAlto / 2;
    scene.add(concreto);
    addHighlightEdges(
      concreto,
      seccionActiva,
      VIEWER_COLORS.highlight,
      VIEWER_COLORS.concreteEdge
    );

    // Varillas perimetrales
    const acero = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5, metalness: 0.6 });
    const insetX = Math.max(vB / 2 - vRec - rVar, rVar + 0.01);
    const insetZ = Math.max(vH / 2 - vRec - rVar, rVar + 0.01);
    for (let i = 0; i < realNVar; i++) {
      const t = (i / realNVar) * Math.PI * 2;
      const cx = Math.cos(t);
      const cz = Math.sin(t);
      const k = Math.max(Math.abs(cx), Math.abs(cz)) || 1; // mapeo al perímetro rect
      const barra = new THREE.Mesh(
        new THREE.CylinderGeometry(rVar, rVar, visualAlto * 0.98, 10),
        acero
      );
      barra.position.set((cx / k) * insetX, visualAlto / 2, (cz / k) * insetZ);
      scene.add(barra);
    }

    // Estribos (anillos rectangulares repartidos en la altura)
    const estriboMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 });
    const nAnillos = Math.max(3, Math.min(Math.round(visualAlto / 0.22), 10));
    const ex = insetX + rVar;
    const ez = insetZ + rVar;
    const t = rEst;
    for (let i = 0; i < nAnillos; i++) {
      const y = 0.06 + (i * (visualAlto - 0.12)) / (nAnillos - 1);
      const piezas: Array<[number, number, number, number, number]> = [
        [2 * ex + t, t, 0, y, ez],
        [2 * ex + t, t, 0, y, -ez],
        [t, 2 * ez + t, ex, y, 0],
        [t, 2 * ez + t, -ex, y, 0],
      ];
      piezas.forEach(([w, d, px, py, pz]) => {
        const malla = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), estriboMat);
        malla.position.set(px, py, pz);
        scene.add(malla);
      });
    }

    // Acotación
    const spriteBase = createDimensionSprite(`Base: ${realB} cm`, campoActivo === 'b');
    spriteBase.position.set(0, 0.3, vH / 2 + 0.5);
    scene.add(spriteBase);
    scene.add(createDimensionLine(
      new THREE.Vector3(-vB / 2, 0.04, vH / 2 + 0.18),
      new THREE.Vector3(vB / 2, 0.04, vH / 2 + 0.18),
      campoActivo === 'b' ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(0, 0, 1)
    ));

    const spriteLargo = createDimensionSprite(`Largo: ${realH} cm`, campoActivo === 'h');
    spriteLargo.position.set(vB / 2 + 0.85, 0.3, 0);
    scene.add(spriteLargo);
    scene.add(createDimensionLine(
      new THREE.Vector3(vB / 2 + 0.18, 0.04, -vH / 2),
      new THREE.Vector3(vB / 2 + 0.18, 0.04, vH / 2),
      campoActivo === 'h' ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(1, 0, 0)
    ));

    const spriteAlto = createDimensionSprite(`Alto: ${realAlto} m`, campoActivo === 'alto', 'amber');
    spriteAlto.position.set(-(vB / 2) - 0.85, visualAlto / 2, vH / 2 + 0.2);
    scene.add(spriteAlto);
    scene.add(createDimensionLine(
      new THREE.Vector3(-vB / 2 - 0.18, 0, vH / 2 + 0.18),
      new THREE.Vector3(-vB / 2 - 0.18, visualAlto, vH / 2 + 0.18),
      campoActivo === 'alto' ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber,
      new THREE.Vector3(0, 0, 1)
    ));

    const reqId = startAnimationLoop(renderer, scene, camera, controls);
    const cleanupResize = setupResizeHandler(renderer, camera, container, height);

    return () => {
      cleanupResize();
      cancelAnimationFrame(reqId);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [tab, vB, vH, visualAlto, vRec, rVar, rEst, realNVar, realB, realH, realAlto, campoActivo, autoRotate]);

  // —— Datos del Plano 2D (despiece de armado) ——
  const escalaPx = 170 / Math.max(realB, realH);
  const secW = realB * escalaPx;
  const secH = realH * escalaPx;
  const secX = 160 - secW / 2;
  const secY = 165 - secH / 2;
  const recPx = Math.min(Math.max(realRec * escalaPx, 5), Math.min(secW, secH) / 2 - 6);
  const rVarPx = radioVarPx(dVar, escalaPx);
  const insetX = Math.max(secW / 2 - recPx - rVarPx, rVarPx);
  const insetY = Math.max(secH / 2 - recPx - rVarPx, rVarPx);
  const varillasPx = Array.from({ length: realNVar }, (_, i) => {
    const t = (i / realNVar) * Math.PI * 2;
    const cx = Math.cos(t);
    const cz = Math.sin(t);
    const k = Math.max(Math.abs(cx), Math.abs(cz)) || 1;
    return { x: 160 + (cx / k) * insetX, y: 165 + (cz / k) * insetY };
  });
  const estriboN = Math.max(4, Math.min(Math.round(realAlto / 0.2), 14));

  return (
    <ViewerShell
      icon={etapa.icon}
      titulo={etapa.tituloVisor}
      tabs={[
        { id: '3d', label: 'Vista 3D' },
        { id: 'plano2d', label: 'Plano 2D' },
        { id: 'referencia', label: 'Referencia' },
      ]}
      tab={tab}
      onTab={id => setTab(id as '3d' | 'plano2d' | 'referencia')}
      esCanvas3D={tab === '3d'}
      hudTexto={campoActivo ? HUD[campoActivo] ?? campoActivo : null}
      autoRotar={autoRotate}
      onToggleRotar={() => setAutoRotate(r => !r)}
      badges={[
        { id: 'b', icon: '↔️', label: 'Base', value: `${realB} cm`, tone: campoActivo === 'b' ? 'amber' : 'cyan' },
        { id: 'h', icon: '↕️', label: 'Largo', value: `${realH} cm`, tone: campoActivo === 'h' ? 'amber' : 'cyan' },
        { id: 'alto', icon: '⬆️', label: 'Alto', value: `${realAlto} m`, tone: campoActivo === 'alto' ? 'amber' : 'cyan' },
        { id: 'nVar', icon: '🔩', label: 'Varillas', value: `${realNVar} und Ø ${dVar}"`, tone: campoActivo === 'nVar' || campoActivo === 'dVar' ? 'amber' : 'cyan' },
        { id: 'dEst', icon: '🔲', label: 'Estribo', value: `Ø ${dEst}"`, tone: campoActivo === 'dEst' ? 'amber' : 'cyan' },
      ]}
    >
      {tab === '3d' ? (
        <div className="viewer-canvas-wrap" style={{ height: '350px' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      ) : tab === 'plano2d' ? (
        <div className="viewer-2d">
          <svg
            viewBox="0 0 560 340"
            style={{ width: '100%', height: 'auto', display: 'block', background: '#070b14', borderRadius: 8 }}
            role="img"
            aria-label="Despiece de armado de columna: planta y alzado"
          >
            <defs>
              <marker id="puntaColC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#38bdf8" />
              </marker>
              <marker id="puntaColA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#fbbf24" />
              </marker>
            </defs>

            {/* PLANTA — sección A-A */}
            <text x={160} y={58} textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" letterSpacing="1">PLANTA · SECCIÓN A-A</text>
            <rect x={secX} y={secY} width={secW} height={secH} fill="#475569" fillOpacity="0.55" stroke="#94a3b8" strokeWidth="1.5" />
            <rect
              x={secX + recPx}
              y={secY + recPx}
              width={Math.max(secW - 2 * recPx, 2)}
              height={Math.max(secH - 2 * recPx, 2)}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeDasharray="6 4"
            />
            {varillasPx.map((v, i) => (
              <circle key={i} cx={v.x} cy={v.y} r={rVarPx} fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" />
            ))}
            <line x1={secX} y1={secY + secH + 28} x2={secX + secW} y2={secY + secH + 28} stroke="#38bdf8" strokeWidth="1.2" markerStart="url(#puntaColC)" markerEnd="url(#puntaColC)" />
            <text x={160} y={secY + secH + 44} textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace">Base: {realB} cm</text>
            <line x1={secX + secW + 28} y1={secY} x2={secX + secW + 28} y2={secY + secH} stroke="#38bdf8" strokeWidth="1.2" markerStart="url(#puntaColC)" markerEnd="url(#puntaColC)" />
            <text x={secX + secW + 37} y={165} textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace" transform={`rotate(90, ${secX + secW + 37}, 165)`}>Largo: {realH} cm</text>
            <text x={secX - 8} y={secY + recPx + 3} textAnchor="end" fill="#38bdf8" fontSize="10" fontFamily="monospace">rec. {realRec} cm</text>

            {/* ALZADO — varillas y estribos */}
            <text x={430} y={58} textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" letterSpacing="1">ALZADO</text>
            <rect x={390} y={80} width={80} height={190} fill="#475569" fillOpacity="0.55" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1={400} y1={86} x2={400} y2={264} stroke="#e2e8f0" strokeWidth="3" />
            <line x1={460} y1={86} x2={460} y2={264} stroke="#e2e8f0" strokeWidth="3" />
            {Array.from({ length: estriboN }, (_, i) => {
              const y = 88 + (i * 174) / (estriboN - 1);
              return <line key={i} x1={390} y1={y} x2={470} y2={y} stroke="#38bdf8" strokeWidth="1.4" />;
            })}
            <line x1={380} y1={270} x2={480} y2={270} stroke="#64748b" strokeWidth="1.5" />
            <line x1={494} y1={80} x2={494} y2={270} stroke="#fbbf24" strokeWidth="1.2" markerStart="url(#puntaColA)" markerEnd="url(#puntaColA)" />
            <text x={506} y={175} textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="monospace" transform="rotate(-90, 506, 175)">Alto: {realAlto} m</text>

            {/* Leyenda */}
            <text x={280} y={318} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
              {`Varillas: ${realNVar} Ø ${dVar}"  ·  Estribo: Ø ${dEst}"  ·  Recubrimiento: ${realRec} cm`}
            </text>
          </svg>
        </div>
      ) : (
        <div className="ref-wrap">
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              🔩 Armado típico de columna
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              Las columnas llevan varillas verticales unidas entre sí con estribos.
              El recubrimiento (capa de concreto entre el fierro y el borde) protege
              el acero de la humedad. Lo usual en casa: recubrimiento de 4 cm.
            </div>
          </div>
          <div style={{ border: '1px solid #0284c7', borderRadius: 8, padding: '10px 12px', background: 'rgba(56, 189, 248, 0.08)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              📋 Norma técnica (NTE E.060)
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              El espaciamiento de los estribos no debe superar la dimensión menor
              de la sección ni 15 cm en los extremos (zonas de confinamiento).
              Confirma siempre el armado del plano estructural antes de tenderlo.
            </div>
          </div>
          <ConsejosZona />
          <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
            Cantidades calculadas con rendimientos habituales de obra peruana.
          </div>
        </div>
      )}
    </ViewerShell>
  );
};
