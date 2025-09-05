"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [deckStr, setDeckStr] = useState('0,0.5,1,2,3,5,8,13');
  const [deckRoleJson, setDeckRoleJson] = useState('');
  const router = useRouter();

  const createSession = async () => {
    if (!title.trim()) return;
    let deck: number[] | undefined;
    try {
      deck = deckStr.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
      if (!deck.length) deck = undefined;
    } catch {
      deck = undefined;
    }
    let roleDecks: any = undefined;
    try {
      roleDecks = deckRoleJson.trim() ? JSON.parse(deckRoleJson) : undefined;
    } catch {
      roleDecks = undefined;
    }
    const res = await fetch(`${API}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, deck, roleDecks })
    });
    const data = await res.json();
    if (data.facilitatorSecret) {
      try { localStorage.setItem(`ex:facil:${data.code}`, data.facilitatorSecret); } catch {}
    }
    router.push(`/session/${data.code}`);
  };

  const joinByCode = () => {
    if (!code.trim()) return;
    router.push(`/session/${code.trim()}`);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="glass rounded-2xl p-6 shadow-glow">
        <h1 className="text-3xl font-semibold mb-2">เริ่มเซสชันใหม่</h1>
        <p className="text-white/70 mb-4">สร้างห้องโหวตสำหรับทีมของคุณ</p>
        <div className="flex gap-3">
          <input className="flex-1 rounded-md bg-white/5 border border-white/20 px-3 py-2" placeholder="ชื่อเรื่อง/สตอรี่" value={title} onChange={e=>setTitle(e.target.value)} />
          <button className="btn" onClick={createSession}>Create</button>
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-sm text-white/70 mb-1">เด็คค่าเริ่มต้น (คั่นด้วยจุลภาค)</div>
            <input className="w-full rounded-md bg-white/5 border border-white/20 px-3 py-2" value={deckStr} onChange={e=>setDeckStr(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-white/70 mb-1">เด็คเฉพาะบทบาท (JSON)</div>
            <input className="w-full rounded-md bg-white/5 border border-white/20 px-3 py-2" placeholder='{"DEV":[1,2,3]}' value={deckRoleJson} onChange={e=>setDeckRoleJson(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-2">เข้าร่วมห้อง</h2>
        <p className="text-white/70 mb-4">ใส่รหัส 6 หลักเพื่อเข้าร่วม</p>
        <div className="flex gap-3">
          <input className="flex-1 rounded-md bg-white/5 border border-white/20 px-3 py-2" placeholder="Session Code" value={code} onChange={e=>setCode(e.target.value)} />
          <button className="btn" onClick={joinByCode}>Join</button>
        </div>
      </section>

      <section className="md:col-span-2 glass rounded-2xl p-6">
        <h3 className="text-xl font-semibold mb-2">จุดเด่น</h3>
        <ul className="list-disc pl-6 space-y-1 text-white/80">
          <li>โหวตแบบแยกบทบาท Dev/QA/PO พร้อมค่าเฉลี่ยรายบทบาท</li>
          <li>UI Gradient + Glow + Glassmorphism สวยสะอาดตา</li>
          <li>รองรับ SEO และแชร์ลิงก์ได้</li>
        </ul>
      </section>
    </div>
  );
}
