import Link from 'next/link';
import { Button } from '@/components/Button';
import { Nav } from '@/components/Nav';
import { ConnectButton } from '@/components/ConnectButton';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

async function HeroCTA() {
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

function AlertPill() {
  return (
    <div className="inline-flex items-center gap-3 h-11 pl-4 pr-5 bg-accent border border-ink font-mono text-[12px] font-semibold tracking-[0.14em] uppercase">
      <span aria-hidden>⚡</span>
      Early access — connect your repo
    </div>
  );
}

function FeatureGrid() {
  const items = [
    { k: 'Connect', v: 'GitHub in 1 click' },
    { k: 'Listen', v: '60–90s per digest' },
    { k: 'Share', v: '4 audience cuts' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
      {items.map(it => (
        <div key={it.k} className="border-t-2 border-ink pt-6">
          <div className="font-mono text-[13px] font-bold tracking-[0.14em] uppercase mb-2">
            {it.k}
          </div>
          <div className="font-mono text-[13px] tracking-[0.08em] uppercase text-ash">
            {it.v}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-[1240px] px-8 lg:px-14">
        <Nav />
        <hr className="border-t border-ink" />

        <section className="pt-20 pb-10">
          <AlertPill />

          <h1 className="mt-12 font-serif font-black tracking-[-0.02em] leading-[0.95] text-[clamp(54px,8vw,112px)] max-w-[1100px]">
            <span className="block">This week&apos;s PRs,</span>
            <span className="block">as a{' '}
              <span className="bg-ink text-paper px-4 pb-1 pt-0.5 inline-block">5-minute podcast.</span>
            </span>
          </h1>

          <p className="mt-10 max-w-[640px] font-serif text-[22px] leading-[1.45] text-ink/80">
            Connect GitHub. Pick a repo. Featwrap reads every merged PR and ships
            a short audio digest your <span className="font-bold">whole team</span> will
            actually press play on — written four ways for marketing, sales,
            support &amp; engineering.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <HeroCTA />
            <span className="font-mono text-[12px] tracking-[0.14em] uppercase text-ash">
              Free while in beta · no spam · unsubscribe anytime
            </span>
          </div>
        </section>

        <section className="pt-14 pb-24">
          <div className="font-mono text-[13px] font-semibold tracking-[0.14em] uppercase text-ash mb-2">
            ▾ How it works
          </div>
          <FeatureGrid />
        </section>

        <hr className="border-t border-ink" />
        <footer className="flex items-center justify-between py-7 font-mono text-[12px] tracking-[0.14em] uppercase">
          <span>© 2026 Featwrap</span>
          <span>Shipped → Heard</span>
        </footer>
      </div>
    </div>
  );
}
