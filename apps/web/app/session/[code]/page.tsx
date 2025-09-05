"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Role = 'DEV' | 'QA' | 'PO' | 'DESIGN' | 'OTHER';

const DEFAULT_DECK = [0, 0.5, 1, 2, 3, 5, 8, 13];

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('DEV');
  const [user, setUser] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [presence, setPresence] = useState<any[]>([]);
  const [secret, setSecret] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const load = async () => {
    const res = await fetch(`${API}/sessions/${code}`);
    const s = await res.json();
    setSession(s);
    await refreshVotes();
    try {
      const stored = localStorage.getItem(`ex:facil:${code}`) || '';
      if (stored) setSecret(stored);
    } catch {}
  };

  const refreshVotes = async () => {
    const res = await fetch(`${API}/sessions/${code}/votes?includeHidden=true`, { cache: 'no-store' });
    const data = await res.json();
    setVotes(data.votes);
    setStats(data.stats);
  };

  useEffect(() => { load(); }, [code]);

  // Socket setup for realtime updates
  useEffect(() => {
    if (!code) return;
    const socket = io(`${API}/sessions`, { transports: ['websocket'] });
    socketRef.current = socket;
    if (user) {
      socket.emit('join-room', { code, user: { id: user.id, name: user.name, role: user.role } });
    }
    socket.on('presence:update', (p: any) => setPresence(p.users || []));
    socket.on('votes:update', () => refreshVotes());
    socket.on('votes:reveal', () => refreshVotes());
    socket.on('votes:clear', () => refreshVotes());
    return () => {
      try { socket.emit('leave-room', { code }); } catch {}
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, user?.id]);

  const doJoin = async () => {
    const res = await fetch(`${API}/sessions/${code}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    });
    const data = await res.json();
    setUser(data.user);
    try {
      socketRef.current?.emit('join-room', { code, user: { id: data.user.id, name: data.user.name, role: data.user.role } });
    } catch {}
  };

  const cast = async (value: number) => {
    if (!user) return;
    socketRef.current?.emit('vote', { code, userId: user.id, value });
  };

  const reveal = async () => {
    socketRef.current?.emit('reveal', { code, secret });
  };

  const clear = async () => {
    socketRef.current?.emit('clear', { code, secret });
  };

  const roleStats = useMemo(() => stats?.byRole ?? {}, [stats]);
  const deckForRole: number[] = useMemo(() => {
    const base = (session?.deck as number[] | undefined) ?? DEFAULT_DECK;
    const roleDecks = (session?.roleDecks as Record<string, number[]> | undefined) ?? {};
    return (user?.role && roleDecks[user.role]) ? roleDecks[user.role] : base;
  }, [session, user?.role]);

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
          {deckForRole.map(v => (
            <button key={v} className="btn" onClick={() => cast(v)}>{v} pt</button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button className="btn-ghost" onClick={reveal}>Show Votes</button>
          <button className="btn-ghost" onClick={clear}>Clear</button>
          <input className="rounded-md bg-white/5 border border-white/20 px-3 py-2" placeholder="Facilitator Secret" value={secret} onChange={e=>setSecret(e.target.value)} />
          <button className="btn-ghost" onClick={() => { try { localStorage.setItem(`ex:facil:${code}`, secret); } catch {} }}>Save</button>
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
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Online</h4>
          <div className="text-white/70 text-sm mb-2">{presence.length} online</div>
          <ul className="space-y-1">
            {presence.map((p:any) => (
              <li key={p.id} className="text-white/80">• {p.name} ({p.role})</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
