import Link from 'next/link';
import { Pill } from './Pill';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

export async function Nav() {
  const session = await getSession();
  let connected = false;
  let login: string | null = null;
  if (session.sid) {
    const conn = await getConnectionIdBySession(session.sid);
    if (conn) {
      connected = true;
      login = conn.github_login ?? null;
    }
  }
  const pillLabel = connected ? (login ? `@${login} connected` : 'connected') : 'not connected';
  return (
    <header className="flex items-center justify-between py-6">
      <Link href="/" className="font-sans text-lg font-semibold tracking-tight">featwrap</Link>
      <Pill>{pillLabel}</Pill>
    </header>
  );
}
