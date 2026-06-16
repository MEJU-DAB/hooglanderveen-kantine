import { NextRequest, NextResponse } from 'next/server';

const CRON_PATH = '/api/cron/rss';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cron-route heeft eigen Bearer-auth
  if (pathname === CRON_PATH) return NextResponse.next();

  // Login-pagina en login-API zijn altijd toegankelijk
  if (pathname === '/beheer/login' || pathname === '/api/auth') {
    return NextResponse.next();
  }

  const token  = req.cookies.get('beheer_auth')?.value;
  const secret = process.env.BEHEER_SECRET;

  if (!secret || token !== secret) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/beheer/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/beheer/:path*', '/api/berichten/:path*', '/api/rss/:path*'],
};
