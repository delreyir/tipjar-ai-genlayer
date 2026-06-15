"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Tip = { id: string; tipper: string; creator: string; amount: string; status: number; review: string; };
const STATUS = ["pending review", "released ✓", "refunded ↩"];
const SCOLOR = ["#f59e0b", "#22c55e", "#ef4444"];
const avatar = (s: string) => `hsl(${parseInt(s.slice(2, 8), 16) % 360},70%,55%)`;

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [composer, setComposer] = useState<"none" | "tip" | "register">("none");
  const [form, setForm] = useState({ name: "", url: "", criteria: "" });
  const [tipForm, setTipForm] = useState({ creator: "", amount: "" });
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_tip_count", args: [] }));
      const out: Tip[] = [];
      for (let i = 1; i <= count; i++) { const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_tip", args: [String(i)] }); out.push(JSON.parse(raw as string)); }
      setTips(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() { setTx("Connecting…"); try { const w = await connectWallet(); setWallet(w); setTx(""); } catch (e: any) { setTx(e.message); } }
  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("Connect wallet first"); return; }
    setLoading(true); setTx(`${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx(""); await load(); setComposer("none");
    } catch (e: any) { setTx(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#16181c", color: "#e7e9ea", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* sticky top */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(22,24,28,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #2f3336", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 600, margin: "0 auto" }}>
        <span style={{ fontWeight: 800, fontSize: 19 }}>💰 TipJar <span style={{ color: "#f59e0b" }}>AI</span></span>
        {wallet.address ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: avatar(wallet.address), display: "inline-block" }} />
            <span style={{ fontSize: 13, color: "#71767b" }}>{shortAddr(wallet.address)}</span>
          </div>
        ) : (
          <button onClick={handleConnect} style={{ display: "flex", alignItems: "center", gap: 8, background: "#eff3f4", color: "#0f1419", border: "none", borderRadius: 999, padding: "6px 16px 6px 8px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "inline-block" }} /> Connect
          </button>
        )}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", borderLeft: "1px solid #2f3336", borderRight: "1px solid #2f3336", minHeight: "100vh" }}>
        {/* composer */}
        <div style={{ borderBottom: "1px solid #2f3336", padding: 16, display: "flex", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: wallet.address ? avatar(wallet.address) : "#2f3336", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            {composer === "none" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setComposer("tip")} style={{ ...postBtn, flex: 1 }}>💸 Send a Tip</button>
                <button onClick={() => setComposer("register")} style={{ ...postBtn, flex: 1, background: "#2f3336", color: "#e7e9ea" }}>✦ Become Creator</button>
              </div>
            )}
            {composer === "tip" && (
              <form onSubmit={e => { e.preventDefault(); send("tip", [tipForm.creator], BigInt(tipForm.amount || "0") * BigInt(10 ** 18)); }}>
                <input placeholder="Creator address (0x…)" value={tipForm.creator} onChange={e => setTipForm({ ...tipForm, creator: e.target.value })} required style={inp} />
                <input placeholder="Amount (GEN)" type="number" min="1" value={tipForm.amount} onChange={e => setTipForm({ ...tipForm, amount: e.target.value })} required style={inp} />
                <div style={{ fontSize: 12, color: "#71767b", margin: "4px 0 8px" }}>Held in escrow · AI verifies content quality before release</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" onClick={() => setComposer("none")} style={textBtn}>cancel</button><button disabled={loading} style={postBtn}>Send Tip</button></div>
              </form>
            )}
            {composer === "register" && (
              <form onSubmit={e => { e.preventDefault(); send("register_creator", [form.name, form.url, form.criteria]); }}>
                <input placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inp} />
                <input placeholder="Content URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required style={inp} />
                <textarea placeholder="Quality standards you commit to…" value={form.criteria} onChange={e => setForm({ ...form, criteria: e.target.value })} required rows={2} style={inp} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" onClick={() => setComposer("none")} style={textBtn}>cancel</button><button disabled={loading} style={postBtn}>Register</button></div>
              </form>
            )}
          </div>
        </div>

        {tx && <div style={{ padding: 12, color: "#f59e0b", fontSize: 13, borderBottom: "1px solid #2f3336" }}>{tx}</div>}

        {/* feed */}
        {tips.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#71767b" }}>No tips in the feed yet.</div>}
        {tips.map(t => {
          const r = t.review ? (() => { try { return JSON.parse(t.review); } catch { return null; } })() : null;
          return (
            <div key={t.id} style={{ display: "flex", gap: 12, padding: 16, borderBottom: "1px solid #2f3336" }}>
              <span style={{ width: 44, height: 44, borderRadius: "50%", background: avatar(t.creator), flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>Tip #{t.id} <span style={{ color: "#71767b", fontWeight: 400 }}>to {shortAddr(t.creator)}</span></span>
                  <span style={{ fontSize: 12, color: SCOLOR[t.status] }}>{STATUS[t.status]}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", margin: "4px 0" }}>{(Number(BigInt(t.amount)) / 1e18).toFixed(1)} GEN</div>
                <div style={{ fontSize: 13, color: "#71767b" }}>from {shortAddr(t.tipper)}</div>
                {r && <div style={{ marginTop: 10, background: "#1d1f23", borderRadius: 12, padding: 12, fontSize: 13 }}>🤖 <b>AI review:</b> {r.reasoning} <span style={{ color: "#f59e0b" }}>· {r.quality_score}/10</span></div>}
                {t.status === 0 && <button onClick={() => send("verify_and_release", [t.id])} disabled={loading} style={{ ...postBtn, marginTop: 10, padding: "6px 16px", fontSize: 13 }}>🔍 Verify & Release</button>}
              </div>
            </div>
          );
        })}
        <div style={{ padding: 20, textAlign: "center", color: "#3a3f44", fontSize: 12 }}>GenLayer AI consensus · {shortAddr(CONTRACT_ADDRESS)}</div>
      </div>
      <style>{`body{margin:0}`}</style>
    </div>
  );
}

const inp: React.CSSProperties = { padding: 11, borderRadius: 10, border: "1px solid #2f3336", background: "#000", color: "#e7e9ea", fontSize: 15, width: "100%", boxSizing: "border-box", marginBottom: 8 };
const postBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 999, border: "none", background: "#f59e0b", color: "#16181c", fontSize: 14, cursor: "pointer", fontWeight: 800 };
const textBtn: React.CSSProperties = { padding: "9px 16px", borderRadius: 999, border: "1px solid #2f3336", background: "transparent", color: "#71767b", fontSize: 14, cursor: "pointer" };
