import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

function cloudinarySign(params: Record<string, string>, secret: string): string {
  const payload = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`).join('&');
  return createHash('sha1').update(payload + secret).digest('hex');
}

export async function POST(req: NextRequest) {
  const jar = await cookies();
  if (jar.get('beheer_auth')?.value !== process.env.BEHEER_SECRET) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary niet geconfigureerd' }, { status: 503 });
  }

  const { dataUrl } = await req.json() as { dataUrl: string };
  if (!dataUrl?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Ongeldige afbeelding' }, { status: 400 });
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder    = 'hooglanderveen-kantine';
  const params    = { folder, timestamp };
  const signature = cloudinarySign(params, apiSecret);

  const body = new FormData();
  body.append('file',      dataUrl);
  body.append('api_key',   apiKey);
  body.append('timestamp', timestamp);
  body.append('folder',    folder);
  body.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[upload-image] Cloudinary fout:', err);
    return NextResponse.json({ error: 'Upload mislukt' }, { status: 502 });
  }

  const { secure_url } = await res.json() as { secure_url: string };
  return NextResponse.json({ url: secure_url });
}
