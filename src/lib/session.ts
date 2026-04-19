import { getIronSession, type SessionOptions, type IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  sid?: string;
}

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_COOKIE_SECRET;
  if (!password) throw new Error('SESSION_COOKIE_SECRET not set');
  return {
    cookieName: 'featwrap_sid',
    password,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: '/',
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}

export async function ensureSession(): Promise<string> {
  const session = await getSession();
  if (!session.sid) {
    session.sid = crypto.randomUUID();
    await session.save();
  }
  return session.sid;
}
