import { NextRequest, NextResponse } from 'next/server';
import { invalideerCache } from '@/lib/cache';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(_: NextRequest) {
  const jar = await cookies();
  const session = jar.get('beheer_auth')?.value;
  if (session !== process.env.BEHEER_SECRET) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
  }

  invalideerCache();
  return NextResponse.json({ flushed: true });
}
