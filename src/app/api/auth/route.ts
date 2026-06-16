import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!password || password !== process.env.BEHEER_PASSWORD) {
    return NextResponse.json({ error: 'Verkeerd wachtwoord' }, { status: 401 });
  }

  const secret = process.env.BEHEER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server niet geconfigureerd' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('beheer_auth', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 dagen
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('beheer_auth');
  return res;
}
