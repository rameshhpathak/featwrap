import Link from 'next/link';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <span className="w-8 h-8 brutal-border grid place-items-center bg-accent-yellow">
        <span className="font-mono font-bold text-base leading-none">F</span>
      </span>
      <span className="font-mono font-bold tracking-tight text-base italic">
        FEATURE <span className="font-normal">wrapped</span>
      </span>
    </Link>
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
    <header className="border-b-[3px] border-foreground">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Logo />
        <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </header>
  );
}
