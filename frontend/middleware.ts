import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { UserRole } from './lib/auth';

const protectedRoutes = ['/recruiter', '/admin', '/candidate', '/jobs'];
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // If a logged-in user lands on the home page, redirect them to their dashboard
  if (user && pathname === '/') {
    const userRole = user.user_metadata?.role;
    if (userRole === UserRole.ADMIN) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (userRole === UserRole.RECRUITER) {
        return NextResponse.redirect(new URL('/recruiter', request.url));
    }
    // Default for candidates - redirect to candidate dashboard
    return NextResponse.redirect(new URL('/candidate', request.url));
  }

  // If user is not logged in and trying to access a protected route, redirect to login
  if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in and trying to access an auth route, redirect them to their dashboard
  if (user && authRoutes.some(route => pathname.startsWith(route))) {
    const userRole = user.user_metadata?.role;
    if (userRole === UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (userRole === UserRole.RECRUITER) {
      return NextResponse.redirect(new URL('/recruiter', request.url));
    }
    // Default for candidates
    return NextResponse.redirect(new URL('/candidate', request.url));
  }
  
  // Role-based route protection
  if (user) {
    const userRole = user.user_metadata?.role;
    if (pathname.startsWith('/admin') && userRole !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/', request.url)); // Not authorized
    }
    if (pathname.startsWith('/recruiter') && userRole !== UserRole.RECRUITER && userRole !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/', request.url)); // Not authorized
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
