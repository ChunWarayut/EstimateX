"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import QRCode from 'qrcode';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Role = 'DEV' | 'QA' | 'PO' | 'DESIGN' | 'OTHER';

const DEFAULT_DECK = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 8, 13];

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('DEV');
  const [user, setUser] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [presence, setPresence] = useState<any[]>([]);
  const [secret, setSecret] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [flashValue, setFlashValue] = useState<number | null>(null);
  const [recentVoters, setRecentVoters] = useState<Record<string, number>>({});
  const [soundOn, setSoundOn] = useState<boolean>(false);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [dimension, setDimension] = useState<'point'|'complexity'|'qa'|'risk'>('point');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const load = async () => {
    const res = await fetch(`${API}/sessions/${code}`);
    const s = await res.json();
    setSession(s);
    await refreshVotes();
    try {
      const stored = localStorage.getItem(`ex:facil:${code}`) || '';
      if (stored) setSecret(stored);
      const u = localStorage.getItem(`ex:user:${code}`);
      if (u) {
        const parsed = JSON.parse(u);
        if (parsed?.id && parsed?.name && parsed?.role) setUser(parsed);
      }
      const nm = localStorage.getItem('ex:name');
      const rl = localStorage.getItem('ex:role') as Role | null;
      if (nm) setName(nm);
      if (rl && ['DEV','QA','PO','DESIGN','OTHER'].includes(rl)) setRole(rl);
    } catch {}
  };

  const refreshVotes = async () => {
    try {
      const res = await fetch(`${API}/sessions/${code}/votes?includeHidden=true&dimension=${dimension}`, { cache: 'no-store' });
      const data = await res.json();
      const list = Array.isArray(data?.votes) ? data.votes : [];
      setVotes(list);
      setStats(data?.stats ?? {});
      setRevealed(list.some((x:any) => x.hidden === false));
      if (user) {
        const mine = list.find((x: any) => x.user?.id === user.id);
        if (mine) {
          setMyVote((prev) => {
            if (prev !== mine.value) {
              setFlashValue(mine.value);
              setTimeout(() => setFlashValue(null), 500);
            }
            return mine.value;
          });
        } else {
          setMyVote(null);
        }
      }
    } catch {
      setVotes([]);
      setStats({});
    }
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
    socket.on('votes:update', (payload: any) => {
      if (payload?.userId) {
        setRecentVoters((prev) => ({ ...prev, [payload.userId]: Date.now() }));
        setTimeout(() => {
          setRecentVoters((prev) => {
            const c = { ...prev } as Record<string, number>;
            delete c[payload.userId];
            return c;
          });
        }, 1200);
        // play sound for others' votes if enabled
        if (payload.userId !== user?.id) {
          try { if (soundOn) beep(); } catch {}
        }
      }
      if (!payload?.dimension || payload.dimension === dimension) {
        refreshVotes();
      }
    });
    socket.on('votes:reveal', () => { setRevealed(true); refreshVotes(); });
    socket.on('votes:clear', () => { setRevealed(false); refreshVotes(); });
    return () => {
      try { socket.emit('leave-room', { code }); } catch {}
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, user?.id, dimension]);

  const doJoin = async () => {
    const res = await fetch(`${API}/sessions/${code}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    });
    const data = await res.json();
    setUser(data.user);
    try {
      socketRef.current?.emit('join-room', { code, user: { id: data.user.id, name: data.user.name, role: data.user.role } });
      localStorage.setItem(`ex:user:${code}`, JSON.stringify(data.user));
      localStorage.setItem('ex:name', name);
      localStorage.setItem('ex:role', role);
    } catch {}
  };

  const cast = async (value: number) => {
    if (!user) return;
    socketRef.current?.emit('vote', { code, userId: user.id, value, dimension });
    // Optimistic feedback
    setMyVote(value);
    setFlashValue(value);
    setTimeout(() => setFlashValue(null), 500);
  };

  const reveal = async () => {
    socketRef.current?.emit('reveal', { code, secret });
  };

  const clear = async () => {
    socketRef.current?.emit('clear', { code, secret });
  };

  // Leave room on this device and clear stored data
  const leaveDevice = () => {
    try { socketRef.current?.emit('leave-room', { code }); } catch {}
    try {
      localStorage.removeItem(`ex:user:${code}`);
      localStorage.removeItem(`ex:facil:${code}`);
      localStorage.removeItem('ex:name');
      localStorage.removeItem('ex:role');
    } catch {}
    setUser(null);
    setMyVote(null);
    // navigate to home soผู้ใช้กลับไปหน้าหลักทันที
    try { router.push('/'); } catch {}
  };

  const roleStats = useMemo(() => stats?.byRole ?? {}, [stats]);
  const deckForRole: number[] = useMemo(() => {
    const base = (session?.deck as number[] | undefined) ?? DEFAULT_DECK;
    const roleDecks = (session?.roleDecks as Record<string, number[]> | undefined) ?? {};
    return (user?.role && roleDecks[user.role]) ? roleDecks[user.role] : base;
  }, [session, user?.role]);
  // Deduplicate votes by user id on client side (safety)
  const uniqueVotes = useMemo(() => {
    const list = Array.isArray(votes) ? votes : [];
    const map = new Map<string, any>();
    for (const v of list) {
      if (v?.user?.id && !map.has(v.user.id)) map.set(v.user.id, v);
    }
    return Array.from(map.values());
  }, [votes]);
  const votedSet = useMemo(() => new Set(uniqueVotes.map((x: any) => x.user?.id)), [uniqueVotes]);

  // Sound: load preference
  useEffect(() => {
    try {
      const v = localStorage.getItem('ex:sound') || 'off';
      setSoundOn(v === 'on');
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('ex:sound', soundOn ? 'on' : 'off'); } catch {}
  }, [soundOn]);

  // Simple beep with WebAudio
  const beep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.26);
      setTimeout(() => ctx.close(), 300);
    } catch {}
  };

  // Invite link + QR
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/session/${code}` : '';
  useEffect(() => {
    (async () => {
      try { setQrDataUrl(await QRCode.toDataURL(inviteUrl)); } catch {}
    })();
  }, [inviteUrl]);

  // Keyboard shortcuts (1-9 = vote index, R reveal, C clear)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '9') {
        const idx = Number(k) - 1;
        if (idx >= 0 && idx < deckForRole.length) cast(deckForRole[idx]);
      } else if (k === 'r') {
        reveal();
      } else if (k === 'c') {
        clear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deckForRole, reveal, clear]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 glass rounded-2xl p-6 shadow-glow">
        <h1 className="text-2xl font-semibold">Session: {code}</h1>
        <p className="text-white/70">{session?.title}</p>
        <div className="mt-2 flex flex-wrap gap-2 items-center text-sm text-white/70">
          <input readOnly className="rounded-md bg-white/5 border border-white/20 px-3 py-1" value={inviteUrl} />
          <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy Link</button>
          {qrDataUrl && <img src={qrDataUrl} alt="QR" className="h-10 w-10 rounded-md border border-white/20" />}
        </div>

        {!user ? (
          <div className="mt-5 flex gap-2 items-center">
            <input className="rounded-md bg-white/5 border border-white/20 px-3 py-2" placeholder="ชื่อของคุณ" value={name} onChange={e=>{ setName(e.target.value); try{ localStorage.setItem('ex:name', e.target.value);}catch{} }} />
            <select className="rounded-md bg-white/5 border border-white/20 px-3 py-2" value={role} onChange={e=>{ setRole(e.target.value as Role); try{ localStorage.setItem('ex:role', e.target.value);}catch{} }}>
              {['DEV','QA','PO','DESIGN','OTHER'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn" onClick={doJoin}>เข้าร่วม</button>
          </div>
        ) : (
          <div className="mt-5 text-white/80">สวัสดี {user.name} ({user.role})</div>
        )}

        <div className="mt-4 flex gap-2 text-sm">
          <div className="flex gap-2 items-center">
            <span className="text-white/60">Dimension:</span>
            {(['point','complexity','qa','risk'] as const).map(d => (
              <button key={d} className={`btn-ghost ${dimension===d ? 'bg-white/10' : ''}`} onClick={()=>setDimension(d)}>{d}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {deckForRole.map(v => (
            <button key={v} className={`btn relative ${myVote===v ? 'btn-selected' : ''} ${flashValue===v ? 'animate-pop' : ''}`} onClick={() => cast(v)}>
              {v} pt
              {flashValue===v && (
                <span className="pointer-events-none absolute inset-0 rounded-md border-2 border-cyan-300/70 animate-ping" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button className="btn-ghost" onClick={reveal}>Show Votes</button>
          <button className="btn-ghost" onClick={clear}>Clear</button>
          <input className="rounded-md bg-white/5 border border-white/20 px-3 py-2" placeholder="Facilitator Secret" value={secret} onChange={e=>setSecret(e.target.value)} />
          <button className="btn-ghost" onClick={() => { try { localStorage.setItem(`ex:facil:${code}`, secret); } catch {} }}>Save</button>
          <button className="btn-ghost" onClick={() => setSoundOn(v => !v)}>{soundOn ? '🔔 Sound On' : '🔕 Sound Off'}</button>
          <button className="btn-ghost text-red-300 border-red-300/30" onClick={leaveDevice}>Leave this device</button>
        </div>

        <div className="mt-6">
          <table className="w-full text-left">
            <thead className="text-white/70">
              <tr><th>Player</th><th>Role</th><th>Points</th></tr>
            </thead>
            <tbody>
              {(uniqueVotes || []).map((v:any) => (
                <tr key={v.id} className={`border-t border-white/10 ${recentVoters[v.user?.id] ? 'animate-pop' : ''}`}>
                  <td className="py-2">{v.user.name}</td>
                  <td className="py-2">{v.user.role}</td>
                  <td className="py-2">{v.hidden ? '—' : v.value}</td>
                </tr>
              ))}
              {uniqueVotes.length===0 && (
                <tr className="border-t border-white/10"><td colSpan={3} className="py-6 text-white/60">ยังไม่มีคะแนน</td></tr>
              )}
            </tbody>
          </table>
          {myVote !== null && (
            <div className="text-white/70 text-sm mt-2">Your current vote: <span className="text-white font-semibold">{myVote}</span></div>
          )}
        </div>
      </section>

      <aside className="glass rounded-2xl p-6">
        <h3 className="text-xl font-semibold mb-3">Statistics</h3>
        {!revealed ? (
          <div className="text-white/60">สถิติจะปรากฏหลังจากกด Show Votes</div>
        ) : (
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
        )}
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Online</h4>
          <div className="text-white/70 text-sm mb-2">{presence.length} online • voted {votedSet.size}/{presence.length}</div>
          {presence.length === 0 ? (
            <div className="text-white/60">ยังไม่มีผู้เข้าร่วม</div>
          ) : (
          <ul className="space-y-1">
            {presence.map((p:any) => {
              const voted = votedSet.has(p.id);
              const recent = p.id && recentVoters[p.id];
              return (
                <li key={p.id} className={`relative text-white/80 flex items-center gap-2 ${recent ? 'animate-pop' : ''}`}>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${voted ? 'bg-emerald-400' : 'bg-white/40'}`}></span>
                  <span>{p.name} ({p.role}) {voted ? '— โหวตแล้ว' : '— รอโหวต'}</span>
                  {recent && (
                    <span className="pointer-events-none absolute -left-1 w-5 h-5 rounded-full border-2 border-emerald-300/70 animate-ping" />
                  )}
                </li>
              );
            })}
          </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
