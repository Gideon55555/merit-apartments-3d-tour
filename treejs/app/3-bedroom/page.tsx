import type { Metadata } from 'next';
import TourLoader from '../components/TourLoader';

export const metadata: Metadata = {
  title: 'Merit Properties — Three Bedroom Apartment',
  description:
    'Explore a three-bedroom family apartment with three bathrooms and a guest WC in a cinematic 3D walkthrough.',
  openGraph: {
    title: 'Merit Properties — Three Bedroom Apartment',
    description: 'Space for the whole family.',
    type: 'website',
  },
};

export default function ThreeBedroomPage() {
  return <TourLoader slug="three-bedroom" />;
}
