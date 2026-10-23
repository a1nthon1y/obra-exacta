import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  VIEWER_COLORS,
  createDimensionSprite,
  createDimensionLine,
  createStandardRenderer,
  createStandardLights,
  createStandardGrid,
  createStoneTexture,
  createSobrecimientoTexture,
  startAnimationLoop,
  setupResizeHandler,
  addHighlightEdges,
  applyStandardIsoCamera,
} from './viewerUtils';
import { CimientoCorte2D } from './CimientoCorte2D';
import { CimientoReferencia } from './CimientoReferencia';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('cimientos');

interface Props {
  largo: number;      // m
  ancho: number;      // m
  prof: number;       // m
  esp: number;        // m (sobrecimiento)
  alto: number;       // m (sobrecimiento)
  campoActivo?: string | null;
}

export const CimientoViewer3D: React.FC<Props> = ({
  largo,
  ancho,
  prof,
  esp,
  alto,
  campoActivo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [tab, setTab] = useState<'3d' | 'plano2d' | 'referencia'>('3d');
  const [autoRotate, setAutoRotate] = useState(false);

  // Valores reales con fallbacks
  const realLargo = largo > 0 ? largo : 10;
  const realAncho = ancho > 0 ? ancho : 0.6;
  const realProf = prof > 0 ? prof : 0.8;
  const realEsp = esp > 0 ? esp : 0.15;
  const realAlto = alto > 0 ? alto : 0.4;

  // Escalas visuales proporcionadas (consistentes con MuroViewer3D)
  const visualLargo = Math.min(Math.max(realLargo * 0.35, 3.0), 6.0);
  const visualAncho = Math.max(realAncho * 1.8, 0.5);
  const visualProf = Math.max(realProf * 1.2, 0.5);
  const visualEsp = Math.max(realEsp * 2.5, 0.18);
  const visualAlto = Math.max(realAlto * 2.5, 0.3);

  // Texturas procedurales
  const stoneTexture = useMemo(() => createStoneTexture(campoActivo === 'ancho' || campoActivo === 'prof'), [campoActivo]);
  const sobreTexture = useMemo(() => createSobrecimientoTexture(campoActivo === 'esp' || campoActivo === 'alto'), [campoActivo]);

  useEffect(() => {
    if (tab !== '3d' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = 350;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(VIEWER_COLORS.bg);

    // Cámara en ángulo isométrico 3/4 estándar (encuadre compartido: viewerUtils.isoCameraPosition)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const sceneSize = Math.max(visualLargo, visualAncho, visualAlto + visualProf);

    const renderer = createStandardRenderer(container, width, height);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    applyStandardIsoCamera(camera, controls, sceneSize, (visualAlto - visualProf) / 2);
    controls.update();

    // Luces estándar
    createStandardLights(scene);

    // Grid del terreno
    const grid = createStandardGrid(12, 16, -visualProf - 0.1);
    scene.add(grid);

    // Suelo excavado
    const sueloMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 });
    const sueloBase = new THREE.Mesh(
      new THREE.BoxGeometry(visualAncho + 1.0, 0.15, visualLargo + 1.0),
      sueloMat
    );
    sueloBase.position.set(0, -visualProf - 0.075, 0);
    scene.add(sueloBase);

    // ── 1. CIMIENTO CORRIDO (Concreto ciclópeo) ───────────────────
    const cimientoGeo = new THREE.BoxGeometry(visualAncho, visualProf, visualLargo);
    const isCimientoActive = campoActivo === 'ancho' || campoActivo === 'prof';
    const cimientoMat = new THREE.MeshStandardMaterial({
      map: stoneTexture,
      roughness: 0.85,
      metalness: 0.08,
      color: isCimientoActive ? 0xfef08a : 0xffffff,
    });
    const cimiento = new THREE.Mesh(cimientoGeo, cimientoMat);
    cimiento.position.set(0, -visualProf / 2, 0);
    cimiento.castShadow = true;
    cimiento.receiveShadow = true;
    scene.add(cimiento);

    addHighlightEdges(cimiento, isCimientoActive, VIEWER_COLORS.highlight, VIEWER_COLORS.concreteEdge);

    // Piedras grandes incrustadas
    const piedraMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.95 });
    const piedraGeo = new THREE.DodecahedronGeometry(0.12, 1);
    const numPiedras = Math.max(8, Math.floor(visualLargo * visualAncho * 10));
    for (let i = 0; i < numPiedras; i++) {
      const pMesh = new THREE.Mesh(piedraGeo, piedraMat);
      pMesh.position.set(
        (Math.random() - 0.5) * (visualAncho * 0.75),
        (Math.random() - 0.5) * (visualProf * 0.8),
        (Math.random() - 0.5) * (visualLargo * 0.9)
      );
      const s = 0.7 + Math.random() * 0.6;
      pMesh.scale.set(s, s * 0.9, s);
      pMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      cimiento.add(pMesh);
    }

    // ── 2. SOBRECIMIENTO ──────────────────────────────────────────
    const sobreGeo = new THREE.BoxGeometry(visualEsp, visualAlto, visualLargo);
    const isSobrecActive = campoActivo === 'esp' || campoActivo === 'alto';
    const sobreMat = new THREE.MeshStandardMaterial({
      map: sobreTexture,
      roughness: 0.75,
      metalness: 0.1,
      color: isSobrecActive ? 0xfef08a : 0xffffff,
    });
    const sobre = new THREE.Mesh(sobreGeo, sobreMat);
    sobre.position.set(0, visualAlto / 2, 0);
    sobre.castShadow = true;
    scene.add(sobre);

    addHighlightEdges(sobre, isSobrecActive, VIEWER_COLORS.highlight, VIEWER_COLORS.sobrecimientoEdge);

    // Piedras medianas en sobrecimiento
    const piedraMedGeo = new THREE.DodecahedronGeometry(0.05, 1);
    const numPiedrasSob = Math.max(6, Math.floor(visualLargo * 6));
    for (let i = 0; i < numPiedrasSob; i++) {
      const pm = new THREE.Mesh(piedraMedGeo, piedraMat);
      pm.position.set(
        (Math.random() - 0.5) * (visualEsp * 0.7),
        (Math.random() - 0.5) * (visualAlto * 0.8),
        (Math.random() - 0.5) * (visualLargo * 0.9)
      );
      sobre.add(pm);
    }

    // ── 3. MURO DE GUÍA (Ladrillo) ────────────────────────────────
    const ladrilloGeo = new THREE.BoxGeometry(visualEsp * 0.92, 0.2, visualLargo * 0.95);
    const muroGuia = new THREE.Mesh(
      ladrilloGeo,
      new THREE.MeshStandardMaterial({ color: 0xbe3e24, roughness: 0.85 })
    );
    muroGuia.position.set(0, visualAlto + 0.1, 0);
    muroGuia.castShadow = true;
    scene.add(muroGuia);

    // ── 4. LÍNEAS DE COTA 3D Y SPRITES ────────────────────────────
    const zFront = visualLargo / 2 + 0.1;

    // Estados activos para cotas
    const isLargoActive = campoActivo === 'largo';
    const isAnchoActive = campoActivo === 'ancho';
    const isProfActive = campoActivo === 'prof';
    const isAltoActive = campoActivo === 'alto';
    const isEspActive = campoActivo === 'esp';

    // A) Cota de ANCHO DEL CIMIENTO (Eje X)
    const anchoY = -visualProf - 0.22;
    const cotaAnchoP1 = new THREE.Vector3(-visualAncho / 2, anchoY, zFront);
    const cotaAnchoP2 = new THREE.Vector3(visualAncho / 2, anchoY, zFront);
    const lineAncho = createDimensionLine(
      cotaAnchoP1, cotaAnchoP2,
      isAnchoActive ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(0, 1, 0)
    );
    scene.add(lineAncho);

    const spriteAncho = createDimensionSprite(
      `Ancho: ${realAncho.toFixed(2)} m`,
      isAnchoActive,
      'cyan'
    );
    spriteAncho.position.set(0, anchoY - 0.15, zFront);
    scene.add(spriteAncho);

    // B) Cota de PROFUNDIDAD DE ZANJA (Eje Y negativo)
    const profX = visualAncho / 2 + 0.4;
    const cotaProfP1 = new THREE.Vector3(profX, 0, zFront);
    const cotaProfP2 = new THREE.Vector3(profX, -visualProf, zFront);
    const lineProf = createDimensionLine(
      cotaProfP1, cotaProfP2,
      isProfActive ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(1, 0, 0)
    );
    scene.add(lineProf);

    const spriteProf = createDimensionSprite(
      `Prof: ${realProf.toFixed(2)} m`,
      isProfActive,
      'cyan'
    );
    spriteProf.position.set(profX + 0.4, -visualProf / 2, zFront);
    scene.add(spriteProf);

    // C) Cota de ALTURA DE SOBRECIMIENTO (Eje Y positivo)
    const altoX = visualEsp / 2 + 0.38;
    const cotaAltoP1 = new THREE.Vector3(altoX, 0, zFront);
    const cotaAltoP2 = new THREE.Vector3(altoX, visualAlto, zFront);
    const lineAlto = createDimensionLine(
      cotaAltoP1, cotaAltoP2,
      isAltoActive ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber,
      new THREE.Vector3(1, 0, 0)
    );
    scene.add(lineAlto);

    const spriteAlto = createDimensionSprite(
      `Alto: ${realAlto.toFixed(2)} m`,
      isAltoActive,
      'amber'
    );
    spriteAlto.position.set(altoX + 0.42, visualAlto / 2, zFront);
    scene.add(spriteAlto);

    // D) Cota de ESPESOR DEL SOBRECIMIENTO (Eje X superior)
    const espY = visualAlto + 0.32;
    const cotaEspP1 = new THREE.Vector3(-visualEsp / 2, espY, zFront);
    const cotaEspP2 = new THREE.Vector3(visualEsp / 2, espY, zFront);
    const lineEsp = createDimensionLine(
      cotaEspP1, cotaEspP2,
      isEspActive ? VIEWER_COLORS.dimAmberActive : VIEWER_COLORS.dimAmber,
      new THREE.Vector3(0, 1, 0)
    );
    scene.add(lineEsp);

    const spriteEsp = createDimensionSprite(
      `Esp: ${realEsp.toFixed(2)} m`,
      isEspActive,
      'amber'
    );
    spriteEsp.position.set(0, espY + 0.18, zFront);
    scene.add(spriteEsp);

    // E) Cota de LARGO TOTAL (Eje Z longitudinal)
    const largoX = -visualAncho / 2 - 0.5;
    const cotaLargoP1 = new THREE.Vector3(largoX, -visualProf / 3, -visualLargo / 2);
    const cotaLargoP2 = new THREE.Vector3(largoX, -visualProf / 3, visualLargo / 2);
    const lineLargo = createDimensionLine(
      cotaLargoP1, cotaLargoP2,
      isLargoActive ? VIEWER_COLORS.dimCyanActive : VIEWER_COLORS.dimCyan,
      new THREE.Vector3(1, 0, 0)
    );
    scene.add(lineLargo);

    const spriteLargo = createDimensionSprite(
      `Largo: ${realLargo.toFixed(1)} m`,
      isLargoActive,
      'cyan'
    );
    spriteLargo.position.set(largoX - 0.5, -visualProf / 3, 0);
    scene.add(spriteLargo);

    // Animación
    const reqId = startAnimationLoop(renderer, scene, camera, controls);

    // Redimensionamiento
    const cleanupResize = setupResizeHandler(renderer, camera, container, height);

    return () => {
      cleanupResize();
      cancelAnimationFrame(reqId);
      renderer.dispose();
      stoneTexture.dispose();
      sobreTexture.dispose();
      container.innerHTML = '';
    };
  }, [
    tab,
    realLargo,
    realAncho,
    realProf,
    realEsp,
    realAlto,
    visualLargo,
    visualAncho,
    visualProf,
    visualEsp,
    visualAlto,
    campoActivo,
    autoRotate,
    stoneTexture,
    sobreTexture,
  ]);

  return (
    <div className="viewer-card">
      <div className="viewer-bar">
        <div className="viewer-title">
          <span>{etapa.icon}</span> {etapa.tituloVisor}
        </div>

        <div className="viewer-toggles">
          <button
            type="button"
            className={`viewer-toggle-btn ${tab === '3d' ? 'active' : ''}`}
            onClick={() => setTab('3d')}
          >
            Vista 3D
          </button>
          <button
            type="button"
            className={`viewer-toggle-btn ${tab === 'plano2d' ? 'active' : ''}`}
            onClick={() => setTab('plano2d')}
          >
            Plano 2D
          </button>
          <button
            type="button"
            className={`viewer-toggle-btn ${tab === 'referencia' ? 'active' : ''}`}
            onClick={() => setTab('referencia')}
          >
            Referencia
          </button>
        </div>
      </div>

      {/* Tira interactiva de medidas (estilo unificado con MuroViewer3D) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '8px 12px',
          background: 'rgba(9, 11, 16, 0.95)',
          borderBottom: '1px solid #333a47',
        }}
      >
        <span
          className={`viewer-badge ${campoActivo === 'largo' ? 'amber' : 'cyan'}`}
          style={{ transition: 'all 0.2s' }}
        >
          <span className="viewer-badge-dot"></span>
          <span>📏 Largo: <strong>{largo ? `${largo} m` : '—'}</strong></span>
        </span>
        <span
          className={`viewer-badge ${campoActivo === 'ancho' ? 'amber' : 'cyan'}`}
          style={{ transition: 'all 0.2s' }}
        >
          <span className="viewer-badge-dot"></span>
          <span>↔️ Ancho: <strong>{ancho ? `${ancho} m` : '—'}</strong></span>
        </span>
        <span
          className={`viewer-badge ${campoActivo === 'prof' ? 'amber' : 'cyan'}`}
          style={{ transition: 'all 0.2s' }}
        >
          <span className="viewer-badge-dot"></span>
          <span>⬇️ Prof: <strong>{prof ? `${prof} m` : '—'}</strong></span>
        </span>
        <span
          className={`viewer-badge ${campoActivo === 'alto' ? 'amber' : 'amber'}`}
          style={{ transition: 'all 0.2s' }}
        >
          <span className="viewer-badge-dot"></span>
          <span>⬆️ Alto Sob.: <strong>{alto ? `${alto} m` : '—'}</strong></span>
        </span>
        <span
          className={`viewer-badge ${campoActivo === 'esp' ? 'amber' : 'amber'}`}
          style={{ transition: 'all 0.2s' }}
        >
          <span className="viewer-badge-dot"></span>
          <span>🔲 Espesor: <strong>{esp ? `${esp} m` : '—'}</strong></span>
        </span>
      </div>

      {tab === '3d' ? (
        <div className="viewer-canvas-wrap" style={{ height: '350px' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* HUD indicador de campo activo (igual a MuroViewer3D) */}
          {campoActivo && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 12,
                background: 'rgba(245, 158, 11, 0.92)',
                color: '#0f172a',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              📍 Editando:{' '}
              {campoActivo === 'largo'
                ? 'LARGO DEL CIMIENTO (Longitudinal)'
                : campoActivo === 'ancho'
                ? 'ANCHO DEL CIMIENTO (Transversal)'
                : campoActivo === 'prof'
                ? 'PROFUNDIDAD DE ZANJA (Vertical)'
                : campoActivo === 'alto'
                ? 'ALTURA DEL SOBRECIMIENTO'
                : campoActivo === 'esp'
                ? 'ESPESOR DEL SOBRECIMIENTO'
                : campoActivo}
            </div>
          )}

          <div className="viewer-footer-controls">
            <button
              type="button"
              className="viewer-btn-ctrl"
              onClick={() => setAutoRotate(r => !r)}
            >
              {autoRotate ? '⏸ Detener giro' : '⟳ Auto-rotar'}
            </button>
            <span className="viewer-hint">
              🖱️ Arrastra para girar • Rueda para zoom
            </span>
          </div>
        </div>
      ) : tab === 'plano2d' ? (
        <CimientoCorte2D
          realLargo={realLargo}
          realAncho={realAncho}
          realProf={realProf}
          realEsp={realEsp}
          realAlto={realAlto}
        />
      ) : (
        <CimientoReferencia />
      )}
    </div>
  );
};