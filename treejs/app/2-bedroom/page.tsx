import type { Metadata } from 'next';
import TourLoader from '../components/TourLoader';

export const metadata: Metadata = {
  title: 'Merit Properties — Two Bedroom Apartment',
  description:
    'Explore a two-bedroom apartment with two ensuites in a cinematic 3D walkthrough. Open-plan living, a separate kitchen and a balcony.',
  openGraph: {
    title: 'Merit Properties — Two Bedroom Apartment',
    description: 'Room to grow, with an ensuite for every bedroom.',
    type: 'website',
  },
};

export default function TwoBedroomPage() {
  return <TourLoader slug="two-bedroom" />;
}
