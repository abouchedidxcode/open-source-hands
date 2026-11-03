/**
 * The look: a dusk meadow painted once into the background (sky, low sun, three ridges), motes as soft additive
 * sprites in front of it, a grass silhouette in front of them, and a ring that follows the player's palm.
 *
 * No post-processing and no bloom: the glow is a painted halo texture, which is cheaper and easier to keep tasteful.
 * Rules work in screen space (0..1); `toWorld` maps that onto the z = 0 plane the motes live on.
 */
import * as THREE from 'three';
import type { Mote, World } from './rules';

const FOV = 50, CAM_Z = 10;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
}

/** A radial glow: a bright core fading out smoothly. Used for motes, sparks and the sun. */
function glowTexture(): THREE.Texture {
  const S = 128, { c, g } = canvas(S, S);
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  // a small hot core, then a long soft halo (the halo is what reads as glow; there is no bloom pass)
  for (let k = 0; k <= 16; k++) { const u = k / 16; grd.addColorStop(u, `rgba(255,255,255,${(Math.exp(-u * u * 60) * 0.9 + Math.pow(1 - u, 3) * 0.35).toFixed(3)})`); }
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

function ringTexture(): THREE.Texture {
  const S = 256, { c, g } = canvas(S, S);
  g.strokeStyle = 'rgba(255, 244, 225, 0.95)';
  g.lineWidth = 7;
  g.shadowColor = 'rgba(255, 210, 150, 0.9)'; g.shadowBlur = 18;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sky, sun and ridges at the window's aspect, so nothing stretches. */
function paintBackdrop(aspect: number): THREE.Texture {
  const H = 1024, W = Math.round(H * aspect), { c, g } = canvas(W, H);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1b1e33'); sky.addColorStop(0.45, '#4b3a52'); sky.addColorStop(0.68, '#c0705a'); sky.addColorStop(0.8, '#f0b071');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // a low sun just touching the far ridge, with a tight warm halo
  const sx = W * 0.64, sy = H * 0.705;
  const halo = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.3);
  halo.addColorStop(0, 'rgba(255, 214, 160, 0.7)'); halo.addColorStop(0.25, 'rgba(255, 180, 120, 0.25)'); halo.addColorStop(1, 'rgba(255, 160, 110, 0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);
  const disc = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.034);
  disc.addColorStop(0, '#fff1d6'); disc.addColorStop(0.8, '#ffd9a3'); disc.addColorStop(1, 'rgba(255, 205, 150, 0)');
  g.fillStyle = disc;
  g.beginPath(); g.arc(sx, sy, H * 0.034, 0, Math.PI * 2); g.fill();
  // three ridges, lighter and hazier with distance
  const ridges: [number, number, string][] = [[0.72, 0.04, '#8a5560'], [0.79, 0.05, '#5a3b4b'], [0.87, 0.06, '#2c2333']];
  ridges.forEach(([base, amp, col], i) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) {
      const u = Math.min(x, W) / W;
      const y = base + amp * (Math.sin(u * 5.1 + i * 2) * 0.5 + Math.sin(u * 13.7 + i) * 0.22 + Math.sin(u * 31 + i * 5) * 0.06);
      g.lineTo(u * W, y * H);
    }
    g.lineTo(W, H); g.closePath(); g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A strip of grass blades along the bottom, drawn in front of the motes so they rise out of the meadow. */
function grassTexture(): THREE.Texture {
  const W = 2048, H = 256, { c, g } = canvas(W, H);
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#16121c';
  g.fillRect(0, H * 0.82, W, H);
  for (let i = 0; i < 900; i++) {
    const x = r() * W, h = H * (0.25 + r() * 0.65), lean = (r() - 0.5) * 40, w = 3 + r() * 5;
    g.beginPath(); g.moveTo(x - w, H); g.quadraticCurveTo(x + lean * 0.3, H - h * 0.6, x + lean, H - h); g.quadraticCurveTo(x + lean * 0.3 + w * 0.3, H - h * 0.55, x + w, H); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

interface Spark { s: THREE.Sprite; vx: number; vy: number; life: number }

export class Scene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  private glow = glowTexture();
  private sprites = new Map<number, THREE.Sprite>();
  private sparks: Spark[] = [];
  private ring: THREE.Sprite;
  private grass: THREE.Mesh;
  private viewW = 1; private viewH = 1;
  aspect = 1;

  constructor(el: HTMLElement, dprCap = 2) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
    el.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 0, CAM_Z);
    this.ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), transparent: true, depthWrite: false, opacity: 0 }));
    this.ring.renderOrder = 3;
    this.scene.add(this.ring);
    this.grass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: grassTexture(), transparent: true, depthWrite: false }));
    this.grass.renderOrder = 2;
    this.scene.add(this.grass);
    this.resize();
  }

  /** Call on window resize. Ignores a 0x0 window (a hidden tab or pane), which would otherwise produce NaNs. */
  resize() {
    const w = innerWidth, h = innerHeight;
    if (w < 2 || h < 2) return;
    this.aspect = w / h;
    this.renderer.setSize(w, h);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.viewH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.viewW = this.viewH * this.aspect;
    (this.scene.background as THREE.Texture | null)?.dispose();
    this.scene.background = paintBackdrop(this.aspect);
    // grass: full width, bottom 22% of the screen; the texture repeats (or crops) with the aspect so blades keep their shape
    this.grass.scale.set(this.viewW, this.viewH * 0.22, 1);
    this.grass.position.set(0, -this.viewH * 0.39, 0.5);
    const map = (this.grass.material as THREE.MeshBasicMaterial).map!;
    map.repeat.set(this.aspect / 1.8, 1);
  }

  toWorld(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3((x - 0.5) * this.viewW, (0.5 - y) * this.viewH, 0);
  }

  /** A burst of sparks where a mote was caught. */
  burst(m: Mote) {
    const p = this.toWorld(m.x, m.y);
    const col = m.kind === 'gold' ? 0xffd27a : 0xffe9cf;
    for (let i = 0; i < (m.kind === 'gold' ? 22 : 12); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      s.position.copy(p);
      const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.6;
      this.sparks.push({ s, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 0.4, life: 1 });
      this.scene.add(s);
    }
  }

  render(w: World, hand: { x: number; y: number; pinch: number } | null, dt: number, t: number) {
    // motes: one sprite each, created and removed as the rules add and remove them
    const alive = new Set<number>();
    for (const m of w.motes) {
      alive.add(m.id);
      let s = this.sprites.get(m.id);
      if (!s) {
        s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: m.kind === 'gold' ? 0xffc65c : 0xffe2c0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        this.sprites.set(m.id, s);
        this.scene.add(s);
      }
      const p = this.toWorld(m.x, m.y);
      s.position.copy(p);
      const pulse = 1 + Math.sin(t * 3 + m.seed) * 0.12;
      const size = m.r * this.viewH * 7 * pulse;
      s.scale.set(size, size, 1);
      // fade in from the grass, out near the top
      s.material.opacity = Math.min(1, m.age * 2) * Math.min(1, (m.y + 0.05) * 5);
    }
    for (const [id, s] of this.sprites) if (!alive.has(id)) { this.scene.remove(s); s.material.dispose(); this.sprites.delete(id); }

    for (const k of this.sparks) {
      k.life -= dt * 1.6;
      k.s.position.x += k.vx * dt; k.s.position.y += k.vy * dt;
      k.vy -= 1.2 * dt;
      const size = 0.25 * k.life + 0.05;
      k.s.scale.set(size, size, 1);
      k.s.material.opacity = Math.max(0, k.life);
    }
    for (const k of this.sparks.filter((q) => q.life <= 0)) { this.scene.remove(k.s); k.s.material.dispose(); }
    this.sparks = this.sparks.filter((q) => q.life > 0);

    // the palm ring: closes as the player pinches, hidden when no hand is seen
    const rm = this.ring.material;
    rm.opacity += ((hand ? 0.9 : 0) - rm.opacity) * Math.min(1, dt * 10);
    if (hand) {
      this.ring.position.copy(this.toWorld(hand.x, hand.y)).setZ(1);
      const size = this.viewH * 0.17 * (1 - hand.pinch * 0.35);
      this.ring.scale.set(size, size, 1);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
