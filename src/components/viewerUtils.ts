import * as THREE from 'three';

// ─── Color Palette ─────────────────────────────────────────────────
export const VIEWER_COLORS = {
  // Base colors
  bg: 0x0a0d14,
  gridPrimary: 0x3b82f6,
  gridSecondary: 0x1e293b,
  
  // Materials
  concrete: 0x8b9bb4,
  concreteActive: 0x93c5fd,
  concreteEdge: 0x0284c7,
  concreteEdgeActive: 0x38bdf8,
  
  soil: 0x3d2817,
  sobrecimiento: 0xc8d3e2,
  sobrecimientoActive: 0xfef08a,
  sobrecimientoEdge: 0xd97706,
  sobrecimientoEdgeActive: 0xf59e0b,
  
  brick: 0xbe3e24,
  column: 0x94a3b8,
  columnEdge: 0x64748b,
  lintel: 0x94a3b8,
  
  // Dimension colors
  dimCyan: 0x38bdf8,
  dimCyanActive: 0xf59e0b,
  dimAmber: 0xfbbf24,
  dimAmberActive: 0xf59e0b,
  dimGreen: 0x10b981,
  dimGreenActive: 0xf59e0b,
  
  // Sprite colors
  sprite: {
    cyan: { bg: 'rgba(10, 15, 26, 0.92)', border: '#0284c7', text: '#38bdf8' },
    amber: { bg: 'rgba(10, 15, 26, 0.92)', border: '#d97706', text: '#fbbf24' },
    green: { bg: 'rgba(10, 15, 26, 0.92)', border: '#16a34a', text: '#4ade80' },
    highlight: { bg: 'rgba(245, 158, 11, 0.96)', border: '#fbbf24', text: '#0f172a' },
  },
  
  // Highlight
  highlight: 0xf59e0b,
  warning: 0xef4444,
  ok: 0x22c55e,
};

// ─── Shared Utilities ──────────────────────────────────────────────

export function createDimensionSprite(
  text: string,
  isHighlight = false,
  colorScheme: 'cyan' | 'amber' | 'green' = 'cyan',
  scale = 1
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 120;
  const ctx = canvas.getContext('2d')!;

  const scheme = VIEWER_COLORS.sprite[colorScheme];
  const bg = isHighlight ? VIEWER_COLORS.sprite.highlight.bg : scheme.bg;
  const border = isHighlight ? VIEWER_COLORS.sprite.highlight.border : scheme.border;
  const textCol = isHighlight ? VIEWER_COLORS.sprite.highlight.text : scheme.text;

  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = isHighlight ? 8 : 5;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 100, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textCol;
  ctx.font = 'bold 46px "DM Mono", monospace';
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
  const scaleMul = isHighlight ? 1.25 : 1.0;
  sprite.scale.set(1.4 * scaleMul * scale, 0.33 * scaleMul * scale, 1);
  return sprite;
}

export function createDimensionLine(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  color: number,
  tickDir: THREE.Vector3,
  tickLength = 0.08
): THREE.LineSegments {
  const geo = new THREE.BufferGeometry().setFromPoints([
    p1, p2,
    p1.clone().addScaledVector(tickDir, tickLength),
    p1.clone().addScaledVector(tickDir, -tickLength),
    p2.clone().addScaledVector(tickDir, tickLength),
    p2.clone().addScaledVector(tickDir, -tickLength),
  ]);
  const mat = new THREE.LineBasicMaterial({
    color,
    linewidth: 2,
    depthTest: false,
  });
  return new THREE.LineSegments(geo, mat);
}

// ─── Standard Camera Setup ────────────────────────────────────────

export function createStandardCamera(
  width: number,
  height: number,
  target: THREE.Vector3,
  distance: number,
  angleHorizontal = Math.PI / 4,
  angleVertical = Math.PI / 6
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(
    target.x + distance * Math.cos(angleVertical) * Math.sin(angleHorizontal),
    target.y + distance * Math.sin(angleVertical),
    target.z + distance * Math.cos(angleVertical) * Math.cos(angleHorizontal)
  );
  camera.lookAt(target);
  return camera;
}

export function createStandardLights(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffedd5, 1.8);
  dirLight.position.set(6, 9, 7);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
  fillLight.position.set(-6, 4, -4);
  scene.add(fillLight);
}

export function createStandardGrid(size: number, divisions: number, y = -0.15): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, VIEWER_COLORS.gridPrimary, VIEWER_COLORS.gridSecondary);
  grid.position.y = y;
  return grid;
}

export function createStandardRenderer(
  container: HTMLDivElement,
  width: number,
  height: number
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  return renderer;
}

// ─── Encuadre de cámara estándar (todos los visores) ──────────────
// Ángulo isométrico 3/4 fijo (azimut ≈20°, elevación ≈18°) y distancia
// proporcional al tamaño de la escena, para que TODOS los visores
// arranquen con el mismo zoom aparente y la misma posición de cámara.
export const VIEWER_HEIGHT = 350;

export function isoCameraPosition(size: number, targetY: number): { x: number; y: number; z: number } {
  const dist = size * 1.55 + 1.6;   // calibrado sobre el encuadre del visor de Muros
  const azim = 0.34;                // radianes ≈ 19.5°
  const elev = 0.32;                // radianes ≈ 18.3°
  const horiz = dist * Math.cos(elev);
  return {
    x: horiz * Math.sin(azim),
    y: targetY + dist * Math.sin(elev),
    z: horiz * Math.cos(azim),
  };
}

/**
 * Coloca la cámara y el punto de mira con la regla compartida.
 * `size` es el lado mayor del modelo (con margen) y `targetY` el centro
 * vertical del modelo. Todos los visores llaman a esta función, así el
 * encuadre no depende de fórmulas locales.
 */
export function applyStandardIsoCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  size: number,
  targetY: number
): void {
  const pos = isoCameraPosition(size, targetY);
  camera.position.set(pos.x, pos.y, pos.z);
  controls.target.set(0, targetY, 0);
  controls.update();
}

// ─── Fierro: diámetros comerciales (pulgadas) ─────────────────────
export const DIAM_PULG: Record<string, number> = {
  '1/4': 0.25, '3/8': 0.375, '1/2': 0.5, '5/8': 0.625, '3/4': 0.75,
};

// Diámetro real (pulgadas → m) exagerado para que la varilla se vea en 3D
export function varillaVisual(
  pulg: string | number,
  escala: number,
  mul = 4.5,
  min = 0.012,
  max = 0.05
): number {
  const inches = typeof pulg === 'number' ? pulg : (DIAM_PULG[pulg] ?? 0.5);
  return Math.min(Math.max(inches * 0.0254 * escala * mul, min), max);
}



// ─── Brick Texture Generator (for Muro) ────────────────────────────

export function createBrickTexture(
  aparejo: 'soga' | 'cabeza' | 'canto',
  tipo: 'kk18' | 'pand',
  highlight = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

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

// ─── Stone/Cyclopean Texture Generator (for Cimiento) ──────────────

export function createStoneTexture(highlight = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base concrete color
  const baseColor = highlight ? '#93c5fd' : '#8b9bb4';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Add stone aggregate pattern
  const colors = highlight 
    ? ['#60a5fa', '#3b82f6', '#93c5fd', '#bfdbfe']
    : ['#64748b', '#475569', '#94a3b8', '#cbd5e1'];

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 16;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Shadow/highlight for 3D effect
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.3, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

// ─── Sobrecimiento Texture ────────────────────────────────────────

export function createSobrecimientoTexture(highlight = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseColor = highlight ? '#fef08a' : '#c8d3e2';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Finer aggregate for sobrecimiento
  const colors = highlight 
    ? ['#fbbf24', '#f59e0b', '#fcd34d', '#fef08a']
    : ['#94a3b8', '#64748b', '#cbd5e1', '#e2e8f0'];

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2 + Math.random() * 8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.3, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// ─── Standard Animation Loop ──────────────────────────────────────

export function startAnimationLoop(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  controls: any
): number {
  let reqId = 0;
  const animate = () => {
    reqId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
  return reqId;
}

export function setupResizeHandler(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  container: HTMLDivElement,
  height: number
): () => void {
  const handleResize = () => {
    if (!container) return;
    const w = container.clientWidth || 400;
    camera.aspect = w / height;
    camera.updateProjectionMatrix();
    renderer.setSize(w, height);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}

// ─── Edge Highlight Helper ────────────────────────────────────────

export function addEdges(
  mesh: THREE.Mesh,
  color: number,
  linewidth = 1.5,
  opacity = 1
): void {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, linewidth, transparent: true, opacity })
  );
  mesh.add(edges);
}

export function addHighlightEdges(
  mesh: THREE.Mesh,
  isActive: boolean,
  activeColor = VIEWER_COLORS.highlight,
  inactiveColor = VIEWER_COLORS.concreteEdge
): void {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({
      color: isActive ? activeColor : inactiveColor,
      linewidth: isActive ? 2.5 : 1.5,
    })
  );
  mesh.add(edges);
}