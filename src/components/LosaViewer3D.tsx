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

const etapa = getEtapa('losa');

interface Props {
  largo: number;      // m
  ancho: number;      // m
  espesor: number;    // cm (0 = automático → se muestra ≈20)
  campoActivo?: string | null;
}

const HUD: Record<string, string> = {
  largo: 'LARGO DE LA LOSA',
  ancho: 'ANCHO DE LA LOSA',
  espesor: 'ESPESOR DE LA LOSA',
};

export const LosaViewer3D: React.FC<Props> = ({ largo, ancho, espesor, campoActivo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'3d' | 'plano2d' | 'referencia'>('3d');
  const [autoRotate, setAutoRotate] = useState(false);

  // Valores con fallbacks
  const realLargo = largo > 0 ? largo : 4;
  const realAncho = ancho > 0 ? ancho : 3.5;
  const esAuto = espesor <= 0;
  const realEsp = esAuto ? 20 : espesor;

  // Escala visual
  const visualLargo = Math.min(Math.max(realLargo * 0.5, 2.2), 4.5);
  const visualAncho = Math.min(Math.max(visualLargo * (realAncho / realLargo), 1.4), 3.4);
  const vT = Math.min(Math.max((realEsp / 100) * (visualLargo / realLargo), 0.16), 0.5);

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
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    applyStandardIsoCamera(camera, controls, Math.max(visualLargo, visualAncho), vT * 0.5);
    controls.update();

    createStandardLights(scene);
    scene.add(createStandardGrid(8, 16, 0));

    // Viguetas a lo largo del largo (eje X), repartidas en el ancho
    const nVig = Math.min(Math.max(Math.floor(realAncho / 0.4) + 1, 3), 9);
    const paso = visualAncho / nVig;
    const wVig = Math.min(Math.max(vT * 0.32, paso * 0.3), 0.28);
    const hVig = vT * 0.62;
    const viguetaMat = new THREE.MeshStandardMaterial({ color: 0xa8b8cc, roughness: 0.85 });
    for (let i = 0; i < nVig; i++) {
      const z = -visualAncho / 2 + paso * (i + 0.5);
      const vigueta = new THREE.Mesh(
        new THREE.BoxGeometry(visualLargo, hVig, wVig),
        viguetaMat
      );
      vigueta.position.set(0, hVig / 2, z);
      scene.add(vigueta);
    }

    // Ladrillo de techo entre viguetas
    const ladrilloMat = new THREE.MeshStandardMaterial({ color: VIEWER_COLORS.brick, roughness: 0.9 });
    const hLad = vT * 0.42;
    for (let i = 0; i < nVig - 1; i++) {
      const z = -visualAncho / 2 + paso * (i + 1);
      const ladrillo = new THREE.Mesh(
        new THREE.BoxGeometry(visualLargo * 0.98, hLad, Math.max(paso - wVig - 0.05, 0.06)),
        ladrilloMat
      );
      ladrillo.position.set(0, hLad / 2, z);
      scene.add(ladrillo);
    }

    // Bastón de amarre sobre las viguetas (una pasada al centro)
    const baston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, visualLargo * 0.96, 8),
      new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5 })
    );
    baston.rotation.z = Math.PI / 2;
    baston.position.set(0, hVig + 0.01, 0);
    scene.add(baston);

    // Capa superior de concreto — con cortado para ver el interior
    const hTop = vT * 0.38;
    const anchoTop = visualLargo * 0.6;
    const losaTop = new THREE.Mesh(
      new THREE.BoxGeometry(anchoTop, hTop, visualAncho),
      new THREE.MeshStandardMaterial({
        color: VIEWER_COLORS.concrete,
        transparent: true,
        opacity: 0.9,
        roughness: 0.85,
      })
    );
    losaTop.position.set(-visualLargo / 2 + anchoTop / 2, hVig + hTop / 2, 0);
    scene.add(losaTop);
    addHighlightEdges(
      losaTop,
      campoActivo === 'espesor',
      VIEWER_COLORS.highlight,
      VIEWER_COLORS.concreteEdge
    );

    // Acotación
    const spriteLargo = createDimensionSprite(`Largo: ${realLargo} m`, campoActivo === 'largo', 'amber');
    spriteLargo.position.set(0, 0.35, visualAncho / 2 + 0.55);
    scene.add(spriteLargo);
    scene.add(createDimensionLine(
      new THREE.Vector3(-visualLargo / 2, 0.03, visualAncho / 2 + 0.16),
      new THREE.Vector3(visualLargo / 2, 0.03, visualAncho / 2 + 0.16),
      campoActivo === 'largo' ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber,
      new THREE.Vector3(0, 0, 1)
    ));

    const spriteAncho = createDimensionSprite(`Ancho: ${realAncho} m`, campoActivo === 'ancho');
    spriteAncho.position.set(visualLargo / 2 + 0.9, 0.35, 0);
    scene.add(spriteAncho);
    scene.add(createDimensionLine(
      new THREE.Vector3(visualLargo / 2 + 0.16, 0.03, -visualAncho / 2),
      new THREE.Vector3(visualLargo / 2 + 0.16, 0.03, visualAncho / 2),
      campoActivo === 'ancho' ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(1, 0, 0)
    ));

    const etiquetaEsp = esAuto ? 'Espesor: auto ≈20 cm' : `Espesor: ${realEsp} cm`;
    const spriteEsp = createDimensionSprite(etiquetaEsp, campoActivo === 'espesor');
    spriteEsp.position.set(-visualLargo / 2 - 0.55, vT + 0.55, visualAncho / 2 - 0.4);
    scene.add(spriteEsp);
    scene.add(createDimensionLine(
      new THREE.Vector3(-visualLargo / 2 - 0.16, 0, visualAncho / 2 - 0.2),
      new THREE.Vector3(-visualLargo / 2 - 0.16, vT, visualAncho / 2 - 0.2),
      campoActivo === 'espesor' ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber,
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
  }, [tab, visualLargo, visualAncho, vT, realLargo, realAncho, realEsp, esAuto, campoActivo, autoRotate]);

  // —— Datos del Plano 2D (corte transversal) ——
  const escL = 4.5;                              // px por cm
  const wVigL = 10 * escL;                       // vigueta de 10 cm
  const pasoL = 40 * escL;                       // cada 40 cm
  const inicioL = (560 - (3 * wVigL + 2 * (pasoL - wVigL))) / 2;
  const vigLx = [inicioL, inicioL + pasoL, inicioL + 2 * pasoL];
  const capaPxL = 5 * escL;                      // losa de compresión 5 cm
  const espPxC = Math.min(Math.max(realEsp * escL, 30), 140);
  const yTopL = 92;
  const yBotL = yTopL + espPxC;
  const centroVigL = (x: number) => x + wVigL / 2;
  const centroLadL = (i: number) => vigLx[i] + wVigL + (pasoL - wVigL) / 2;

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
        { id: 'largo', icon: '↔️', label: 'Largo', value: `${realLargo} m`, tone: campoActivo === 'largo' ? 'amber' : 'cyan' },
        { id: 'ancho', icon: '↕️', label: 'Ancho', value: `${realAncho} m`, tone: campoActivo === 'ancho' ? 'amber' : 'cyan' },
        { id: 'esp', icon: '🔲', label: 'Espesor', value: esAuto ? 'auto ≈20 cm' : `${realEsp} cm`, tone: campoActivo === 'espesor' ? 'amber' : 'cyan' },
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
            aria-label="Corte transversal de la losa aligerada"
          >
            <defs>
              <marker id="puntaLosC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#38bdf8" />
              </marker>
              <marker id="puntaLosA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 Z" fill="#fbbf24" />
              </marker>
            </defs>

            <text x={280} y={50} textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" letterSpacing="1">CORTE TRANSVERSAL</text>

            {/* Cota del paso de viguetas */}
            <line x1={centroVigL(vigLx[0])} y1={72} x2={centroVigL(vigLx[1])} y2={72} stroke="#38bdf8" strokeWidth="1.2" markerStart="url(#puntaLosC)" markerEnd="url(#puntaLosC)" />
            <text x={(centroVigL(vigLx[0]) + centroVigL(vigLx[1])) / 2} y={66} textAnchor="middle" fill="#38bdf8" fontSize="10.5" fontFamily="monospace">c/ 40 cm</text>

            {/* Losa de compresión (capa superior) */}
            <rect x={vigLx[0]} y={yTopL} width={vigLx[2] + wVigL - vigLx[0]} height={capaPxL} fill="#475569" fillOpacity="0.8" stroke="#94a3b8" strokeWidth="1.4" />
            <text x={vigLx[0] + 46} y={yTopL + capaPxL - 7} fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">Losa de compresión 5 cm</text>

            {/* Viguetas de concreto */}
            {vigLx.map((x, i) => (
              <rect key={`v${i}`} x={x} y={yTopL + capaPxL} width={wVigL} height={espPxC - capaPxL} fill="#a8b8cc" stroke="#94a3b8" strokeWidth="1.2" />
            ))}

            {/* Ladrillo de techo entre viguetas */}
            {[0, 1].map(i => (
              <rect key={`l${i}`} x={vigLx[i] + wVigL} y={yTopL + capaPxL} width={pasoL - wVigL} height={espPxC - capaPxL} fill="#c2410c" fillOpacity="0.6" stroke="#7c2d12" strokeWidth="1" />
            ))}

            {/* Cota de espesor */}
            <line x1={vigLx[2] + wVigL + 22} y1={yTopL} x2={vigLx[2] + wVigL + 22} y2={yBotL} stroke="#fbbf24" strokeWidth="1.2" markerStart="url(#puntaLosA)" markerEnd="url(#puntaLosA)" />
            <text x={vigLx[2] + wVigL + 34} y={(yTopL + yBotL) / 2} textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="monospace" transform={`rotate(-90, ${vigLx[2] + wVigL + 34}, ${(yTopL + yBotL) / 2})`}>
              {esAuto ? 'Espesor: 20 cm (auto)' : `Espesor: ${realEsp} cm`}
            </text>

            {/* Etiquetas bajo el corte */}
            {vigLx.map((x, i) => (
              <text key={`tv${i}`} x={centroVigL(x)} y={yBotL + 16} textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">Vigueta</text>
            ))}
            {[0, 1].map(i => (
              <text key={`tl${i}`} x={centroLadL(i)} y={yBotL + 16} textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">Ladrillo techo</text>
            ))}

            {/* Leyenda */}
            <text x={280} y={yBotL + 46} textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontFamily="monospace">
              Viguetas de concreto de 10 cm cada 40 cm · ladrillo de techo en el entrepaño
            </text>
            <text x={280} y={yBotL + 64} textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontFamily="monospace">
              {`${realEsp - 5} cm de ladrillo + 5 cm de compresión = ${realEsp} cm`}
            </text>
            <text x={280} y={yBotL + 82} textAnchor="middle" fill="#64748b" fontSize="9.5" fontFamily="monospace">
              Bastón de amarre sobre las viguetas antes de vaciar
            </text>
          </svg>
        </div>
      ) : (
        <div className="ref-wrap">
          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: 6 }}>
              🧱 ¿Por qué es "aligerada"?
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              Entre las viguetas va ladrillo de techo en vez de concreto macizo:
              la losa pesa menos y gasta menos material. Solo la capa de arriba
              (compresión) y las viguetas son de concreto.
            </div>
          </div>
          <div style={{ border: '1px solid #0284c7', borderRadius: 8, padding: '10px 12px', background: 'rgba(56, 189, 248, 0.08)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 }}>
              📋 Cómo se arma en obra
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.55 }}>
              Las viguetas se apoyan sobre las vigas, el ladrillo de techo se coloca
              entre ellas al ras, se amarra el bastón de amarre y se vacía la losa
              de compresión de un solo golpe. El espesor automático usa 20 cm,
              el más usado en vivienda.
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
