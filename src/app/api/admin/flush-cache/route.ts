import { NextRequest, NextResponse } from 'next/server';
import { invalidateBerichtenCache } from '@/lib/berichtenCache';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(_: NextRequest) {
  const jar = await cookies();
  const session = jar.get('beheer_auth')?.value;
  if (session !== process.env.BEHEER_SECRET) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
  }

  invalidateBerichtenCache();
  return NextResponse.json({ flushed: true });
}
