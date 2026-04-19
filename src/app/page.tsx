import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { ConnectButton } from '@/components/ConnectButton';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

async function HeroCTA() {
  const session = await getSession();
  const conn = session.sid ? await getConnectionIdBySession(session.sid) : null;
  if (conn) {
    return (
      <Link
        href="/generate"
        className="inline-flex items-center gap-2 brutal-border brutal-shadow brutal-hover bg-foreground text-background font-mono font-bold text-sm tracking-wider uppercase px-5 py-3"
      >
        Start a digest →
      </Link>
    );
  }
  return <ConnectButton />;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Nav />

      <main>
        <section className="max-w-3xl mx-auto px-6 pt-20 pb-24 w-full">
          <span className="inline-block font-mono text-[11px] tracking-wider px-2 py-1 brutal-border bg-accent-yellow mb-8">
            ⚡ THE CHANGELOG, BUT LISTENABLE
          </span>

          <h1 className="font-bold tracking-tighter leading-[0.95] text-5xl md:text-7xl">
            Agents wrote 100 PRs<br />
            this week.{' '}
            <span className="relative inline-block">
              <span className="relative z-10">Hear them.</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-[0.08em] h-[0.28em] bg-accent-yellow -z-0"
              />
            </span>
          </h1>

          <p className="mt-8 text-lg md:text-xl max-w-xl leading-snug">
            AI agents now ship more code than your team can read. Featwrap turns every merged PR
            into a <span className="font-medium">90-second podcast</span> — re-narrated for
            marketing, sales, CS, and engineering. One ship log, four stories your whole org
            actually hears.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <HeroCTA />
            <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
              FREE WHILE IN BETA · NO SPAM · UNSUBSCRIBE ANYTIME
            </span>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-6 max-w-md font-mono text-xs">
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">MERGE</div>
              <div className="text-muted-foreground mt-1">WE READ EVERY PR</div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">NARRATE</div>
              <div className="text-muted-foreground mt-1">4 TONES, 1 SHIP LOG</div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">DROP</div>
              <div className="text-muted-foreground mt-1">90 SEC IN SLACK</div>
            </div>
          </div>
        </section>

        <section className="border-t-[3px] border-foreground bg-paper">
          <div className="max-w-3xl mx-auto px-6 py-20">
            <div className="mb-8">
              <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
                ▼ HOW IT WORKS
              </span>
              <h2 className="mt-2 text-4xl md:text-5xl font-bold tracking-tighter leading-[0.95]">
                One repo. Four<br />ways to listen.
              </h2>
              <p className="mt-4 text-base text-muted-foreground max-w-md">
                Same week of PRs, re-narrated for whoever needs to hear it — marketing, sales, support, engineering.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="brutal-border bg-background p-6">
                <div className="font-mono text-[11px] tracking-wider text-muted-foreground">01 · CONNECT</div>
                <div className="mt-2 font-bold text-lg">Authorize via Composio.</div>
                <div className="mt-1 text-muted-foreground text-sm leading-snug">One OAuth click. We read your merged PRs — nothing else.</div>
              </div>
              <div className="brutal-border bg-background p-6">
                <div className="font-mono text-[11px] tracking-wider text-muted-foreground">02 · PICK</div>
                <div className="mt-2 font-bold text-lg">Repo and time window.</div>
                <div className="mt-1 text-muted-foreground text-sm leading-snug">Any repo your token can reach. 1 day to 90 days.</div>
              </div>
              <div className="brutal-border bg-background p-6">
                <div className="font-mono text-[11px] tracking-wider text-muted-foreground">03 · NARRATE</div>
                <div className="mt-2 font-bold text-lg">Claude writes. ElevenLabs speaks.</div>
                <div className="mt-1 text-muted-foreground text-sm leading-snug">One script per audience, re-narrated for the listener.</div>
              </div>
              <div className="brutal-border bg-background p-6">
                <div className="font-mono text-[11px] tracking-wider text-muted-foreground">04 · SHIP</div>
                <div className="mt-2 font-bold text-lg">Play in-browser, download MP3.</div>
                <div className="mt-1 text-muted-foreground text-sm leading-snug">60-90s each. Scheduled delivery coming.</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-[3px] border-foreground">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between font-mono text-[11px] tracking-wider text-muted-foreground">
          <span>© 2026 FEATWRAP</span>
          <span>SHIPPED → HEARD</span>
        </div>
      </footer>
    </div>
  );
}
