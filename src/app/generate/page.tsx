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
    <main className="mx-auto max-w-[840px] px-8">
      <Nav />
      <hr className="border-t border-ink" />
      <section className="py-16">
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] mb-4 text-ash">New digest</p>
        <h1 className="font-sans text-[32px] leading-[1.1] font-semibold mb-8">Pick a repo and a time window.</h1>
        <GenerateForm />
      </section>
    </main>
  );
}
