"use client";
import { useState, useEffect } from "react";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";

type Tip = { id: string; tipper: string; creator: string; amount: string; status: number; review: string; };

const STATUS = ["Pending", "Released ✓", "Refunded ✗"];
const COLORS = ["#ff9800", "#4caf50", "#f44336"];

export default function Home() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"tips" | "register" | "send">("tips");
  const [form, setForm] = useState({ name: "", url: "", criteria: "" });
  const [tipForm, setTipForm] = useState({ creator: "", amount: "" });
  const [tx, setTx] = useState("");

  useEffect(() => { if (CONTRACT_ADDRESS) load(); }, []);

  async function load() {
    try {
      const count = Number(await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_tip_count", args: [] }));
      const loaded: Tip[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_tip", args: [String(i)] });
        loaded.push(JSON.parse(raw as string));
      }
      setTips(loaded);
    } catch (e) { console.error(e); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    setLoading(true); setTx(`${fn}...`);
    try {
      const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: fn, args, ...(value ? { value } : {}) });
      await client.waitForTransactionReceipt({ hash });
      setTx("✓ Done!"); await load();
    } catch (e: any) { setTx(`Error: ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ textAlign: "center" }}>💰 TipJar AI</h1>
      <p style={{ textAlign: "center", color: "#888" }}>Tips that only land if the content is good</p>

      {tx && <div style={{ background: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{tx}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab("tips")} style={tabBtn(tab === "tips")}>Tips</button>
        <button onClick={() => setTab("send")} style={tabBtn(tab === "send")}>Send Tip</button>
        <button onClick={() => setTab("register")} style={tabBtn(tab === "register")}>Register as Creator</button>
      </div>

      {tab === "register" && (
        <form onSubmit={e => { e.preventDefault(); send("register_creator", [form.name, form.url, form.criteria]); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="Your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inp} />
          <input placeholder="Content URL (your blog, channel, etc.)" value={form.url} onChange={e => setForm({...form, url: e.target.value})} required style={inp} />
          <textarea placeholder="Quality criteria you commit to (e.g. 'Original research, weekly updates, fact-checked')" value={form.criteria} onChange={e => setForm({...form, criteria: e.target.value})} required rows={3} style={inp} />
          <button type="submit" disabled={loading} style={btn}>Register</button>
        </form>
      )}

      {tab === "send" && (
        <form onSubmit={e => { e.preventDefault(); send("tip", [tipForm.creator], BigInt(tipForm.amount) * BigInt(10**18)); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="Creator address (0x...)" value={tipForm.creator} onChange={e => setTipForm({...tipForm, creator: e.target.value})} required style={inp} />
          <input placeholder="Tip amount (GEN)" type="number" min="1" value={tipForm.amount} onChange={e => setTipForm({...tipForm, amount: e.target.value})} required style={inp} />
          <button type="submit" disabled={loading} style={btn}>💰 Send Tip</button>
        </form>
      )}

      {tab === "tips" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tips.length === 0 && <p style={{ color: "#888" }}>No tips yet.</p>}
          {tips.map(t => (
            <div key={t.id} style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>#{t.id} → {t.creator.slice(0, 10)}...</span>
                <span style={{ background: COLORS[t.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{STATUS[t.status]}</span>
              </div>
              <small style={{ color: "#aaa" }}>{(Number(BigInt(t.amount)) / 1e18).toFixed(1)} GEN</small>
              {t.status === 0 && (
                <button onClick={() => send("verify_and_release", [t.id])} disabled={loading} style={{ ...btn, marginTop: 8, padding: "8px 12px", fontSize: 12 }}>🔍 Verify & Release</button>
              )}
              {t.review && (() => { const r = JSON.parse(t.review); return <p style={{ margin: "8px 0 0", fontSize: 13, color: "#aaa" }}>{r.reasoning} (Score: {r.quality_score}/10)</p>; })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: 12, borderRadius: 8, border: "1px solid #333", background: "#1a1a2e", color: "#e0e0e0", fontSize: 14 };
const btn: React.CSSProperties = { padding: "12px 20px", borderRadius: 8, border: "none", background: "#6c5ce7", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: "bold" };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "10px 20px", background: a ? "#6c5ce7" : "#2d2d2d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" });
