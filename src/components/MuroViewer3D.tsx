import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TABLAS from '../engine/tablas.json';
import { applyStandardIsoCamera } from './viewerUtils';
import { getEtapa } from '../config/etapas';

const etapa = getEtapa('muros');

interface Props {
  largo: number;       // m
  alto: number;        // m
  aparejo: 'soga' | 'cabeza' | 'canto';
  ladrillo: 'kk18' | 'pand';
  uso: 'portante' | 'tabique';
  puertas: number;
  altoP: number;
  anchoP: number;
  ventanas: number;
  altoV: number;
  anchoV: number;
  lb?: number;         // cm — medidas del ladrillo comercial (default KK18)
  ab?: number;
  hb?: number;
  campoActivo?: string | null;
}

// Generador de etiquetas flotantes en 3D (Canvas Sprites de alta definición)
function createDimensionSprite(
  text: string,
  isHighlight = false,
  colorScheme: 'cyan' | 'amber' | 'green' = 'cyan'
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 120;
  const ctx = canvas.getContext('2d')!;

  const bg = isHighlight ? 'rgba(245, 158, 11, 0.96)' : 'rgba(10, 15, 26, 0.92)';
  const border = isHighlight ? '#fbbf24' : colorScheme === 'cyan' ? '#0284c7' : colorScheme === 'green' ? '#16a34a' : '#d97706';
  const textCol = isHighlight ? '#0f172a' : colorScheme === 'cyan' ? '#38bdf8' : colorScheme === 'green' ? '#4ade80' : '#fbbf24';

  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = isHighlight ? 8 : 5;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 100, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textCol;
  ctx.font = 'bold 44px "DM Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  const scaleMul = isHighlight ? 1.3 : 1.0;
  sprite.scale.set(1.45 * scaleMul, 0.34 * scaleMul, 1);
  return sprite;
}

// Línea de cota 3D con marcas terminales (ticks)
function createDimensionLine(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  color: number,
  tickDir: THREE.Vector3,
  tickLength = 0.10
) {
  const points: THREE.Vector3[] = [];
  points.push(p1.clone(), p2.clone());

  const t1A = p1.clone().addScaledVector(tickDir, tickLength);
  const t1B = p1.clone().addScaledVector(tickDir, -tickLength);
  const t2A = p2.clone().addScaledVector(tickDir, tickLength);
  const t2B = p2.clone().addScaledVector(tickDir, -tickLength);

  const geo = new THREE.BufferGeometry().setFromPoints([
    p1, p2,
    t1A, t1B,
    t2A, t2B,
  ]);
  const mat = new THREE.LineBasicMaterial({
    color,
    linewidth: 2,
    depthTest: false,
  });
  return new THREE.LineSegments(geo, mat);
}

// Textura procedural de ladrillos según aparejo y tipo
function createBrickTexture(
  aparejo: 'soga' | 'cabeza' | 'canto',
  tipo: 'kk18' | 'pand',
  highlight = false
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Mortero gris
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 512, 512);

  const cols = aparejo === 'cabeza' ? 7 : aparejo === 'canto' ? 4 : 5;
  const rows = aparejo === 'canto' ? 4 : 8;
  const brickW = 512 / cols;
  const brickH = 512 / rows;
  const mortar = 8;

  const baseHue = tipo === 'kk18' ? 14 : 18;
  const baseSat = highlight ? 85 : 68;
  const baseLight = highlight ? 55 : tipo === 'kk18' ? 42 : 46;

  for (let r = 0; r < rows; r++) {
    const isOdd = r % 2 === 1;
    const offset = isOdd ? brickW / 2 : 0;

    for (let c = -1; c <= cols + 1; c++) {
      const x = c * brickW + offset + mortar / 2;
      const y = r * brickH + mortar / 2;
      const w = brickW - mortar;
      const h = brickH - mortar;

      const lightVar = (Math.sin(r * 37 + c * 19) * 4);
      ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, ${baseLight + lightVar}%)`;
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(x, y + h - 3, w, 3);
      ctx.fillRect(x + w - 3, y, 3, h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillRect(x, y, 2, h);

      if (tipo === 'kk18' && w > 30) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x + w * (0.25 + i * 0.25), y + h * 0.5, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tipo === 'pand' && w > 30) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + h * 0.35);
        ctx.lineTo(x + w - 4, y + h * 0.35);
        ctx.moveTo(x + 4, y + h * 0.65);
        ctx.lineTo(x + w - 4, y + h * 0.65);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export const MuroViewer3D: React.FC<Props> = ({
  largo,
  alto,
  aparejo,
  ladrillo,
  uso,
  puertas,
  altoP,
  anchoP,
  ventanas,
  altoV,
  anchoV,
  lb,
  ab,
  hb,
  campoActivo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [tab, setTab] = useState<'3d' | 'plano2d' | 'aparejos'>('3d');
  const [autoRotate, setAutoRotate] = useState(false);

  // Medidas reales con fallbacks
  const realLargo = largo > 0 ? largo : 6.0;
  const realAlto  = alto > 0 ? alto : 2.5;
  const numPuertas  = Math.max(0, Math.floor(Number(puertas) || 0));
  const numVentanas = Math.max(0, Math.floor(Number(ventanas) || 0));
  const realAltoP   = altoP > 0 ? altoP : 2.10;
  const realAnchoP  = anchoP > 0 ? anchoP : 0.90;
  const realAltoV   = altoV > 0 ? altoV : 1.20;
  const realAnchoV  = anchoV > 0 ? anchoV : 1.20;

  // Medidas del ladrillo (cm) con fallback al KK18 estándar
  const cmL = lb && lb > 0 ? lb : 24;
  const cmA = ab && ab > 0 ? ab : 13;
  const cmH = hb && hb > 0 ? hb : 9;

  // Espesor real según aparejo y medidas del ladrillo
  const realEspesor = (aparejo === 'soga' ? cmA : aparejo === 'cabeza' ? cmL : cmH) / 100;
  const esbeltez = realAlto / realEspesor;

  // Ficha técnica desde la MISMA tabla Capeco que usa el motor de cálculo
  const fichaLad = ladrillo === 'pand'
    ? { soga: TABLAS.ladrillos.pand_soga, cabeza: TABLAS.ladrillos.pand_cabeza, canto: TABLAS.ladrillos.pand_canto }
    : { soga: TABLAS.ladrillos.kk18_soga, cabeza: TABLAS.ladrillos.kk18_cabeza, canto: TABLAS.ladrillos.kk18_canto };

  // Escalas visuales 3D proporcionadas
  const visualLargo = Math.min(Math.max(realLargo * 0.45, 3.2), 6.2);
  const visualAlto  = Math.min(Math.max(realAlto * 0.55, 1.8), 3.2);
  const scaleX = visualLargo / realLargo;
  const scaleY = visualAlto / realAlto;

  // Espesor visual proporcional bien diferenciado para la perspectiva 3D
  // Cabeza = ancho (0.50), Soga = mediano (0.30), Canto = delgado (0.16)
  const visualEsp = aparejo === 'cabeza' ? 0.50 : aparejo === 'soga' ? 0.30 : 0.16;

  // Texturas de ladrillo
  const brickTexture = useMemo(() => {
    const isMuroActive = campoActivo === 'aparejo' || campoActivo === 'ladrillo';
    return createBrickTexture(aparejo, ladrillo, isMuroActive);
  }, [aparejo, ladrillo, campoActivo]);

  useEffect(() => {
    if (tab !== '3d' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = 350;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);

    // Cámara en ángulo isométrico 3/4 estándar (encuadre compartido: viewerUtils.isoCameraPosition)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const sceneSize = Math.max(visualLargo, visualAlto + visualEsp);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    applyStandardIsoCamera(camera, controls, sceneSize, visualAlto / 2);
    controls.update();

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    dirLight.position.set(6, 9, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    // Grid del suelo
    const grid = new THREE.GridHelper(12, 16, 0x3b82f6, 0x1e293b);
    grid.position.y = -0.15;
    scene.add(grid);

    // ── 1. SOBRECIMIENTO DE BASE (Hormigón ciclópeo) ──────────────────
    const sobreBaseGeo = new THREE.BoxGeometry(visualLargo + 0.25, 0.22, visualEsp + 0.08);
    const sobreBaseMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.9,
    });
    const sobreBase = new THREE.Mesh(sobreBaseGeo, sobreBaseMat);
    sobreBase.position.set(0, -0.01, 0);
    sobreBase.receiveShadow = true;
    scene.add(sobreBase);

    // ── 2. COLUMNAS DE CONFINAMIENTO LATERALES (Concreto) ─────────────
    const colAncho = Math.max(visualEsp * 1.1, 0.26);
    const colGeo = new THREE.BoxGeometry(colAncho, visualAlto + 0.1, visualEsp * 1.08);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
    });

    const colIzq = new THREE.Mesh(colGeo, colMat);
    colIzq.position.set(-visualLargo / 2 + colAncho / 2, visualAlto / 2, 0);
    scene.add(colIzq);

    const colDer = new THREE.Mesh(colGeo, colMat);
    colDer.position.set(visualLargo / 2 - colAncho / 2, visualAlto / 2, 0);
    scene.add(colDer);

    // ── 3. PAÑO DE MURO DE ALBAÑILERÍA CON VANOS (Puertas y Ventanas) ──
    const isAparejoActive = campoActivo === 'aparejo';
    const isLargoActive = campoActivo === 'largo';
    const isAltoActive = campoActivo === 'alto';
    const isPuertasActive = campoActivo === 'puertas';
    const isVentanasActive = campoActivo === 'ventanas';

    const muroMat = new THREE.MeshStandardMaterial({
      map: brickTexture,
      roughness: 0.82,
      metalness: 0.05,
      color: isAparejoActive ? 0xfef08a : 0xffffff,
    });

    const dintelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
    });

    const anchoNetoMuro = visualLargo - colAncho * 2;
    const xInicioMuro = -anchoNetoMuro / 2;

    const hayPuerta = numPuertas > 0 && anchoNetoMuro > (realAnchoP * scaleX + 0.6);
    const hayVentana = numVentanas > 0 && anchoNetoMuro > (realAnchoV * scaleX + 0.6);

    const vAltoP = Math.min(realAltoP * scaleY, visualAlto * 0.9);
    const vAnchoP = Math.min(realAnchoP * scaleX, anchoNetoMuro * 0.45);

    const vAltoV = Math.min(realAltoV * scaleY, visualAlto * 0.55);
    const vAnchoV = Math.min(realAnchoV * scaleX, anchoNetoMuro * 0.45);
    const vAlfeizar = Math.min(1.0 * scaleY, visualAlto - vAltoV - 0.2);

    function addWallBlock(x: number, y: number, w: number, h: number, isLintel = false, isDoorOpening = false, isWindowOpening = false) {
      if (w <= 0.02 || h <= 0.02) return;
      const bGeo = new THREE.BoxGeometry(w, h, visualEsp);
      const bMesh = new THREE.Mesh(bGeo, isLintel ? dintelMat : muroMat);
      bMesh.position.set(x + w / 2, y + h / 2, 0);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      scene.add(bMesh);

      const isHighlight =
        (isDoorOpening && isPuertasActive) ||
        (isWindowOpening && isVentanasActive) ||
        (isLargoActive) ||
        (isAltoActive) ||
        (isAparejoActive);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bGeo),
        new THREE.LineBasicMaterial({
          color: isHighlight ? 0xf59e0b : isLintel ? 0x475569 : 0x7c2d12,
          linewidth: isHighlight ? 2.5 : 1.2,
        })
      );
      bMesh.add(edges);
    }

    if (!hayPuerta && !hayVentana) {
      addWallBlock(xInicioMuro, 0.1, anchoNetoMuro, visualAlto - 0.1);
    } else if (hayPuerta && !hayVentana) {
      const pX = xInicioMuro + anchoNetoMuro * 0.25;
      addWallBlock(xInicioMuro, 0.1, pX - xInicioMuro, visualAlto - 0.1);
      const hSobreP = visualAlto - vAltoP - 0.1;
      addWallBlock(pX, vAltoP + 0.1, vAnchoP, 0.12, true, true);
      if (hSobreP > 0.15) {
        addWallBlock(pX, vAltoP + 0.1 + 0.12, vAnchoP, hSobreP - 0.12, false, true);
      }
      const xDer = pX + vAnchoP;
      addWallBlock(xDer, 0.1, (xInicioMuro + anchoNetoMuro) - xDer, visualAlto - 0.1);
    } else if (!hayPuerta && hayVentana) {
      const vX = xInicioMuro + (anchoNetoMuro - vAnchoV) / 2;
      addWallBlock(xInicioMuro, 0.1, vX - xInicioMuro, visualAlto - 0.1);
      addWallBlock(vX, 0.1, vAnchoV, vAlfeizar, false, false, true);
      addWallBlock(vX, vAlfeizar + vAltoV + 0.1, vAnchoV, 0.12, true, false, true);
      const ySobre = vAlfeizar + vAltoV + 0.1 + 0.12;
      const hSobre = visualAlto - ySobre;
      if (hSobre > 0.05) {
        addWallBlock(vX, ySobre, vAnchoV, hSobre, false, false, true);
      }
      const xDer = vX + vAnchoV;
      addWallBlock(xDer, 0.1, (xInicioMuro + anchoNetoMuro) - xDer, visualAlto - 0.1);
    } else {
      const pX = xInicioMuro + anchoNetoMuro * 0.15;
      const vX = pX + vAnchoP + (anchoNetoMuro - vAnchoP - vAnchoV) * 0.45;

      addWallBlock(xInicioMuro, 0.1, pX - xInicioMuro, visualAlto - 0.1);
      addWallBlock(pX, vAltoP + 0.1, vAnchoP, 0.12, true, true);
      const hSobreP = visualAlto - (vAltoP + 0.1 + 0.12);
      if (hSobreP > 0.05) addWallBlock(pX, vAltoP + 0.22, vAnchoP, hSobreP, false, true);

      addWallBlock(pX + vAnchoP, 0.1, vX - (pX + vAnchoP), visualAlto - 0.1);

      addWallBlock(vX, 0.1, vAnchoV, vAlfeizar, false, false, true);
      addWallBlock(vX, vAlfeizar + vAltoV + 0.1, vAnchoV, 0.12, true, false, true);
      const ySobreV = vAlfeizar + vAltoV + 0.22;
      const hSobreV = visualAlto - ySobreV;
      if (hSobreV > 0.05) addWallBlock(vX, ySobreV, vAnchoV, hSobreV, false, false, true);

      const xFinV = vX + vAnchoV;
      addWallBlock(xFinV, 0.1, (xInicioMuro + anchoNetoMuro) - xFinV, visualAlto - 0.1);
    }

    // ── 4. LÍNEAS DE COTA 3D EXACTAS CON SPRITES ───────────────────────
    const zFront = visualEsp / 2 + 0.08;

    // A) Cota de LARGO TOTAL DEL MURO (Eje X Horizontal)
    const cotaLargoY = visualAlto / 2 - 0.1; // place within wall height
    const cotaLargoP1 = new THREE.Vector3(-visualLargo / 2, cotaLargoY, zFront);
    const cotaLargoP2 = new THREE.Vector3(visualLargo / 2, cotaLargoY, zFront);
    const lineLargo = createDimensionLine(
      cotaLargoP1,
      cotaLargoP2,
      isLargoActive ? 0xf59e0b : 0x38bdf8,
      new THREE.Vector3(0, 1, 0)
    );
    scene.add(lineLargo);

    const spriteLargo = createDimensionSprite(
      `Largo: ${realLargo.toFixed(2)} m`,
      isLargoActive,
      'cyan'
    );
    spriteLargo.position.set(0, cotaLargoY - 0.12, zFront);
    scene.add(spriteLargo);

    // B) Cota de ALTURA TOTAL DEL MURO (Eje Y Vertical)
    const cotaAltoX = visualLargo / 2 - 0.15; // place inside wall right edge
    const cotaAltoP1 = new THREE.Vector3(cotaAltoX, 0, zFront);
    const cotaAltoP2 = new THREE.Vector3(cotaAltoX, visualAlto, zFront);
    const lineAlto = createDimensionLine(
      cotaAltoP1,
      cotaAltoP2,
      isAltoActive ? 0xf59e0b : 0xfbbf24,
      new THREE.Vector3(1, 0, 0)
    );
    scene.add(lineAlto);

    const spriteAlto = createDimensionSprite(
      `Alto: ${realAlto.toFixed(2)} m`,
      isAltoActive,
      'amber'
    );
    spriteAlto.position.set(cotaAltoX - 0.2, visualAlto / 2, zFront);
    scene.add(spriteAlto);

    // C) Cota de ESPESOR DEL MURO / APAREJO (Eje Z Transversal en la parte superior)
    // Se dibuja en la esquina superior izquierda del muro atravesando de -visualEsp/2 a +visualEsp/2
    const cotaEspX = -visualLargo / 2 + 0.4;
    const cotaEspY = visualAlto + 0.15;
    const cotaEspP1 = new THREE.Vector3(cotaEspX, cotaEspY, -visualEsp / 2);
    const cotaEspP2 = new THREE.Vector3(cotaEspX, cotaEspY, visualEsp / 2);
    const lineEsp = createDimensionLine(
      cotaEspP1,
      cotaEspP2,
      isAparejoActive ? 0xf59e0b : 0x10b981,
      new THREE.Vector3(1, 0, 0),
      0.08
    );
    scene.add(lineEsp);

    const spriteEspesor = createDimensionSprite(
      `Espesor: ${(realEspesor * 100).toFixed(0)} cm (${aparejo})`,
      isAparejoActive,
      'green'
    );
    spriteEspesor.position.set(cotaEspX, cotaEspY + 0.22, 0);
    scene.add(spriteEspesor);

    // Animación y render loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Redimensionamiento
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 400;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      renderer.dispose();
      brickTexture.dispose();
      container.innerHTML = '';
    };
  }, [
    tab,
    realLargo,
    realAlto,
    realEspesor,
    visualLargo,
    visualAlto,
    visualEsp,
    scaleX,
    scaleY,
    numPuertas,
    numVentanas,
    realAltoP,
    realAnchoP,
    realAltoV,
    realAnchoV,
    aparejo,
    ladrillo,
    campoActivo,
    autoRotate,
    brickTexture,
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
            className={`viewer-toggle-btn ${tab === 'aparejos' ? 'active' : ''}`}
            onClick={() => setTab('aparejos')}
          >
            Referencia
          </button>
        </div>
      </div>

      {/* Tira interactiva de medidas ingresadas (igual a Cimientos) */}
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
          <span>📏 Largo: <strong>{largo > 0 ? `${largo} m` : '—'}</strong></span>
        </span>
        <span
          className={`viewer-badge ${campoActivo === 'alto' ? 'amber' : 'cyan'}`}
          style={{ transition: 'all 0.2s' }}
        >
          <span className="viewer-badge-dot"></span>
          <span>⬆️ Alto: <strong>{alto > 0 ? `${alto} m` : '—'}</strong></span>
        </span>
        <span
          className={`viewer-badge ${campoActivo === 'aparejo' ? 'amber' : 'amber'}`}
          style={{ transition: 'all 0.2s' }}
        >
          <span className="viewer-badge-dot"></span>
          <span>🔲 Espesor ({aparejo}): <strong>{(realEspesor * 100).toFixed(0)} cm</strong></span>
        </span>
        <span className="viewer-badge cyan" style={{ transition: 'all 0.2s' }}>
          <span className="viewer-badge-dot"></span>
          <span>🧱 Ladrillo: <strong>{ladrillo === 'kk18' ? 'King Kong 18' : 'Pandereta'}</strong></span>
        </span>
        <span
          className="viewer-badge"
          style={{
            transition: 'all 0.2s',
            borderColor: esbeltez > 20 ? '#ef4444' : esbeltez > 17 ? '#f59e0b' : '#22c55e',
            color: esbeltez > 20 ? '#fca5a5' : esbeltez > 17 ? '#fde047' : '#86efac',
          }}
        >
          <span
            className="viewer-badge-dot"
            style={{
              background: esbeltez > 20 ? '#ef4444' : esbeltez > 17 ? '#f59e0b' : '#22c55e',
            }}
          ></span>
          <span>
            Esbeltez H/e: <strong>{esbeltez.toFixed(1)}</strong>{' '}
            {esbeltez > 20 ? '(Excede E.070)' : esbeltez > 17 ? '(Al límite)' : '(Óptimo)'}
          </span>
        </span>
      </div>

      {tab === '3d' ? (
        <div className="viewer-canvas-wrap" style={{ height: '350px' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* Indicador HUD en vivo de qué medida se está editando */}
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
                ? 'LARGO DEL MURO (Horizontal)'
                : campoActivo === 'alto'
                ? 'ALTURA DEL MURO (Vertical)'
                : campoActivo === 'aparejo'
                ? `ESPESOR / APAREJO (${aparejo.toUpperCase()} - ${(realEspesor * 100).toFixed(0)} cm)`
                : campoActivo === 'puertas'
                ? 'PUERTA (Descuento de vano)'
                : campoActivo === 'ventanas'
                ? 'VENTANA (Descuento de vano)'
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
        /* Plano de elevación arquitectónica 2D acotada */
        <div className="viewer-2d">
          <svg
            viewBox="0 0 540 280"
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            <defs>
              <pattern id="hatch-muro" width="24" height="12" patternUnits="userSpaceOnUse">
                <rect width="24" height="12" fill="#831843" fillOpacity="0.15" />
                <rect x="0" y="0" width="23" height="5.5" fill="#c2410c" fillOpacity="0.75" />
                <rect x="12" y="6" width="23" height="5.5" fill="#c2410c" fillOpacity="0.75" />
                <line x1="0" y1="6" x2="24" y2="6" stroke="#94a3b8" strokeWidth="0.8" />
                <line x1="12" y1="0" x2="12" y2="6" stroke="#94a3b8" strokeWidth="0.8" />
                <line x1="0" y1="6" x2="0" y2="12" stroke="#94a3b8" strokeWidth="0.8" />
              </pattern>
              <marker id="arrow-c" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
              </marker>
              <marker id="arrow-a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" />
              </marker>
            </defs>

            {/* Suelo y sobrecimiento */}
            <line x1="30" y1="215" x2="510" y2="215" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            <rect x="60" y="195" width="420" height="20" fill="#475569" stroke="#64748b" strokeWidth="1.5" />
            <text x="270" y="209" fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              SOBRECIMIENTO e = {(realEspesor * 100).toFixed(0)} cm
            </text>

            {/* Columnas de amarre */}
            <rect x="60" y="35" width="22" height="160" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="71" y="120" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(-90 71 120)">
              COLUMNA
            </text>
            <rect x="458" y="35" width="22" height="160" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="469" y="120" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(-90 469 120)">
              COLUMNA
            </text>

            {/* Paño de Muro */}
            <rect x="82" y="35" width="376" height="160" fill="url(#hatch-muro)" stroke="#ea580c" strokeWidth="1.5" />

            {/* Vanos si existen */}
            {numPuertas > 0 && (
              <g>
                <rect x="135" y="65" width="60" height="130" fill="#0b1329" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                <rect x="133" y="55" width="64" height="10" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="135" y1="65" x2="195" y2="195" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                <line x1="135" y1="195" x2="195" y2="65" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                <rect x="145" y="120" width="40" height="16" rx="3" fill="#0284c7" />
                <text x="165" y="132" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">PUERTA</text>
                <text x="165" y="148" fill="#7dd3fc" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  {realAnchoP.toFixed(2)}×{realAltoP.toFixed(2)}m
                </text>
              </g>
            )}

            {numVentanas > 0 && (
              <g>
                <rect x="295" y="75" width="85" height="65" fill="#0b1329" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 3" />
                <rect x="293" y="65" width="89" height="10" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="295" y1="75" x2="380" y2="140" stroke="#fbbf24" strokeWidth="0.8" opacity="0.6" />
                <line x1="295" y1="140" x2="380" y2="75" stroke="#fbbf24" strokeWidth="0.8" opacity="0.6" />
                <rect x="312" y="98" width="50" height="16" rx="3" fill="#d97706" />
                <text x="337" y="110" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">VENTANA</text>
                <text x="337" y="125" fill="#fef08a" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  {realAnchoV.toFixed(2)}×{realAltoV.toFixed(2)}m
                </text>
              </g>
            )}

            {/* Cota Largo Total */}
            <line x1="60" y1="240" x2="480" y2="240" stroke="#38bdf8" strokeWidth="1.5" markerStart="url(#arrow-c)" markerEnd="url(#arrow-c)" />
            <line x1="60" y1="215" x2="60" y2="248" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 2" />
            <line x1="480" y1="215" x2="480" y2="248" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 2" />
            <rect x="220" y="230" width="100" height="20" rx="4" fill="#070b14" stroke="#38bdf8" strokeWidth="1" />
            <text x="270" y="244" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              L = {realLargo.toFixed(2)} m
            </text>

            {/* Cota Altura Total */}
            <line x1="505" y1="35" x2="505" y2="195" stroke="#fbbf24" strokeWidth="1.5" markerStart="url(#arrow-a)" markerEnd="url(#arrow-a)" />
            <line x1="480" y1="35" x2="515" y2="35" stroke="#fbbf24" strokeWidth="0.8" />
            <line x1="480" y1="195" x2="515" y2="195" stroke="#fbbf24" strokeWidth="0.8" />
            <rect x="475" y="105" width="60" height="18" rx="4" fill="#070b14" stroke="#fbbf24" strokeWidth="1" />
            <text x="505" y="118" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              H = {realAlto.toFixed(2)} m
            </text>
          </svg>

          <div className="viewer-2d-desc">
            📐 <strong>Elevación estructural:</strong> Muestra el paño de albañilería, vanos acotados y columnas de confinamiento reglamentarias.
          </div>
        </div>
      ) : (
        /* Aparejos y Normativa RNE */
        <div className="ref-wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {/* Soga */}
            <div
              style={{
                border: aparejo === 'soga' ? '2px solid #ea580c' : '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                background: aparejo === 'soga' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f97316', marginBottom: '4px' }}>
                🧱 Soga ({cmA} cm)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                • <strong>{fichaLad.soga.und_m2} ladrillos/m²</strong><br />
                • {fichaLad.soga.mortero_m3} m³ mortero/m²<br />
                • Uso: Muros perimétricos y portantes típicos en viviendas de 1-3 pisos.
              </div>
            </div>

            {/* Cabeza */}
            <div
              style={{
                border: aparejo === 'cabeza' ? '2px solid #ea580c' : '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                background: aparejo === 'cabeza' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f97316', marginBottom: '4px' }}>
                🪨 Cabeza ({cmL} cm)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                • <strong>{fichaLad.cabeza.und_m2} ladrillos/m²</strong><br />
                • {fichaLad.cabeza.mortero_m3} m³ mortero/m²<br />
                • Uso: Muros de contención, primer piso en suelos blandos o alta carga sísmica.
              </div>
            </div>

            {/* Canto */}
            <div
              style={{
                border: aparejo === 'canto' ? '2px solid #ea580c' : '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                background: aparejo === 'canto' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f97316', marginBottom: '4px' }}>
                📦 Canto ({cmH} cm)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                • <strong>{fichaLad.canto.und_m2} ladrillos/m²</strong><br />
                • {fichaLad.canto.mortero_m3} m³ mortero/m²<br />
                • Uso: Solo tabiques divisorios sin carga estructural (ductos, clósets).
              </div>
            </div>
          </div>

          {/* Advertencia interactiva de norma peruana */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: ladrillo === 'pand' && uso === 'portante' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.1)',
              border: `1px solid ${ladrillo === 'pand' && uso === 'portante' ? '#ef4444' : '#0284c7'}`,
              fontSize: '0.75rem',
              color: '#e2e8f0',
              lineHeight: '1.45',
            }}
          >
            {ladrillo === 'pand' && uso === 'portante' ? (
              <div>
                <strong style={{ color: '#f87171' }}>⚠️ ADVERTENCIA CRÍTICA RNE E.070:</strong><br />
                El <strong>ladrillo pandereta está estrictamente prohibido</strong> en muros que soportan techo o sismos. Sus huecos tubulares horizontales colapsan de forma frágil en terremotos. Para muros portantes utiliza siempre <strong>King Kong 18 huecos</strong> artesanal o de fábrica.
              </div>
            ) : (
              <div>
                <strong style={{ color: '#38bdf8' }}>ℹ️ RECOMENDACIÓN DE ASENTADO (SENCICO):</strong><br />
                • Junta horizontal y vertical: <strong>1.0 a 1.5 cm</strong> (nunca mayor a 1.5 cm ni menor a 1.0 cm).<br />
                • Altura máxima de asentado por jornada de trabajo: <strong>1.30 metros</strong> para evitar deformaciones en el mortero fresco.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
