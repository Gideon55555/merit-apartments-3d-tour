'use client';

import dynamic from 'next/dynamic';

const ScrollExperience = dynamic(
  () => import('./components/ScrollExperience'),
  {
    ssr: false,
    loading: () => (
      <div className="loading-screen">
        <div className="loading-text">Merit Properties</div>
        <div className="loading-bar-container">
          <div className="loading-bar" style={{ transform: 'scaleX(0.1)' }} />
        </div>
        <div className="loading-text" style={{ fontSize: '0.6rem', opacity: 0.5 }}>
          Preparing your experience
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main>
      <ScrollExperience />
    </main>
  );
}
