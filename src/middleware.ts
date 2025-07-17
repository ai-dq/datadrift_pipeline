import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/labelstudio/api/:function*',
    '/(protected)/:path*',
    '/dashboard/:path*',
    '/services/:path*',
    '/',
  ],
};

/**
 * Handles Label Studio API routes by adding authorization headers
 */
function handleAPIRoutes(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  const token = request.cookies.get('ls_access_token')?.value;

  if (token) {
    // Update to use Authorization instead of cookie
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Remove token from headers
  headers.delete('ls_access_token');

  return NextResponse.rewrite(request.url, {
    request: {
      headers,
    },
  });
}

/**
 * Handles authentication for protected Next.js routes
 */
function handleAuthentication(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const csrfToken = request.cookies.get('csrftoken')?.value;
  const sessionID = request.cookies.get('sessionid')?.value;

  // Check if user is trying to access protected routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/(protected)') ||
    pathname === '/';

  if (isProtectedRoute) {
    // If any of csrfToken or sessionID is missing, redirect to login
    if (!(csrfToken && sessionID)) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Now there's both csrfToken and sessionID.
    // If user is on the root path, redirect to dashboard
    if (pathname === '/') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Allow the request to continue
  return NextResponse.next();
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Handle Label Studio API routes
  if (pathname.startsWith('/labelstudio/api/')) {
    return handleAPIRoutes(request);
  }

  // Handle authentication for web routes
  return handleAuthentication(request);
}
