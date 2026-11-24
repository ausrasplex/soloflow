import { redirect } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import { db } from '@/lib/server/db';
import { hashPassword, startSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

async function create(fd: FormData) {
  'use server';
  if ((await db.user.count()) > 0) redirect('/signin');
  const name = String(fd.get('name') || '').trim();
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const pw = String(fd.get('password') || '');
  const bname = String(fd.get('business') || '').trim() || name + "'s business";
  if (!name || !email || pw.length < 8) redirect('/setup?e=1');
  const u = await db.user.create({ data: { email, displayName: name, passwordHash: await hashPassword(pw), isAdmin: true } });
  const b = await db.business.create({ data: { name: bname } });
  await db.membership.create({ data: { userId: u.id, businessId: b.id, role: 'OWNER' } });
  await db.user.update({ where: { id: u.id }, data: { currentBusinessId: b.id } });
  await startSession(u.id);
  redirect('/dashboard');
}

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if ((await db.user.count()) > 0) redirect('/signin');
  const sp = await searchParams;
  return (
    <AuthCard title="Set up SoloFlow" sub="You are the first person here, so you become the server admin and the owner of your business. You can invite a bookkeeper or partner afterwards." error={sp.e ? 'Fill in every field. The password needs at least 8 characters.' : undefined}>
      <form action={create} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="afld"><span>Your name</span><input name="name" autoComplete="name" required /></label>
        <label className="afld"><span>Email</span><input name="email" type="email" autoComplete="username" required /></label>
        <label className="afld"><span>Password</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <label className="afld"><span>Business name</span><input name="business" placeholder="For example, Smith Electrical" /></label>
        <button className="abtn" type="submit">Create and continue</button>
      </form>
    </AuthCard>
  );
}
