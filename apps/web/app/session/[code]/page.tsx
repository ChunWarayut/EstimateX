"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Role = 'DEV' | 'QA' | 'PO' | 'DESIGN' | 'OTHER';

const VOTES = [0, 0.125, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 8, 13];

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('DEV');
  const [user, setUser] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  const load = async () => {
    const res = await fetch(`${API}/sessions/${code}`);
    const s = await res.json();
    setSession(s);
    await refreshVotes();
  };

  const refreshVotes = async () => {
    const res = await fetch(`${API}/sessions/${code}/votes?includeHidden=true`, { cache: 'no-store' });
    const data = await res.json();
    setVotes(data.votes);
    setStats(data.stats);
  };

  useEffect(() => { load(); }, [code]);
  useEffect(() => {
    const t = setInterval(refreshVotes, 2500);
    return () => clearInterval(t);
  }, [code]);

  const doJoin = async () => {
    const res = await fetch(`${API}/sessions/${code}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    });
    const data = await res.json();
    setUser(data.user);
  };

  const cast = async (value: number) => {
    if (!user) return;
    await fetch(`${API}/sessions/${code}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, value })
    });
    await refreshVotes();
  };

  const reveal = async () => {
    await fetch(`${API}/sessions/${code}/reveal`, { method: 'POST' });
    await refreshVotes();
  };

  const clear = async () => {
    await fetch(`${API}/sessions/${code}/clear`, { method: 'POST' });
    await refreshVotes();
  };

  const roleStats = useMemo(() => stats?.byRole ?? {}, [stats]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 glass rounded-2xl p-6 shadow-glow">
        <h1 className="text-2xl font-semibold">Session: {code}</h1>
        <p className="text-white/70">{session?.title}</p>

        {!user ? (
          <div className="mt-5 flex gap-2 items-center">
            <input className="rounded-md bg-white/5 border border-white/20 px-3 py-2" placeholder="ชื่อของคุณ" value={name} onChange={e=>setName(e.target.value)} />
            <select className="rounded-md bg-white/5 border border-white/20 px-3 py-2" value={role} onChange={e=>setRole(e.target.value as Role)}>
              {['DEV','QA','PO','DESIGN','OTHER'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn" onClick={doJoin}>เข้าร่วม</button>
          </div>
        ) : (
          <div className="mt-5 text-white/80">สวัสดี {user.name} ({user.role})</div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {VOTES.map(v => (
            <button key={v} className="btn" onClick={() => cast(v)}>{v} pt</button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="btn-ghost" onClick={reveal}>Show Votes</button>
          <button className="btn-ghost" onClick={clear}>Clear</button>
        </div>

        <div className="mt-6">
          <table className="w-full text-left">
            <thead className="text-white/70">
              <tr><th>Player</th><th>Role</th><th>Points</th></tr>
            </thead>
            <tbody>
              {votes.map(v => (
                <tr key={v.id} className="border-t border-white/10">
                  <td className="py-2">{v.user.name}</td>
                  <td className="py-2">{v.user.role}</td>
                  <td className="py-2">{v.hidden ? '—' : v.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="glass rounded-2xl p-6">
        <h3 className="text-xl font-semibold mb-3">Statistics</h3>
        <div className="space-y-3">
          {Object.keys(roleStats).length === 0 && (
            <div className="text-white/60">ยังไม่มีข้อมูล</div>
          )}
          {Object.entries(roleStats).map(([role, s]: any) => (
            <div key={role} className="p-3 rounded-md bg-white/5 border border-white/10">
              <div className="font-semibold">{role}</div>
              <div className="text-white/70 text-sm">votes: {s.count} | avg: {Number(s.avg).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

