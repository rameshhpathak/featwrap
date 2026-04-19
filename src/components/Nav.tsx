import Link from 'next/link';
import { Pill } from './Pill';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

export async function Nav() {
  const session = await getSession();
  let login: string | null = null;
  if (session.sid) {
    const conn = await getConnectionIdBySession(session.sid);
    login = conn?.github_login ?? null;
  }
  return (
    <header className="flex items-center justify-between py-6">
      <Link href="/" className="font-sans text-lg font-semibold tracking-tight">featwrap</Link>
      <Pill>{login ? `@${login} connected` : 'not connected'}</Pill>
    </header>
  );
}
