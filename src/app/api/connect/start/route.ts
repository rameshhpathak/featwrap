import { NextResponse } from 'next/server';
import { ensureSession } from '@/lib/session';
import { initiateGithubAuth } from '@/lib/composio/client';

export const runtime = 'nodejs';

export async function POST() {
  const sid = await ensureSession();
  const redirectUri = process.env.COMPOSIO_REDIRECT_URL!;
  const { redirectUrl, connectionId } = await initiateGithubAuth({ userId: sid, redirectUri });

  // Stash the pending connection id on the session so callback can validate.
  const res = NextResponse.json({ redirectUrl });
  res.cookies.set('featwrap_pending_conn', connectionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
