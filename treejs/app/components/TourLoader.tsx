'use client';

import dynamic from 'next/dynamic';
import type { UnitSlug } from './apartment/units';

// WebGL and Lenis need the browser, so the tour is client-only
const ScrollExperience = dynamic(() => import('./ScrollExperience'), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <div className="loading-text">Merit Properties</div>
      <div className="loading-bar-container">
        <div className="loading-bar" />
      </div>
      <div className="loading-text loading-text--small">Preparing your experience</div>
    </div>
  ),
});

export default function TourLoader({ slug }: { slug: UnitSlug }) {
  return (
    <main>
      <ScrollExperience slug={slug} />
    </main>
  );
}
