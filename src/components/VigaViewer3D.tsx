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

const etapa = getEtapa('vigas');

interface Props {
  b: number;       // cm — base
  h: number;       // cm — alto (peralte)
  luz: number;     // m — largo
  nSup: number;    // und — fierro de arriba
  dSup: string;
  nInf: number;    // und — fierro de abajo
  dInf: string;
  dEst: string;    // pulg — estribo
  rec: number;     // cm
  campoActivo?: string | null;
}

const HUD: Record<string, string> = {
  b: 'BASE DE LA VIGA',
  h: 'ALTO (PERALTE) DE LA VIGA',
  luz: 'LARGO DE LA VIGA',
  nSup: 'FIERRO DE ARRIBA (CANTIDAD)',
  dSup: 'FIERRO DE ARRIBA (DIÁMETRO)',
  nInf: 'FIERRO DE ABAJO (CANTIDAD)',
  dInf: 'FIERRO DE ABAJO (DIÁMETRO)',
  dEst: 'DIÁMETRO DEL ESTRIBO',
  rec: 'RECUBRIMIENTO',
};

export const VigaViewer3D: React.FC<Props> = ({
  b, h, luz, nSup, dSup, nInf, dInf, dEst, rec, campoActivo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'3d' | 'plano2d' | 'referencia'>('3d');
  const [autoRotate, setAutoRotate] = useState(false);

  // Valores con fallbacks
  const realB = b > 0 ? b : 25;
  const realH = h > 0 ? h : 40;
  const realLuz = luz > 0 ? luz : 4;
  const realNSup = Math.min(Math.max(nSup > 0 ? nSup : 2, 1), 6);
  const realNInf = Math.min(Math.max(nInf > 0 ? nInf : 3, 1), 6);
  const realRec = rec > 0 ? rec : 4;

  // Escala visual proporcional a la luz
  const visualLuz = Math.min(Math.max(realLuz * 0.6, 2.2), 4.6);
  const escala = visualLuz / realLuz;
  const vH = Math.min(Math.max((realH / 100) * escala, 0.22), 1.0);
  const vB = Math.min(Math.max((realB / 100) * escala, 0.20), 0.9);
  const vRec = Math.min(Math.max((realRec / 100) * escala, 0.025), 0.10);
  const rSup = varillaVisual(dSup, escala, 4.5, 0.012, 0.040);
  const rInf = varillaVisual(dInf, escala, 4.5, 0.012, 0.040);
  const rEst = varillaVisual(dEst, escala, 3.5, 0.010, 0.026);

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
    applyStandardIsoCamera(camera, controls, Math.max(visualLuz, vH + 0.5, vB + 0.5), vH / 2);
    controls.update();

    createStandardLights(scene);
    scene.add(createStandardGrid(8, 16, 0));

    // Concreto semitransparente
    const seccionActiva = campoActivo === 'b' || campoActivo === 'h';
    const viga = new THREE.Mesh(
      new THREE.BoxGeometry(visualLuz, vH, vB),
      new THREE.MeshStandardMaterial({
        color: VIEWER_COLORS.concrete,
        transparent: true,
        opacity: 0.42,
        roughness: 0.85,
      })
    );
    viga.position.y = vH / 2;
    scene.add(viga);
    addHighlightEdges(
      viga,
      seccionActiva,
      VIEWER_COLORS.highlight,
      VIEWER_COLORS.concreteEdge
    );

    const acero = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5, metalness: 0.6 });

    // Varillas a lo largo del eje X (rotadas 90°)
    const mkBarra = (r: number, x: number, y: number, z: number) => {
      const barra = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, visualLuz * 0.96, 10),
        acero
      );
      barra.rotation.z = Math.PI / 2;
      barra.position.set(x, y, z);
      scene.add(barra);
    };

    // Fierro superior e inferior repartido en la base
    const repartir = (n: number, r: number, y: number) => {
      const semi = Math.max(vB / 2 - vRec - r, r);
      for (let i = 0; i < n; i++) {
        const z = n === 1 ? 0 : -semi + (2 * semi * i) / (n - 1);
        mkBarra(r, 0, y, z);
      }
    };
    repartir(realNSup, rSup, vH - vRec - rSup);
    repartir(realNInf, rInf, vRec + rInf);

    // Estribos a lo largo de la luz
    const estriboMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 });
    const nAnillos = Math.max(4, Math.min(Math.round(realLuz / 0.25), 14));
    const ez = Math.max(vB / 2 - vRec * 0.8, rEst + 0.02);
    const t = rEst;
    for (let i = 0; i < nAnillos; i++) {
      const x = -visualLuz / 2 + 0.08 + (i * (visualLuz - 0.16)) / (nAnillos - 1);
      // Vertical (a lo largo de Y) en z = ±ez
      [ez, -ez].forEach(pz => {
        const malla = new THREE.Mesh(new THREE.BoxGeometry(t, vH * 0.92, t), estriboMat);
        malla.position.set(x, vH / 2, pz);
        scene.add(malla);
      });
      // Horizontal (a lo largo de Z) arriba y abajo
      [vH * 0.08, vH * 0.92].forEach(py => {
        const malla = new THREE.Mesh(new THREE.BoxGeometry(t, t, 2 * ez + t), estriboMat);
        malla.position.set(x, py, 0);
        scene.add(malla);
      });
    }

    // Acotación
    const spriteLuz = createDimensionSprite(`Largo: ${realLuz} m`, campoActivo === 'luz', 'amber');
    spriteLuz.position.set(0, 0.32, vB / 2 + 0.55);
    scene.add(spriteLuz);
    scene.add(createDimensionLine(
      new THREE.Vector3(-visualLuz / 2, 0.03, vB / 2 + 0.16),
      new THREE.Vector3(visualLuz / 2, 0.03, vB / 2 + 0.16),
      campoActivo === 'luz' ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber,
      new THREE.Vector3(0, 0, 1)
    ));

    const spriteBase = createDimensionSprite(`Base: ${realB} cm`, campoActivo === 'b');
    spriteBase.position.set(visualLuz / 2 + 0.85, 0.32, 0);
    scene.add(spriteBase);
    scene.add(createDimensionLine(
      new THREE.Vector3(visualLuz / 2 + 0.16, 0.03, -vB / 2),
      new THREE.Vector3(visualLuz / 2 + 0.16, 0.03, vB / 2),
      campoActivo === 'b' ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(1, 0, 0)
    ));

    const spriteAlto = createDimensionSprite(`Alto: ${realH} cm`, campoActivo === 'h');
    spriteAlto.position.set(visualLuz / 2 + 0.85, vH + 0.35, 0);
    scene.add(spriteAlto);
    scene.add(createDimensionLine(
      new THREE.Vector3(visualLuz / 2 + 0.16, 0, vB / 2 + 0.14),
      new THREE.Vector3(visualLuz / 2 + 0.16, vH, vB / 2 + 0.14),
      campoActivo === 'h' ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
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
  }, [tab, visualLuz, vB, vH, vRec, rSup, rInf, rEst, realNSup, realNInf, realLuz, realB, realH, campoActivo, autoRotate]);

  // —— Datos del Plano 2D (alzado armado) ——
  const vigX = 70;
  const vigW = 400;
  const vigHpx = Math.min(Math.max(realH * 2.2, 44), 110);
  const vigY = 96;
  const recPxV = Math.min(Math.max(realRec * (vigHpx / realH), 4), vigHpx / 3);
  const baseY = vigY + vigHpx;
  const nEstV = Math.max(6, Math.min(Math.round(realLuz / 0.3), 16));
  const dispSup = vigHpx / 2 - recPxV - 6;
  const pasoSup = realNSup > 1 ? Math.max(4, Math.min(9, dispSup / (realNSup - 1))) : 0;
  const supYs = Array.from({ length: realNSup }, (_, i) => vigY + recPxV + 4 + i * pasoSup);
  const pasoInf = realNInf > 1 ? Math.max(4, Math.min(9, dispSup / (realNInf - 1))) : 0;
  const infYs = Array.from({ length: realNInf }, (_, i) => baseY - recPxV - 4 - i * pasoInf);

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
        { id: 'luz', icon: '↔️', label: 'Largo', value: `${realLuz} m`, tone: campoActivo === 'luz' ? 'amber' : 'cyan' },
        { id: 'b', icon: '↔️', label: 'Base', value: `${realB} cm`, tone: campoActivo === 'b' ? 'amber' : 'cyan' },
        { id: 'h', icon: '⬆️', label: 'Alto', value: `${realH} cm`, tone: campoActivo === 'h' ? 'amber' : 'cyan' },
        { id: 'sup', icon: '🔝', label: 'Fierro arriba', value: `${realNSup} und Ø ${dSup}"`, tone: campoActivo === 'nSup' || campoActivo === 'dSup' ? 'amber' : 'cyan' },
        { id: 'inf', icon: '🔻', label: 'Fierro abajo', value: `${realNInf} und Ø ${dInf}"`, tone: campoActivo === 'nInf' || campoActivo === 'dInf' ? 'amber' : 'cyan' },
        { id: 'est', icon: '🔲', label: 'Estribo', value: `Ø ${dEst}"`, tone: campoActivo === 'dEst' ? 'amber' : 'cyan' },
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
            aria-label="Alzado armado de la viga"
          >
            <defs>
              <marker id="puntaVigC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#38bdf8" />
              </marker>
              <marker id="puntaVigA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#fbbf24" />
              </marker>
            </defs>

            <text x={270} y={64} textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" letterSpacing="1">ALZADO ARMADO</text>

            {/* Apoyos */}
            <polygon points={`${vigX},${baseY} ${vigX - 26},${baseY + 44} ${vigX + 26},${baseY + 44}`} fill="#334155" stroke="#64748b" strokeWidth="1.2" />
            <polygon points={`${vigX + vigW},${baseY} ${vigX + vigW - 26},${baseY + 44} ${vigX + vigW + 26},${baseY + 44}`} fill="#334155" stroke="#64748b" strokeWidth="1.2" />
            <line x1={30} y1={baseY + 44} x2={530} y2={baseY + 44} stroke="#64748b" strokeWidth="1.5" />

            {/* Concreto */}
            <rect x={vigX} y={vigY} width={vigW} height={vigHpx} fill="#475569" fillOpacity="0.55" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Estribos */}
            {Array.from({ length: nEstV }, (_, i) => {
              const x = vigX + 10 + (i * (vigW - 20)) / (nEstV - 1);
              return <line key={i} x1={x} y1={vigY + 5} x2={x} y2={baseY - 5} stroke="#38bdf8" strokeWidth="1.3" opacity={0.85} />;
            })}

            {/* Fierro superior e inferior */}
            {supYs.map((y, i) => (
              <line key={`s${i}`} x1={vigX + 8} y1={y} x2={vigX + vigW - 8} y2={y} stroke="#e2e8f0" strokeWidth="2.6" />
            ))}
            {infYs.map((y, i) => (
              <line key={`f${i}`} x1={vigX + 8} y1={y} x2={vigX + vigW - 8} y2={y} stroke="#e2e8f0" strokeWidth="2.6" />
            ))}

            {/* Cotas */}
            <line x1={vigX} y1={baseY + 68} x2={vigX + vigW} y2={baseY + 68} stroke="#38bdf8" strokeWidth="1.2" markerStart="url(#puntaVigC)" markerEnd="url(#puntaVigC)" />
            <text x={vigX + vigW / 2} y={baseY + 84} textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace">Luz: {realLuz} m</text>
            <line x1={vigX + vigW + 26} y1={vigY} x2={vigX + vigW + 26} y2={baseY} stroke="#fbbf24" strokeWidth="1.2" markerStart="url(#puntaVigA)" markerEnd="url(#puntaVigA)" />
            <text x={vigX + vigW + 38} y={(vigY + baseY) / 2} textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="monospace" transform={`rotate(-90, ${vigX + vigW + 38}, ${(vigY + baseY) / 2})`}>h: {realH} cm</text>
            <text x={vigX - 8} y={vigY + recPxV + 4} textAnchor="end" fill="#38bdf8" fontSize="10" fontFamily="monospace">rec. {realRec} cm</text>

            {/* Leyenda */}
            <text x={280} y={320} textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontFamily="monospace">
              {`Fierro arriba: ${realNSup} Ø ${dSup}"  ·  Fierro abajo: ${realNInf} Ø ${dInf}"  ·  Estribo: Ø ${dEst}"  ·  Rec: ${realRec} cm`}
            </text>
          </svg>
        </div>
      ) : (
        <div className="ref-wrap">
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              🔩 Fierro de una viga
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              Las vigas tienen fierro grueso abajo (aganta el tramo) y fierro arriba
              (lo une con las columnas), unidos por estribos. La mayoría del fierro
              va en la parte inferior, donde la viga se abre por el peso.
            </div>
          </div>
          <div style={{ border: '1px solid #0284c7', borderRadius: 8, padding: '10px 12px', background: 'rgba(56, 189, 248, 0.08)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              📋 Norma técnica (NTE E.060)
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              El recubrimiento mínimo del fierro de vigas suele ser de 2 cm (interiores)
              y el estribo Ø 3/8" es el habitual en vigas de casa. Verifica el plano
              estructural antes de armar.
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
