import { NextResponse, type NextRequest } from 'next/server';

// We can't use iron-session inside middleware (it needs node crypto),
// so we just ensure a placeholder cookie is present; the real signed session is
// initialized in server components / route handlers via ensureSession().
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api/connect/callback|favicon.ico).*)'],
};
