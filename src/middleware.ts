import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasAdminSession =
    request.cookies.has('admin_session') ||
    request.cookies.has('admin_refresh_token');

  // If visiting /login while already logged in as admin -> redirect to dashboard
  if (pathname === '/login') {
    if (hasAdminSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // All other pages are protected admin pages
  if (!hasAdminSession) {
    const loginUrl = new URL('/login', request.url);
    const targetPath = pathname;
    if (targetPath !== '/') {
      loginUrl.searchParams.set('next', targetPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|favicon|icon|apple-icon|manifest.json).*)',
  ],
};
