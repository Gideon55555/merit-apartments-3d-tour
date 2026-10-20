'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ApartmentScene, { getCameraKeyframes } from './ApartmentScene';

gsap.registerPlugin(ScrollTrigger);

// ============================================================
// SCENE DATA
// ============================================================
interface SceneData {
  id: string;
  indicator: string;
  title: string;
  description: string;
  area?: string;
  position: 'left' | 'right' | 'center';
  isFinal?: boolean;
}

const SCENES: SceneData[] = [
  {
    id: 'overview',
    indicator: '01 / 07',
    title: 'Designed for Modern Living',
    description: 'Discover a thoughtfully planned 44 m² apartment.',
    area: '44 m² net · 49 m² gross',
    position: 'center',
  },
  {
    id: 'living-dining',
    indicator: '02 / 07',
    title: 'Space to Live Beautifully',
    description: 'An inviting living and dining area designed for comfort, connection, and everyday living.',
    area: '14 m² · Living & Dining',
    position: 'left',
  },
  {
    id: 'kitchen',
    indicator: '03 / 07',
    title: 'Everyday Living, Thoughtfully Designed',
    description: 'A practical, modern kitchen that makes the most of every square metre.',
    area: '6 m² · Kitchen',
    position: 'right',
  },
  {
    id: 'bedroom',
    indicator: '04 / 07',
    title: 'Your Private Sanctuary',
    description: 'A comfortable bedroom designed for privacy, rest, and relaxation.',
    area: '12 m² · Bedroom',
    position: 'left',
  },
  {
    id: 'bathroom',
    indicator: '05 / 07',
    title: 'Everyday Comfort, Elevated',
    description: 'A thoughtfully arranged bathroom that combines practical design with refined finishes.',
    area: '7 m² · Bathroom',
    position: 'right',
  },
  {
    id: 'balconies',
    indicator: '06 / 07',
    title: 'Bring the Outside In',
    description: 'Two compact balcony spaces that add openness and an outdoor connection to apartment living.',
    area: '2 m² + 3 m² · Two Balconies',
    position: 'left',
  },
  {
    id: 'final',
    indicator: '07 / 07',
    title: 'Your Next Chapter Starts Here',
    description: 'Discover a home where thoughtful planning meets modern living.',
    position: 'center',
    isFinal: true,
  },
];

// ============================================================
// SCROLL EXPERIENCE COMPONENT
// ============================================================
export default function ScrollExperience() {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const textOverlaysRef = useRef<(HTMLDivElement | null)[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScroll, setShowScroll] = useState(true);
  const lenisRef = useRef<InstanceType<typeof import('lenis').default> | null>(null);

  const handleSceneReady = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Initialize Lenis smooth scrolling
  useEffect(() => {
    let lenis: InstanceType<typeof import('lenis').default> | null = null;
    let rafId: number;

    const initLenis = async () => {
      const Lenis = (await import('lenis')).default;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
      });
      lenisRef.current = lenis;

      // Connect Lenis to GSAP ScrollTrigger
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis?.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    };

    initLenis();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) lenis.destroy();
      gsap.ticker.remove(() => {});
    };
  }, []);

  // Setup GSAP ScrollTrigger and camera animation
  useEffect(() => {
    if (!isLoaded || !cameraRef.current || !wrapperRef.current || !canvasWrapperRef.current) return;

    const camera = cameraRef.current;
    const keyframes = getCameraKeyframes();
    const totalScenes = SCENES.length;
    const scrollLength = totalScenes * 100; // vh per scene

    // Create the main scroll timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapperRef.current,
        start: 'top top',
        end: `+=${scrollLength}vh`,
        scrub: 1.5,
        pin: canvasWrapperRef.current,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          setScrollProgress(self.progress);
          const sceneIndex = Math.min(
            Math.floor(self.progress * totalScenes),
            totalScenes - 1
          );
          setActiveScene(sceneIndex);
          setShowScroll(self.progress < 0.05);
        },
      },
    });

    // Add camera position animations for each keyframe transition
    const cameraPos = { x: keyframes[0].position.x, y: keyframes[0].position.y, z: keyframes[0].position.z };
    const cameraTarget = { x: keyframes[0].target.x, y: keyframes[0].target.y, z: keyframes[0].target.z };
    const lookAtTarget = new THREE.Vector3();

    // Setup animation update function
    const updateCamera = () => {
      camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
      lookAtTarget.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
      camera.lookAt(lookAtTarget);
    };

    // Add keyframe transitions
    for (let i = 1; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const duration = 1 / (keyframes.length - 1);

      tl.to(cameraPos, {
        x: kf.position.x,
        y: kf.position.y,
        z: kf.position.z,
        duration,
        ease: 'power2.inOut',
        onUpdate: updateCamera,
      }, (i - 1) * duration);

      tl.to(cameraTarget, {
        x: kf.target.x,
        y: kf.target.y,
        z: kf.target.z,
        duration,
        ease: 'power2.inOut',
      }, (i - 1) * duration);
    }

    // Text overlay animations
    SCENES.forEach((scene, index) => {
      const overlay = textOverlaysRef.current[index];
      if (!overlay) return;

      const elements = overlay.querySelectorAll('.animate-in');
      const progress = index / totalScenes;
      const sceneLength = 1 / totalScenes;

      // Fade in
      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: 'top top',
        end: `+=${scrollLength}vh`,
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          const sceneStart = progress;
          const sceneEnd = progress + sceneLength;
          const fadeDuration = sceneLength * 0.2;
          const holdStart = sceneStart + fadeDuration;
          const holdEnd = sceneEnd - fadeDuration;

          if (p >= sceneStart && p <= sceneEnd) {
            let opacity = 1;
            if (p < holdStart) {
              opacity = (p - sceneStart) / fadeDuration;
            } else if (p > holdEnd) {
              opacity = 1 - (p - holdEnd) / fadeDuration;
            }
            opacity = Math.max(0, Math.min(1, opacity));
            overlay.style.opacity = String(opacity);
            overlay.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';

            elements.forEach((el, elIndex) => {
              const stagger = elIndex * 0.05;
              let elOpacity = opacity;
              let elY = 0;
              if (p < holdStart) {
                const elProgress = Math.max(0, (p - sceneStart - stagger * fadeDuration) / (fadeDuration * (1 - stagger)));
                elOpacity = Math.max(0, Math.min(1, elProgress));
                elY = (1 - elOpacity) * 25;
              } else if (p > holdEnd) {
                elY = (1 - opacity) * -15;
                elOpacity = opacity;
              }
              (el as HTMLElement).style.opacity = String(elOpacity);
              (el as HTMLElement).style.transform = `translateY(${elY}px)`;
            });
          } else {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
          }
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
      tl.kill();
    };
  }, [isLoaded]);

  return (
    <>
      {/* Loading screen */}
      <div className={`loading-screen ${isLoaded ? 'loaded' : ''}`}>
        <div className="loading-text">Merit Properties</div>
        <div className="loading-bar-container">
          <div className="loading-bar" style={{ transform: `scaleX(${isLoaded ? 1 : 0.3})` }} />
        </div>
        <div className="loading-text" style={{ fontSize: '0.6rem', opacity: 0.5 }}>
          Preparing your experience
        </div>
      </div>

      {/* Brand */}
      <div className="brand">Merit Properties</div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ transform: `scaleX(${scrollProgress})` }} />

      {/* Navigation dots */}
      <nav className="nav-dots" aria-label="Scene navigation">
        {SCENES.map((scene, index) => (
          <button
            key={scene.id}
            className={`nav-dot ${activeScene === index ? 'active' : ''}`}
            aria-label={`Go to ${scene.title}`}
            onClick={() => {
              const scrollLength = SCENES.length * 100;
              const targetScroll = (index / SCENES.length) * scrollLength;
              const vh = window.innerHeight;
              window.scrollTo({
                top: targetScroll * vh / 100,
                behavior: 'smooth',
              });
            }}
          />
        ))}
      </nav>

      {/* Scroll indicator */}
      <div className={`scroll-indicator ${showScroll ? '' : 'hidden'}`}>
        <span className="scroll-indicator__text">Scroll to Explore</span>
        <div className="scroll-indicator__line" />
      </div>

      {/* Main experience */}
      <div ref={wrapperRef} className="experience-wrapper">
        <div ref={canvasWrapperRef} style={{ position: 'relative', width: '100%', height: '100vh' }}>
          <ApartmentScene onReady={handleSceneReady} cameraRef={cameraRef} />

          {/* Text overlays */}
          {SCENES.map((scene, index) => (
            <div
              key={scene.id}
              ref={(el) => { textOverlaysRef.current[index] = el; }}
              className="text-overlay"
              style={{ opacity: index === 0 ? 1 : 0 }}
            >
              <div className={`text-content text-content--${scene.position} ${scene.isFinal ? 'glass-card' : ''}`}>
                <div className="section-indicator animate-in">{scene.indicator}</div>
                <h2 className="room-title animate-in">{scene.title}</h2>
                <p className="room-description animate-in">{scene.description}</p>
                {scene.area && (
                  <span className="room-area animate-in">{scene.area}</span>
                )}
                {scene.isFinal && (
                  <>
                    <div className="stats-grid animate-in" style={{ marginTop: '1.5rem' }}>
                      <div className="stat-item">
                        <span className="stat-value">44 m²</span>
                        <span className="stat-label">Net Area</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">49 m²</span>
                        <span className="stat-label">Gross Area</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">1</span>
                        <span className="stat-label">Bedroom</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">1</span>
                        <span className="stat-label">Bathroom</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">2</span>
                        <span className="stat-label">Balconies</span>
                      </div>
                    </div>
                    <a href="#enquire" className="cta-button animate-in" style={{ marginTop: '1rem' }}>
                      Enquire About This Apartment
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enquiry section */}
      <section id="enquire" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        background: 'var(--color-bg)',
      }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 500,
            marginBottom: '1.5rem',
            color: 'var(--color-text-primary)',
          }}>
            Interested in This Apartment?
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
          }}>
            Contact Merit Properties to learn more about availability, pricing, and viewing appointments. 
            Our team is ready to help you find your next home.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <a
              href="mailto:info@meritproperties.com"
              className="cta-button"
              style={{ opacity: 1, transform: 'none' }}
            >
              Send an Enquiry
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
            }}>
              Prices and availability are subject to confirmation.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
