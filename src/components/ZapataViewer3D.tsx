import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  VIEWER_COLORS,
  VIEWER_HEIGHT,
  createDimensionSprite,
  createDimensionLine,
  createStandardRenderer,
  createStandardLights,
  createStandardGrid,
  applyStandardIsoCamera,
  addHighlightEdges,
} from './viewerUtils';
import { ViewerShell } from './ViewerShell';
import { ZapataCorte2D } from './ZapataCorte2D';
import { ZapataReferencia } from './ZapataReferencia';
import { getEtapa } from '../config/etapas';

interface Props {
  bCol: number;      // cm
  hCol: number;      // cm
  bZap: number;      // m
  hZap: number;      // m
  espesor: number;   // m
  carga?: number;    // tn
  cant?: number;     // und
  campoActivo?: string | null;
}

const etapa = getEtapa('zapata');

const HUD: Record<string, string> = {
  bCol: 'BASE DE LA COLUMNA',
  hCol: 'LARGO DE LA COLUMNA',
  carga: 'CARGA AXIAL',
  espesor: 'ESPESOR DE LA ZAPATA',
  cant: 'CANTIDAD DE ZAPATAS',
  suelo: 'TIPO DE SUELO',
};

export const ZapataViewer3D: React.FC<Props> = ({
  bCol,
  hCol,
  bZap,
  hZap,
  espesor,
  carga = 0,
  cant = 0,
  campoActivo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'3d' | 'plano2d' | 'referencia'>('3d');
  const [autoRotate, setAutoRotate] = useState(false);

  // Valores con fallbacks: el visor siempre muestra una zapata completa.
  const realBCol = bCol > 0 ? bCol / 100 : 0.30;
  const realHCol = hCol > 0 ? hCol / 100 : 0.30;
  const realBZap = bZap > 0 ? bZap : 1.00;
  const realHZap = hZap > 0 ? hZap : 1.00;
  const realEsp = espesor > 0 ? espesor : 0.40;

  // Altura visible del arranque de columna (la calculadora no pide altura).
  const stubCol = Math.max(0.5, realEsp * 1.4);
  const targetY = (stubCol - realEsp) / 2;
  // Encuadre: el modelo debe llenar el cuadro como en Muro/Columna, sin
  // que el terreno ni las cotas se coman la escena.
  const sceneSize = Math.max(realBZap, realHZap, realEsp + stubCol) + 0.3;
  const spriteScale = Math.min(0.62, Math.max(0.4, sceneSize * 0.46));

  useEffect(() => {
    if (tab !== '3d' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = VIEWER_HEIGHT;

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
    applyStandardIsoCamera(camera, controls, sceneSize, targetY);

    createStandardLights(scene);
    const grid = createStandardGrid(8, 16, -realEsp - 0.12);
    scene.add(grid);

    // Terreno
    const sueloMat = new THREE.MeshStandardMaterial({ color: VIEWER_COLORS.soil, roughness: 0.95 });
    const suelo = new THREE.Mesh(
      new THREE.BoxGeometry(realBZap + 0.5, 0.12, realHZap + 0.5),
      sueloMat
    );
    suelo.position.y = -realEsp - 0.06;
    suelo.receiveShadow = true;
    scene.add(suelo);

    // Zapata
    const zapMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9, metalness: 0.08 });
    const zapata = new THREE.Mesh(new THREE.BoxGeometry(realBZap, realEsp, realHZap), zapMat);
    zapata.position.y = -realEsp / 2;
    zapata.castShadow = true;
    zapata.receiveShadow = true;
    scene.add(zapata);
    const isZapActive = campoActivo === 'espesor' || campoActivo === 'carga' || campoActivo === 'cant' || campoActivo === 'suelo';
    addHighlightEdges(zapata, isZapActive, VIEWER_COLORS.highlight, VIEWER_COLORS.concreteEdge);

    // Arranque de columna apoyado sobre la zapata (sin flotar)
    const colMat = new THREE.MeshStandardMaterial({ color: VIEWER_COLORS.column, roughness: 0.9, metalness: 0.08 });
    const columna = new THREE.Mesh(new THREE.BoxGeometry(realBCol, stubCol, realHCol), colMat);
    columna.position.y = stubCol / 2;
    columna.castShadow = true;
    columna.receiveShadow = true;
    scene.add(columna);
    const isColActive = campoActivo === 'bCol' || campoActivo === 'hCol';
    addHighlightEdges(columna, isColActive, VIEWER_COLORS.highlight, VIEWER_COLORS.columnEdge);

    const zFront = realHZap / 2 + 0.16;

    // Cota del lado de la zapata
    const p1z = new THREE.Vector3(-realBZap / 2, -realEsp - 0.22, zFront);
    const p2z = new THREE.Vector3(realBZap / 2, -realEsp - 0.22, zFront);
    scene.add(createDimensionLine(p1z, p2z, isZapActive ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan, new THREE.Vector3(0, 1, 0)));
    const sz = createDimensionSprite(`Bzap: ${realBZap.toFixed(2)} m`, isZapActive, 'cyan', spriteScale);
    sz.position.set(0, -realEsp - 0.36, zFront);
    scene.add(sz);

    // Cota de la columna
    const p1c = new THREE.Vector3(-realBCol / 2, stubCol + 0.14, zFront);
    const p2c = new THREE.Vector3(realBCol / 2, stubCol + 0.14, zFront);
    scene.add(createDimensionLine(p1c, p2c, isColActive ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan, new THREE.Vector3(0, 1, 0)));
    const sc = createDimensionSprite(`Col: ${realBCol.toFixed(2)} x ${realHCol.toFixed(2)} m`, isColActive, 'cyan', spriteScale);
    sc.position.set(0, stubCol + 0.28, zFront);
    scene.add(sc);

    // Cota del espesor
    const px = realBZap / 2 + 0.18;
    const p1e = new THREE.Vector3(px, -realEsp, zFront - 0.02);
    const p2e = new THREE.Vector3(px, 0, zFront - 0.02);
    scene.add(createDimensionLine(p1e, p2e, isZapActive ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber, new THREE.Vector3(1, 0, 0)));
    const se = createDimensionSprite(`h: ${realEsp.toFixed(2)} m`, isZapActive, 'amber', spriteScale);
    se.position.set(px + 0.16, -realEsp / 2, zFront - 0.02);
    scene.add(se);

    let frameId = 0;
    const animate = () => {
      controls.autoRotate = autoRotate;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || width;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [tab, autoRotate, realBCol, realHCol, realBZap, realHZap, realEsp, stubCol, targetY, sceneSize, spriteScale, campoActivo]);

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
        { id: 'col',   icon: '↔️', label: 'Columna',     value: `${Math.round(realBCol * 100)} × ${Math.round(realHCol * 100)} cm`, tone: campoActivo === 'bCol' || campoActivo === 'hCol' ? 'amber' : 'cyan' },
        { id: 'carga', icon: '🏋️', label: 'Carga',       value: carga > 0 ? `${carga} tn` : '—',      tone: campoActivo === 'carga' ? 'amber' : 'cyan' },
        { id: 'lado',  icon: '⬜', label: 'Lado zapata', value: `${realBZap.toFixed(2)} m`,          tone: campoActivo === 'suelo' ? 'amber' : 'cyan' },
        { id: 'esp',   icon: '📏', label: 'Espesor',     value: `${realEsp.toFixed(2)} m`,           tone: campoActivo === 'espesor' ? 'amber' : 'cyan' },
        { id: 'cant',  icon: '🔢', label: 'Cantidad',    value: `${cant > 0 ? cant : 1} und`,        tone: campoActivo === 'cant' ? 'amber' : 'cyan' },
      ]}
    >
      {tab === '3d' ? (
        <div className="viewer-canvas-wrap" style={{ height: `${VIEWER_HEIGHT}px` }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      ) : tab === 'plano2d' ? (
        <ZapataCorte2D
          bZap={realBZap}
          hZap={realHZap}
          espesor={realEsp}
          bCol={realBCol}
          hCol={realHCol}
        />
      ) : (
        <ZapataReferencia />
      )}
    </ViewerShell>
  );
};
