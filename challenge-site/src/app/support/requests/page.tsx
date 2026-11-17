import type { Metadata } from 'next';
import SupportRequestsClient from './SupportRequestsClient';

export const metadata: Metadata = {
  title: 'Your Acknowledgements requests – Support – Desirable Properties',
  description: 'See the Acknowledgements requests you sent, their status and the images you attached.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function SupportRequestsPage() {
  return <SupportRequestsClient />;
}
