import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { GenerateForm } from '@/components/GenerateForm';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

export default async function Generate() {
  const session = await getSession();
  const conn = session.sid ? await getConnectionIdBySession(session.sid) : null;
  if (!conn) redirect('/');

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Nav />

      <main>
        <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 w-full">
          <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
            ▼ NEW DIGEST
          </span>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tighter leading-[0.95]">
            One repo. Four<br />ways to listen.
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-lg">
            Pick a repo — we&apos;ll read every merged PR in the window and narrate it for whoever needs to hear it.
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-6 pb-24 w-full">
          <GenerateForm />
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
