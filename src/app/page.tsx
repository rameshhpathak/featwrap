import Link from 'next/link';
import { Button } from '@/components/Button';
import { Nav } from '@/components/Nav';
import { ConnectButton } from '@/components/ConnectButton';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

async function ConnectOrContinue() {
  const session = await getSession();
  const conn = session.sid ? await getConnectionIdBySession(session.sid) : null;
  if (conn) {
    return (
      <Link href="/generate">
        <Button>Start a digest →</Button>
      </Link>
    );
  }
  return <ConnectButton />;
}

export default async function Home() {
  return (
    <main className="mx-auto max-w-[840px] px-8">
      <Nav />
      <hr className="border-t border-ink" />

      <section className="py-32">
        <p className="font-mono text-ash mb-4">$ featwrap_</p>
        <h1 className="font-sans text-[56px] leading-[1.05] font-semibold tracking-tight mb-8 max-w-[680px]">
          Turn every merged PR into a 90-second podcast your whole team will actually listen to.
        </h1>
        <p className="text-[17px] text-ash mb-12">
          One source. Four audiences. Zero drafting.
        </p>
        <ConnectOrContinue />
      </section>

      <hr className="border-t border-ink w-24" />

      <section className="py-16">
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] mb-8">How it works</p>
        <ol className="space-y-4 text-[17px]">
          <li className="flex gap-8"><span className="font-mono text-ash w-8">01</span><span>Connect your GitHub via Composio</span></li>
          <li className="flex gap-8"><span className="font-mono text-ash w-8">02</span><span>Pick a repo and a time window</span></li>
          <li className="flex gap-8"><span className="font-mono text-ash w-8">03</span><span>We classify, script, and render per audience</span></li>
          <li className="flex gap-8"><span className="font-mono text-ash w-8">04</span><span>Listen in-browser or download the MP3</span></li>
        </ol>
      </section>

      <hr className="border-t border-ink" />
      <footer className="flex items-center justify-between py-6 text-[13px]">
        <span className="font-mono">featwrap v0.1</span>
        <span className="text-ash">a hackathon build</span>
      </footer>
    </main>
  );
}
