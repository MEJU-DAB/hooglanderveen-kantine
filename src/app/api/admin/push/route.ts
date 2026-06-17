import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db, { initDb } from '@/lib/db';
import { invalidateBerichtenCache } from '@/lib/berichtenCache';

export const dynamic = 'force-dynamic';

export async function POST(_: NextRequest) {
  const jar = await cookies();
  if (jar.get('beheer_auth')?.value !== process.env.BEHEER_SECRET) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
  }

  await initDb();
  const pushedAt = Date.now();

  await db.execute({
    sql: "UPDATE config SET value = ? WHERE key = 'last_pushed_at'",
    args: [String(pushedAt)],
  });

  invalidateBerichtenCache();

  return NextResponse.json({ pushedAt });
}
