'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Lenis from 'lenis';
import ApartmentScene, { type SceneAPI } from './ApartmentScene';
import { sceneAnchor, sceneAt } from './apartment/cameraPath';
import { UNITS, UNIT_LIST, type UnitSlug } from './apartment/units';

/** Scroll distance per path unit */
const VH_PER_UNIT = 52;
/** Copy fades in/out over this many units either side of a hold */
const FADE = 0.45;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pad2 = (n: number) => String(n).padStart(2, '0');

// ============================================================
// SCROLL EXPERIENCE
// A single rAF loop drives Lenis, the camera and the copy, so they can
// never drift out of sync, and nothing re-renders React per frame.
// The unit definition (model, route, copy) comes from apartment/units.
// ============================================================
export default function ScrollExperience({ slug }: { slug: UnitSlug }) {
  const def = UNITS[slug];
  const scenes = def.scenes;
  const holds = def.holds;
  const total = def.keys[def.keys.length - 1].u;

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const overlaysRef = useRef<(HTMLDivElement | null)[]>([]);
  const apiRef = useRef<SceneAPI | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const snapRef = useRef(false);
  /** Linked mode: position along the path (0–1) sent by the host page */
  const linkedRef = useRef(0);
  const metrics = useRef({ top: 0, range: 1 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [active, setActive] = useState(0);
  // Embedded on another site (?embed=1): hide the Merit chrome and the
  // enquiry section; ?cta=<https url> sends the final button to the host
  // site's own contact page instead. ?linked=1 hands scrolling to the host
  // page (see useLinkedScroll). Theme: ?accent, ?bg, ?text (hex) and
  // ?display, ?body (Google Fonts family names) match the host's brand.
  const [embed] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const cta = params.get('cta');
    applyTheme(params);
    return {
      on: params.has('embed'),
      linked: params.has('embed') && params.has('linked') && window.parent !== window,
      cta: cta && /^https?:\/\//i.test(cta) ? cta : null,
    };
  });

  const scrollForUnits = useCallback(
    (u: number) => metrics.current.top + (u / total) * metrics.current.range,
    [total],
  );

  const handleReady = useCallback((api: SceneAPI) => {
    apiRef.current = api;
    setStatus('ready');
  }, []);
  const handleError = useCallback(() => setStatus('error'), []);
  // GPU reset: remount the scene in safe (low) quality instead of leaving a dead canvas
  const [sceneKey, setSceneKey] = useState(0);
  const lossCount = useRef(0);
  const handleContextLost = useCallback(() => {
    apiRef.current = null;
    lossCount.current += 1;
    if (lossCount.current > 2) setStatus('error');
    else setSceneKey((k) => k + 1);
  }, []);

  // Lenis + the frame loop
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    // Linked: this page doesn't scroll at all, so wheel and touch fall
    // through to the host page, which reports its progress back
    const lenis = embed.linked
      ? null
      : new Lenis({
          autoRaf: false,
          lerp: reduced ? 1 : 0.08,
          smoothWheel: !reduced,
          wheelMultiplier: 0.9,
          anchors: true,
        });
    lenis?.stop();
    lenisRef.current = lenis;

    const measure = () => {
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      metrics.current.top = track.getBoundingClientRect().top + window.scrollY;
      metrics.current.range = Math.max(1, track.offsetHeight - stage.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);

    // Cache the animated elements of each overlay
    const overlays = overlaysRef.current.map((el) => ({
      el,
      scrim: el?.querySelector<HTMLElement>('.text-scrim') ?? null,
      items: el ? Array.from(el.querySelectorAll<HTMLElement>('.animate-in')) : [],
      last: -1,
    }));

    const updateOverlays = (u: number) => {
      holds.forEach(([a, b], i) => {
        const o = overlays[i];
        if (!o?.el) return;
        const tin = i === 0 ? 1 : clamp01((u - (a - FADE)) / FADE);
        const tout = i === holds.length - 1 ? 1 : clamp01((b + FADE - u) / FADE);
        const key = Math.round(tin * 1000) * 10000 + Math.round(tout * 1000);
        if (key === o.last) return;
        o.last = key;
        const vis = Math.min(tin, tout);
        o.el.style.visibility = vis > 0 ? 'visible' : 'hidden';
        o.el.classList.toggle('is-active', vis > 0.6);
        if (o.scrim) o.scrim.style.opacity = String(vis);
        o.items.forEach((item, j) => {
          const enter = 1 - Math.pow(1 - clamp01(tin * 1.35 - j * 0.09), 3);
          const y = (1 - enter) * 26 - (1 - tout) * 14;
          item.style.opacity = String(Math.min(enter, tout));
          item.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        });
      });
    };

    let raf = 0;
    let last = performance.now();
    let uSmooth = -1;
    let activeIdx = 0;
    let hintHidden = false;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      let u: number;
      if (lenis) {
        lenis.raf(now);
        const { top, range } = metrics.current;
        u = clamp01((lenis.animatedScroll - top) / range) * total;
      } else {
        u = linkedRef.current * total;
      }
      // Light extra damping smooths keyboard jumps and touch flicks
      if (uSmooth < 0 || reduced || snapRef.current) {
        uSmooth = u;
        snapRef.current = false;
      } else {
        uSmooth += (u - uSmooth) * (1 - Math.exp(-dt * 9));
        if (Math.abs(u - uSmooth) < 1e-4) uSmooth = u;
      }

      updateOverlays(uSmooth);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${(uSmooth / total).toFixed(4)})`;
      const hide = uSmooth > 0.15;
      if (hide !== hintHidden && hintRef.current) {
        hintHidden = hide;
        hintRef.current.classList.toggle('hidden', hide);
      }
      const idx = sceneAt(holds, uSmooth);
      if (idx !== activeIdx) {
        activeIdx = idx;
        setActive(idx);
      }
      apiRef.current?.render(uSmooth, dt);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, [holds, total, embed.linked]);

  // Linked mode: follow the host page's scroll progress
  useEffect(() => {
    if (!embed.linked) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.data?.type !== 'merit-tour:progress') return;
      const p = Number(e.data.progress);
      if (Number.isFinite(p)) linkedRef.current = clamp01(p);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [embed.linked]);

  useEffect(() => {
    if (embed.linked && status !== 'loading') {
      window.parent.postMessage({ type: 'merit-tour:ready' }, '*');
      snapRef.current = true;
    }
  }, [embed.linked, status]);

  // Unlock scrolling once the scene is ready (or failed); honour deep links
  useEffect(() => {
    const lenis = lenisRef.current;
    if (status === 'loading' || !lenis) return;
    lenis.start();

    const params = new URLSearchParams(window.location.search);
    const devU = process.env.NODE_ENV !== 'production' ? params.get('u') : null;
    const hashIndex = scenes.findIndex((s) => `#${s.id}` === window.location.hash);
    const u = devU !== null ? Number(devU) : hashIndex >= 0 ? sceneAnchor(holds, hashIndex) : 0;
    lenis.scrollTo(scrollForUnits(u), { immediate: true, force: true });
    snapRef.current = true;
  }, [status, scenes, holds, scrollForUnits]);

  const goToScene = (index: number) => {
    if (embed.linked) {
      window.parent.postMessage({ type: 'merit-tour:goto', progress: sceneAnchor(holds, index) / total }, '*');
      return;
    }
    const lenis = lenisRef.current;
    if (!lenis) return;
    const target = scrollForUnits(sceneAnchor(holds, index));
    const distance = Math.abs(target - lenis.animatedScroll) / window.innerHeight;
    lenis.scrollTo(target, {
      duration: Math.min(3.2, Math.max(1.2, 0.9 + distance * 0.18)),
      easing: easeInOutCubic,
    });
  };

  return (
    <>
      {/* Loading screen */}
      <div className={`loading-screen ${status !== 'loading' ? 'loaded' : ''}`} aria-hidden={status !== 'loading'}>
        <div className="loading-text">Merit Properties</div>
        <div className="loading-bar-container">
          <div className={`loading-bar ${status !== 'loading' ? 'is-done' : 'is-filling'}`} />
        </div>
        <div className="loading-text loading-text--small">Preparing your experience</div>
      </div>

      {!embed.on && <div className="brand">Merit Properties</div>}
      {!embed.on && <nav className="unit-switch" aria-label="Apartment types">
        {UNIT_LIST.map((u) => (
          <Link key={u.slug} href={u.path} className={u.slug === slug ? 'is-current' : ''} aria-current={u.slug === slug ? 'page' : undefined}>
            {u.shortName}
          </Link>
        ))}
      </nav>}
      <div ref={progressRef} className="progress-bar" />

      <nav className="nav-dots" aria-label="Scene navigation">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            className={`nav-dot ${active === index ? 'active' : ''}`}
            aria-label={`Go to ${scene.title}`}
            aria-current={active === index ? 'step' : undefined}
            onClick={() => goToScene(index)}
          />
        ))}
      </nav>

      <div ref={hintRef} className="scroll-indicator">
        <span className="scroll-indicator__text">Scroll to Explore</span>
        <div className="scroll-indicator__line" />
      </div>

      {/* Tour: tall track with a sticky full-screen stage */}
      <section
        ref={trackRef}
        className="tour-track"
        style={{ height: embed.linked ? '100vh' : `calc(${total * VH_PER_UNIT}vh + 100vh)` }}
        aria-label={`3D tour of the ${def.name.toLowerCase()} apartment`}
      >
        <div ref={stageRef} className="tour-stage">
          {status === 'error' ? (
            <div className="webgl-fallback">
              <Image src={def.planImage.src} alt={`${def.name} apartment floor plan`} width={def.planImage.width} height={def.planImage.height} priority style={{ height: 'auto' }} />
              <p>Your browser can&apos;t display the 3D tour, so here is the floor plan instead.</p>
            </div>
          ) : (
            <ApartmentScene key={sceneKey} def={def} onReady={handleReady} onError={handleError} onContextLost={handleContextLost} />
          )}

          {scenes.map((scene, index) => {
            const Title = index === 0 ? 'h1' : 'h2';
            return (
              <div
                key={scene.id}
                ref={(el) => { overlaysRef.current[index] = el; }}
                className={`text-overlay text-overlay--${scene.position}`}
              >
                <div className="text-scrim" />
                <div className={`text-content text-content--${scene.position} ${scene.isFinal ? 'glass-card' : ''}`}>
                  <div className="section-indicator animate-in">{pad2(index + 1)} / {pad2(scenes.length)}</div>
                  <Title className="room-title animate-in">{scene.title}</Title>
                  <p className="room-description animate-in">{scene.description}</p>
                  {scene.area && <span className="room-area animate-in">{scene.area}</span>}
                  {scene.isFinal && (
                    <>
                      <div className="stats-grid animate-in">
                        {def.stats.map(([value, label]) => (
                          <div key={label} className="stat-item">
                            <span className="stat-value">{value}</span>
                            <span className="stat-label">{label}</span>
                          </div>
                        ))}
                      </div>
                      {(!embed.on || embed.cta) && (
                        <a
                          href={embed.on && embed.cta ? embed.cta : '#enquire'}
                          target={embed.on ? '_top' : undefined}
                          rel={embed.on ? 'noopener' : undefined}
                          className="cta-button animate-in"
                        >
                          Enquire About This Apartment
                          <ArrowIcon />
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Enquiry (the host site provides its own when embedded) */}
      {!embed.on && <section id="enquire" className="enquiry">
        <div className="enquiry__inner">
          <h2 className="enquiry__title">Interested in This Apartment?</h2>
          <p className="enquiry__text">
            Contact Merit Properties to learn more about availability, pricing, and viewing appointments
            for the {def.name.toLowerCase()} apartment. Our team is ready to help you find your next home.
          </p>
          <a href="mailto:info@meritproperties.com" className="cta-button cta-button--static">
            Send an Enquiry
            <ArrowIcon />
          </a>
          <p className="enquiry__note">Prices and availability are subject to confirmation.</p>
        </div>
      </section>}
    </>
  );
}

const HEX = /^[0-9a-f]{6}$/i;
const FAMILY = /^[a-z0-9 ]{2,40}$/i;

/** Host-site theme from the URL: colours as hex, fonts as Google Fonts family names */
function applyTheme(params: URLSearchParams) {
  const root = document.documentElement.style;
  const hex = (name: string) => {
    const v = params.get(name);
    return v && HEX.test(v) ? v : null;
  };
  const accent = hex('accent');
  const bg = hex('bg');
  const text = hex('text');
  if (accent) root.setProperty('--color-accent', `#${accent}`);
  if (bg) {
    root.setProperty('--color-bg', `#${bg}`);
    root.setProperty('--color-bg-overlay', `color-mix(in srgb, #${bg} 65%, transparent)`);
    root.setProperty('--color-glass', `color-mix(in srgb, #${bg} 40%, transparent)`);
  }
  if (text) {
    root.setProperty('--color-text-primary', `#${text}`);
    root.setProperty('--color-text-secondary', `color-mix(in srgb, #${text} 60%, transparent)`);
    root.setProperty('--color-text-muted', `color-mix(in srgb, #${text} 35%, transparent)`);
    root.setProperty('--color-divider', `color-mix(in srgb, #${text} 10%, transparent)`);
    root.setProperty('--color-glass-border', `color-mix(in srgb, #${text} 8%, transparent)`);
  }

  const display = params.get('display');
  const body = params.get('body');
  const families = [display, body].filter((f): f is string => !!f && FAMILY.test(f));
  if (!families.length) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f.trim().replace(/ +/g, '+')}${f === body ? ':wght@300;400;500;600' : ''}`)
    .join('&')}&display=swap`;
  document.head.appendChild(link);
  if (display && FAMILY.test(display)) root.setProperty('--font-display', `'${display}', var(--font-playfair), Georgia, serif`);
  if (body && FAMILY.test(body)) root.setProperty('--font-body', `'${body}', var(--font-inter), sans-serif`);
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
