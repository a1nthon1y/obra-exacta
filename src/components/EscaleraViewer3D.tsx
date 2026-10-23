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
} from './viewerUtils';
import { ViewerShell } from './ViewerShell';
import { ConsejosZona } from './ConsejosZona';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('escalera');

interface Props {
  altura: number;    // m — altura entre pisos
  ancho: number;     // m — ancho del tramo
  huellaCm: number;  // cm — huella resuelta (27 si es automática)
  campoActivo?: string | null;
}

const HUD: Record<string, string> = {
  altura: 'ALTURA ENTRE PISOS',
  ancho: 'ANCHO DE LA ESCALERA',
  huella: 'HUELLA (PASO)',
};

// Mismo criterio del motor: contrahuella ≈ 18 cm
const nEscalones = (altura: number) => Math.max(3, Math.round((altura * 100) / 18));

export const EscaleraViewer3D: React.FC<Props> = ({ altura, ancho, huellaCm, campoActivo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'3d' | 'plano2d' | 'referencia'>('3d');
  const [autoRotate, setAutoRotate] = useState(false);

  // Valores con fallbacks (misma geometría que el motor)
  const realAltura = altura > 0 ? altura : 2.8;
  const realAncho = ancho > 0 ? ancho : 0.9;
  const realHu = huellaCm > 0 ? huellaCm : 27;
  const n = nEscalones(realAltura);
  const ch = (realAltura * 100) / n;               // contrahuella (cm)
  const desH = (n * realHu) / 100;                 // desarrollo horizontal (m)
  const pend = Math.atan2(realAltura, desH);       // radianes

  // Escala visual proporcional al desarrollo
  const desVis = Math.min(Math.max(desH * 0.6, 2.2), 4.8);
  const escala = desVis / desH;
  const vAltura = realAltura * escala;
  const vCh = (ch / 100) * escala;
  const vHu = (realHu / 100) * escala;
  const vAncho = Math.min(Math.max(realAncho * escala, 0.45), 2.0);
  const vEL = 0.25 * escala; // espesor de la lanza

  useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
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
    applyStandardIsoCamera(camera, controls, Math.max(desVis, vAltura, vAncho), vAltura / 2);
    controls.update();

    createStandardLights(scene);
    scene.add(createStandardGrid(8, 16, 0));

    const x0 = -desVis / 2; // inicio del tramo

    // Lanza inclinada (el tablero de concreto que sostiene los escalones)
    const longLanza = Math.hypot(desVis, vAltura);
    const lanza = new THREE.Mesh(
      new THREE.BoxGeometry(longLanza, vEL, vAncho),
      new THREE.MeshStandardMaterial({
        color: VIEWER_COLORS.concrete,
        transparent: true,
        opacity: 0.42,
        roughness: 0.85,
      })
    );
    lanza.rotation.z = pend;
    lanza.position.set(0, vAltura / 2 + (vEL / 2) * Math.cos(pend) - (vEL / 2), 0);
    scene.add(lanza);
    addHighlightEdges(lanza, false, VIEWER_COLORS.highlight, VIEWER_COLORS.concreteEdge);

    // Escalones: bloques de media contrahuella sobre la línea de la lanza
    const matEsc = new THREE.MeshStandardMaterial({
      color: VIEWER_COLORS.concrete,
      transparent: true,
      opacity: 0.55,
      roughness: 0.85,
    });
    const tanP = vAltura / desVis;
    let primerEscalon: THREE.Mesh | null = null;
    for (let i = 0; i < n; i++) {
      const xc = (i + 0.5) * vHu;                    // centro del escalón
      const yLanza = vEL + xc * tanP;                // superficie de la lanza ahí
      const esc = new THREE.Mesh(new THREE.BoxGeometry(vHu * 0.98, vCh / 2, vAncho), matEsc);
      esc.position.set(x0 + xc, yLanza + vCh / 4, 0);
      scene.add(esc);
      if (i === 0) primerEscalon = esc;
    }
    if (primerEscalon) {
      addHighlightEdges(primerEscalon, campoActivo === 'huella', VIEWER_COLORS.highlight, VIEWER_COLORS.concreteEdge);
    }

    // Acotación
    const spriteAlto = createDimensionSprite(`Alto: ${realAltura} m`, campoActivo === 'altura', 'amber');
    spriteAlto.position.set(x0 - 0.75, vAltura / 2, 0);
    scene.add(spriteAlto);
    scene.add(createDimensionLine(
      new THREE.Vector3(x0 - 0.30, 0.03, 0),
      new THREE.Vector3(x0 - 0.30, vAltura, 0),
      campoActivo === 'altura' ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber,
      new THREE.Vector3(0, 0, 1)
    ));

    const spriteDes = createDimensionSprite(`Desarrollo: ${desH.toFixed(2)} m`);
    spriteDes.position.set(0, 0.30, vAncho / 2 + 0.55);
    scene.add(spriteDes);
    scene.add(createDimensionLine(
      new THREE.Vector3(x0, 0.03, vAncho / 2 + 0.16),
      new THREE.Vector3(x0 + desVis, 0.03, vAncho / 2 + 0.16),
      VIEWER_COLORS.dimCyan,
      new THREE.Vector3(0, 0, 1)
    ));

    const spriteAncho = createDimensionSprite(`Ancho: ${realAncho} m`, campoActivo === 'ancho');
    spriteAncho.position.set(x0 + desVis + 0.85, 0.30, 0);
    scene.add(spriteAncho);
    scene.add(createDimensionLine(
      new THREE.Vector3(x0 + desVis + 0.16, 0.03, -vAncho / 2),
      new THREE.Vector3(x0 + desVis + 0.16, 0.03, vAncho / 2),
      campoActivo === 'ancho' ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(1, 0, 0)
    ));

    const spriteHu = createDimensionSprite(`Huella: ${realHu} cm`, campoActivo === 'huella');
    spriteHu.position.set(x0 + vHu * 1.5, vCh * 1.4, vAncho / 2 + 0.45);
    scene.add(spriteHu);

    const reqId = startAnimationLoop(renderer, scene, camera, controls);
    const cleanupResize = setupResizeHandler(renderer, camera, container, height);

    return () => {
      cleanupResize();
      cancelAnimationFrame(reqId);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [tab, desVis, vAltura, vCh, vHu, vAncho, vEL, desH, pend, n, realAltura, realAncho, realHu, campoActivo, autoRotate]);

  // —— Datos del Plano 2D (alzado) ——
  const S = Math.min(420 / desH, 220 / realAltura); // px por metro
  const x0p = 96;
  const y0p = 288; // nivel del piso
  const huPx = (realHu / 100) * S;
  const chPx = (ch / 100) * S;
  const desPx = desH * S;
  const altPx = realAltura * S;

  // Polilínea del perfil escalonado
  const pasosPts: string[] = [`${x0p},${y0p}`];
  for (let i = 0; i < n; i++) {
    pasosPts.push(`${x0p + i * huPx},${y0p - (i + 1) * chPx}`);
    pasosPts.push(`${x0p + (i + 1) * huPx},${y0p - (i + 1) * chPx}`);
  }

  const pendDeg = (pend * 180) / Math.PI;

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
        { id: 'altura', icon: '⬆️', label: 'Alto', value: `${realAltura} m`, tone: campoActivo === 'altura' ? 'amber' : 'cyan' },
        { id: 'ancho', icon: '↔️', label: 'Ancho', value: `${realAncho} m`, tone: campoActivo === 'ancho' ? 'amber' : 'cyan' },
        { id: 'esc', icon: '🪜', label: 'Escalones', value: `${n} und`, tone: 'cyan' },
        { id: 'ch', icon: '⬆️', label: 'Contrahuella', value: `${ch.toFixed(1)} cm`, tone: 'cyan' },
        { id: 'hu', icon: '↔️', label: 'Huella', value: `${realHu} cm`, tone: campoActivo === 'huella' ? 'amber' : 'cyan' },
        { id: 'pend', icon: '📐', label: 'Pendiente', value: `${pendDeg.toFixed(1)}°`, tone: 'cyan' },
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
            aria-label="Alzado de la escalera"
          >
            <defs>
              <marker id="puntaEscC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#38bdf8" />
              </marker>
              <marker id="puntaEscA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#fbbf24" />
              </marker>
            </defs>

            <text x={280} y={30} textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" letterSpacing="1">ALZADO — {n} ESCALONES</text>

            {/* Piso */}
            <line x1={30} y1={y0p} x2={530} y2={y0p} stroke="#64748b" strokeWidth="1.5" />

            {/* Lanza (línea inclinada del sofito) */}
            <line x1={x0p} y1={y0p - 2} x2={x0p + desPx} y2={y0p - altPx - 2} stroke="#475569" strokeWidth="7" strokeLinecap="round" />

            {/* Perfil escalonado */}
            <polyline points={pasosPts.join(' ')} fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinejoin="round" />

            {/* Cota contrahuella (primer escalón) */}
            <line x1={x0p - 22} y1={y0p} x2={x0p - 22} y2={y0p - chPx} stroke="#fbbf24" strokeWidth="1.2" markerStart="url(#puntaEscA)" markerEnd="url(#puntaEscA)" />
            <text x={x0p - 28} y={y0p - chPx / 2} textAnchor="end" fill="#fbbf24" fontSize="10.5" fontFamily="monospace">ch {ch.toFixed(1)} cm</text>

            {/* Cota huella (bajo el primer escalón) */}
            <line x1={x0p} y1={y0p + 20} x2={x0p + huPx} y2={y0p + 20} stroke="#38bdf8" strokeWidth="1.2" markerStart="url(#puntaEscC)" markerEnd="url(#puntaEscC)" />
            <text x={x0p + huPx / 2} y={y0p + 34} textAnchor="middle" fill="#38bdf8" fontSize="10.5" fontFamily="monospace">hu {realHu} cm</text>

            {/* Cota altura total */}
            <line x1={52} y1={y0p} x2={52} y2={y0p - altPx} stroke="#fbbf24" strokeWidth="1.2" markerStart="url(#puntaEscA)" markerEnd="url(#puntaEscA)" />
            <text x={40} y={y0p - altPx / 2} textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="monospace" transform={`rotate(-90, 40, ${y0p - altPx / 2})`}>Alto: {realAltura} m</text>

            {/* Cota desarrollo */}
            <line x1={x0p} y1={y0p + 56} x2={x0p + desPx} y2={y0p + 56} stroke="#38bdf8" strokeWidth="1.2" markerStart="url(#puntaEscC)" markerEnd="url(#puntaEscC)" />
            <text x={x0p + desPx / 2} y={y0p + 72} textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace">Desarrollo: {desH.toFixed(2)} m</text>

            {/* Pendiente */}
            <text
              x={x0p + desPx * 0.55}
              y={y0p - altPx * 0.42 - 12}
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="11"
              fontFamily="monospace"
              transform={`rotate(${-pendDeg}, ${x0p + desPx * 0.55}, ${y0p - altPx * 0.42 - 12})`}
            >
              {pendDeg.toFixed(1)}°
            </text>

            {/* Leyenda */}
            <text x={280} y={330} textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontFamily="monospace">
              {`Contrahuella: ${ch.toFixed(1)} cm  ·  Huella: ${realHu} cm  ·  Ancho: ${realAncho} m  ·  Lanza: 25 cm`}
            </text>
          </svg>
        </div>
      ) : (
        <div className="ref-wrap">
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              🪜 Geometría cómoda (Blondel)
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              Una escalera se mide con la fórmula de Blondel: 2 contrahuellas + huella
              debe quedar entre 60 y 65 cm. Con eso se sube y baja sin cansarse.
              La pendiente cómoda está entre 30° y 38°; la contrahuella habitual
              en casa es de 17 a 19 cm y la huella de 26 a 28 cm.
            </div>
          </div>
          <div style={{ border: '1px solid #0284c7', borderRadius: 8, padding: '10px 12px', background: 'rgba(56, 189, 248, 0.08)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              📋 Norma técnica (NTE E.020)
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              En vivienda el tramo de la escalera debe tener mínimo 0.80 m de ancho
              libre. Los escalones de un mismo tramo deben ser iguales (misma huella
              y misma contrahuella) para no tropezar. El fierro de la lanza se define
              en el plano estructural (RNE E.060).
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
