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
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-[1240px] px-8 lg:px-14">
        <Nav />
        <hr className="border-t border-ink" />

        <section className="pt-16 pb-10">
          <p className="font-mono text-[13px] font-semibold tracking-[0.14em] uppercase text-ash mb-4">
            ▾ New digest
          </p>
          <h1 className="font-serif font-black tracking-[-0.02em] leading-[0.95] text-[clamp(44px,6vw,72px)] max-w-[900px]">
            <span className="block">One repo.</span>
            <span className="block">Four ways to listen.</span>
          </h1>
          <p className="mt-8 max-w-[620px] font-serif text-[20px] leading-[1.45] text-ink/80">
            Pick a repo — same week of PRs, re-narrated for whoever needs to hear it.
          </p>
        </section>

        <section className="pb-24">
          <GenerateForm />
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
