import { getCachedFeed } from '@/lib/berichtenCache';
import Slideshow from '@/components/Slideshow';

export const revalidate = 60; // ISR: Vercel edge hergebruikt de HTML 60s

export default async function Home() {
  let initialBerichten = [] as import('@/lib/types').Bericht[];
  let initialPushedAt = 0;
  try {
    const feed = await getCachedFeed();
    initialBerichten = feed.berichten;
    initialPushedAt  = feed.pushedAt;
  } catch {}

  return <Slideshow initialBerichten={initialBerichten} initialPushedAt={initialPushedAt} />;
}
