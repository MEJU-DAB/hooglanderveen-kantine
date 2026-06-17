import { getCachedFeed } from '@/lib/berichtenCache';
import Slideshow from '@/components/Slideshow';

export const revalidate = 120;

export default async function Home() {
  let initialBerichten = [] as import('@/lib/types').Bericht[];
  let initialPushedAt = 0;
  try {
    const feed = await getCachedFeed();
    // Strip base64 images from the ISR snapshot to stay under Vercel's 19 MB page limit.
    // The Slideshow fetches images on first poll via imageMapRef.
    initialBerichten = feed.berichten.map(b => ({ ...b, image: null }));
    initialPushedAt  = feed.pushedAt;
    if (process.env.NODE_ENV !== 'production') {
      const kb = (JSON.stringify(initialBerichten).length / 1024).toFixed(1);
      console.log(`[page] SSR prop: ${initialBerichten.length} berichten, ${kb} KB`);
    }
  } catch {}

  return <Slideshow initialBerichten={initialBerichten} initialPushedAt={initialPushedAt} />;
}
