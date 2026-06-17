import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Proxyt de afbeelding van een bericht zodat de WebView alleen het eigen
// domein nodig heeft — Cloudinary-URLs zijn niet altijd bereikbaar vanuit
// embedded mediaplayers op beperkte netwerken.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await initDb();
    const result = await db.execute({
      sql: 'SELECT image FROM berichten WHERE id = ?',
      args: [numId],
    });

    const image = result.rows[0]?.image as string | null;
    if (!image) return new NextResponse(null, { status: 404 });

    // Cloudinary-URL: fetch en doorsturen
    if (image.startsWith('http')) {
      const upstream = await fetch(image, { cache: 'no-store' });
      if (!upstream.ok) return new NextResponse(null, { status: 502 });
      const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
      const buffer = await upstream.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        },
      });
    }

    // Legacy base64 (data:image/...;base64,...) — direct decoderen
    const match = image.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!match) return new NextResponse(null, { status: 422 });
    const [, contentType, b64] = match;
    const buffer = Buffer.from(b64, 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    console.error('[GET /api/image/[id]]', e);
    return new NextResponse(null, { status: 503 });
  }
}
