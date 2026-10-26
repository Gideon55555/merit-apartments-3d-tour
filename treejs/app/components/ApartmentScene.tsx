'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createMaterials } from './apartment/materials';
import { Kit } from './apartment/kit';
import { setupEnvironment } from './apartment/environment';
import { CameraRig } from './apartment/cameraPath';
import { createPaperPlan } from './apartment/paperPlan';
import type { ApartmentDef } from './apartment/types';

export interface SceneAPI {
  /** Render the tour at scroll position u (in path units). Cheap when nothing changed. */
  render(u: number, dt: number): void;
}

interface ApartmentSceneProps {
  def: ApartmentDef;
  onReady: (api: SceneAPI) => void;
  onError: () => void;
  /** The GPU dropped the context (driver reset / overload); the parent remounts in safe mode */
  onContextLost: () => void;
}

const SAFE_MODE_KEY = 'merit-tour-safe-mode';

export function enableSafeMode() {
  try { sessionStorage.setItem(SAFE_MODE_KEY, '1'); } catch { /* storage unavailable */ }
}

function safeModeEnabled() {
  try { return sessionStorage.getItem(SAFE_MODE_KEY) === '1'; } catch { return false; }
}

/** Try progressively less demanding context settings before giving up */
function createRenderer() {
  const attempts: THREE.WebGLRendererParameters[] = [
    { antialias: true, powerPreference: 'high-performance', stencil: false },
    { antialias: false, powerPreference: 'default', stencil: false },
  ];
  for (const params of attempts) {
    try {
      return new THREE.WebGLRenderer(params);
    } catch {
      // try the next, cheaper configuration
    }
  }
  return null;
}

// Integrated / mobile / software GPUs: the full pipeline (AO, MSAA, many lights)
// can overload them badly enough that the browser disables WebGL.
const WEAK_GPU = /intel|vega \d\b|radeon\(tm\) graphics|radeon graphics|mali|adreno|powervr|apple gpu|swiftshader|llvmpipe|basic render/i;

function gpuName(renderer: THREE.WebGLRenderer) {
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
}

/** Pick a quality tier. `forced` (dev-only ?quality=high|low) also disables adaptive downgrades. */
function detectTier(renderer: THREE.WebGLRenderer) {
  if (process.env.NODE_ENV !== 'production') {
    const forced = new URLSearchParams(window.location.search).get('quality');
    if (forced) return { lowTier: forced === 'low', forced: true };
  }
  if (safeModeEnabled()) return { lowTier: true, forced: false };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.screen.width, window.screen.height) < 700;
  const cores = navigator.hardwareConcurrency ?? 4;
  const weakGpu = WEAK_GPU.test(gpuName(renderer));
  return { lowTier: coarse || small || cores < 4 || weakGpu, forced: false };
}

/** Keep the horizontal field of view stable across aspect ratios */
function effectiveFov(fovAt16x9: number, aspect: number) {
  const rad = THREE.MathUtils.degToRad(fovAt16x9);
  const hfov = 2 * Math.atan(Math.tan(rad / 2) * (16 / 9));
  const v = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect));
  return THREE.MathUtils.clamp(v, fovAt16x9 * 0.8, 80);
}

export default function ApartmentScene({ def, onReady, onError, onContextLost }: ApartmentSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onError, onContextLost });

  useEffect(() => {
    callbacks.current = { onReady, onError, onContextLost };
  }, [onReady, onError, onContextLost]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = createRenderer();
    if (!renderer) {
      callbacks.current.onError();
      return;
    }

    const { lowTier, forced } = detectTier(renderer);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = container.clientWidth;
    let height = container.clientHeight;
    let pixelRatio = Math.min(window.devicePixelRatio, lowTier ? 1.25 : 1.75);

    let disposed = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      if (disposed) return;
      disposed = true;
      enableSafeMode();
      callbacks.current.onContextLost();
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; // static lighting: render shadows once
    renderer.shadowMap.needsUpdate = true;
    container.appendChild(renderer.domElement);

    // --- Scene ---
    const scene = new THREE.Scene();
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const { materials, dispose: disposeMaterials } = createMaterials(anisotropy);
    const kit = new Kit(materials, lowTier);
    const apartment = def.build(kit);
    scene.add(apartment);
    const env = setupEnvironment(scene, renderer, def.bounds);
    const noAO = [...kit.noAO, env.sky];

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 200);
    const rig = new CameraRig(def.keys);

    // --- Post-processing: MSAA + ground-truth ambient occlusion ---
    let composer: EffectComposer | null = null;
    let gtao: GTAOPass | null = null;
    if (!lowTier) {
      const target = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      composer = new EffectComposer(renderer, target);
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, width * pixelRatio, height * pixelRatio);
      gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.1, samples: 16 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      gtao.blendIntensity = 0.85;
      // Keep glass, curtains and the sky out of the AO G-buffer
      const pass = gtao;
      const baseOverride = pass.overrideVisibility.bind(pass);
      pass.overrideVisibility = () => {
        baseOverride();
        noAO.forEach((o) => { o.visible = false; });
      };
      composer.addPass(gtao);
      composer.addPass(new OutputPass());
    }

    // --- Camera state ---
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const parallax = window.matchMedia('(pointer: fine)').matches && !reducedMotion;
    let lastU = -1;
    let dirty = true;

    // Adaptive quality: drop AO if frames stay slow
    let slowFrames = 0;
    let degraded = forced;

    // Dynamic resolution: render smaller while moving if the GPU can't keep
    // up, then a single full-resolution frame once the camera settles
    let renderScale = 1;
    let movingScale = 1;
    let frameMs = 16;
    let framesSinceAdjust = 0;
    let lastMotion = 0;
    const applyScale = (scale: number) => {
      if (Math.abs(scale - renderScale) < 0.01) return;
      renderScale = scale;
      renderer.setPixelRatio(pixelRatio * scale);
      if (composer) {
        composer.setPixelRatio(pixelRatio * scale);
        composer.setSize(width, height);
      }
    };

    // Intro: paper plan fades while the model extrudes out of it
    let paper: Awaited<ReturnType<typeof createPaperPlan>> | null = null;
    let lastRise = -1;
    const lightBase = kit.lights.map((l) => l.intensity);
    const smoothstep = (a: number, b: number, x: number) => {
      const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (parallax) window.addEventListener('pointermove', onPointerMove, { passive: true });

    const render = (u: number, dt: number) => {
      if (disposed) return;
      const k = 1 - Math.exp(-dt * 3);
      pointer.sx += (pointer.x - pointer.sx) * k;
      pointer.sy += (pointer.y - pointer.sy) * k;
      const settling = Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) > 0.0005;
      const moving = settling || Math.abs(u - lastU) >= 1e-5;
      const now = performance.now();
      if (!dirty && !moving) {
        // Settled: sharpen to full resolution once
        if (renderScale < 1 && now - lastMotion > 250) {
          applyScale(1);
          dirty = true;
        } else {
          return;
        }
      }
      if (moving) {
        if (renderScale !== movingScale) applyScale(movingScale);
        if (dt > 0 && dt < 0.25 && now - lastMotion < 100) {
          frameMs += (dt * 1000 - frameMs) * 0.1;
          if (++framesSinceAdjust > 20) {
            framesSinceAdjust = 0;
            if (frameMs > 24 && movingScale > 0.75) movingScale = Math.max(0.75, movingScale - 0.05);
            else if (frameMs < 15 && movingScale < 1) movingScale = Math.min(1, movingScale + 0.05);
          }
        }
        lastMotion = now;
      }
      lastU = u;
      dirty = false;

      // Paper plan → 3D model
      paper?.setOpacity(1 - smoothstep(0.25, 0.75, u));
      const rise = smoothstep(0.4, 1.25, u);
      if (rise !== lastRise) {
        lastRise = rise;
        apartment.scale.y = 0.015 + 0.985 * rise;
        env.setGrowth(rise);
        // Room lights come on as the walls rise (no hot spots on the flat plan)
        kit.lights.forEach((light, i) => { light.intensity = lightBase[i] * rise; });
        renderer.shadowMap.needsUpdate = true;
      }

      const sample = rig.sample(u, pos, look);
      camera.position.copy(pos);
      // Looking straight down, world-up is degenerate and tiny sideways drift
      // would spin the image; keep north up there, blend to world-up as it tilts
      fwd.subVectors(look, pos).normalize();
      const w = smoothstep(0.995, 0.92, Math.abs(fwd.y));
      camera.up.set(0, w, w - 1).normalize();
      camera.lookAt(look);
      // Gentle mouse parallax, off over the paper plan so it never wobbles
      const par = parallax ? smoothstep(0.9, 1.8, u) : 0;
      if (par > 0) {
        camera.rotateY(-pointer.sx * 0.012 * par);
        camera.rotateX(-pointer.sy * 0.008 * par);
      }

      const aspect = width / height;
      camera.aspect = aspect;
      camera.fov = effectiveFov(sample.fov, aspect);
      camera.updateProjectionMatrix();
      // Lens shift keeps the subject clear of the copy (sideways on wide
      // screens, upwards on portrait where the copy sits at the bottom)
      const narrow = aspect < 0.9;
      const sx = narrow ? 0 : sample.shift * THREE.MathUtils.clamp((aspect - 0.9) / 0.5, 0, 1);
      const sy = narrow ? sample.lift : 0;
      camera.projectionMatrix.elements[8] -= sx;
      camera.projectionMatrix.elements[9] -= sy;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      env.sky.position.copy(camera.position);

      if (composer) composer.render(dt);
      else renderer.render(scene, camera);

      if (!degraded && composer && dt > 0) {
        slowFrames = dt > 1 / 30 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
        if (slowFrames > 40) {
          degraded = true;
          if (gtao) gtao.enabled = false;
          pixelRatio = 1;
          renderer.setPixelRatio(1);
          composer.setPixelRatio(1);
          composer.setSize(width, height);
          dirty = true;
        }
      }
    };

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      composer?.setSize(width, height);
      dirty = true;
      render(lastU < 0 ? 0 : lastU, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // Compile shaders up front so the first scroll doesn't hitch
    rig.sample(0, pos, look);
    camera.position.copy(pos);
    camera.lookAt(look);
    let startRaf = 0;
    const start = () => {
      if (disposed) return;
      renderer.compile(scene, camera);
      render(0, 0);
      dirty = true; // first frame can miss freshly uploaded textures; redraw next frame
      if (process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('debug')) {
        import('./apartment/debugPath').then(({ reportPath }) => reportPath(scene, rig));
      }
      callbacks.current.onReady({ render });
    };
    createPaperPlan(def.paper(kit), anisotropy).then((p) => {
      if (disposed) {
        p.dispose();
        return;
      }
      paper = p;
      scene.add(p.group);
      noAO.push(...p.meshes);
      startRaf = requestAnimationFrame(start);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(startRaf);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      composer?.dispose();
      gtao?.dispose();
      paper?.dispose();
      env.dispose();
      kit.dispose();
      disposeMaterials();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [def]);

  return <div ref={containerRef} className="canvas-container" />;
}
