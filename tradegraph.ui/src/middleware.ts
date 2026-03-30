import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const isLoginPage = req.nextUrl.pathname === '/login';

  // Allow access to login page
  if (isLoginPage) {
    if (token) {
      // If already logged in, redirect away from login back to dashboard
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Intercept all other protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Token exists, proceed to the requested page
  return NextResponse.next();
}

// Ensure middleware runs only on primary routes and ignores static files/api routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
