import Link from 'next/link';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <span className="w-10 h-10 bg-ink text-paper flex items-center justify-center font-serif text-[22px] font-bold leading-none">
        F
      </span>
      <span className="font-mono text-[15px] font-semibold tracking-[0.08em]">FEATWRAP</span>
    </Link>
  );
}

function StatusTag({ label }: { label: string }) {
  return (
    <span className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-ink">
      {label}
    </span>
  );
}

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
  const label = connected ? (login ? `@${login}` : 'CONNECTED') : 'PRIVATE BETA';
  return (
    <header className="flex items-center justify-between py-7">
      <Wordmark />
      <StatusTag label={label} />
    </header>
  );
}
