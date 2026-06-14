"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Tip = { id: string; tipper: string; creator: string; amount: string; status: number; review: string; };

const STATUS = ["Pending review", "Released", "Refunded"];
const SCOLOR = ["#f59e0b", "#10b981", "#ef4444"];

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"tips" | "send" | "register">("tips");
  const [form, setForm] = useState({ name: "", url: "", criteria: "" });
  const [tipForm, setTipForm] = useState({ creator: "", amount: "" });
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_tip_count", args: [] }));
      const out: Tip[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_tip", args: [String(i)] });
        out.push(JSON.parse(raw as string));
      }
      setTips(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() {
    setTx("Connecting…");
    try { const w = await connectWallet(); setWallet(w); setTx(`Connected · ${shortAddr(w.address!)}`); }
    catch (e: any) { setTx(`⚠ ${e.message}`); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("⚠ Connect your wallet first"); return; }
    setLoading(true); setTx(`Working on ${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx("✓ Done!"); await load();
    } catch (e: any) { setTx(`⚠ ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#fff7ed 0%,#ffedd5 100%)", color: "#431407" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 22px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 34 }}>💰</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#ea580c" }}>TipJar AI</h1>
              <p style={{ margin: 0, fontSize: 13, color: "#9a3412" }}>Tips that only land if the content is good</p>
            </div>
          </div>
          {wallet.address ? (
            <div style={{ ...pill, background: "#fff", color: "#ea580c", border: "2px solid #fdba74" }}>● {shortAddr(wallet.address)}</div>
          ) : (
            <button onClick={handleConnect} style={btn}>Connect Wallet</button>
          )}
        </div>

        {tx && <div style={statusBar}>{tx}</div>}

        <div style={{ display: "flex", gap: 8, margin: "22px 0" }}>
          {(["tips", "send", "register"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>{t === "tips" ? "Tips" : t === "send" ? "Send Tip" : "Become a Creator"}</button>
          ))}
        </div>

        {tab === "register" && (
          <form onSubmit={e => { e.preventDefault(); send("register_creator", [form.name, form.url, form.criteria]); }} style={card}>
            <label style={lbl}>Your Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inp} />
            <label style={lbl}>Content URL</label>
            <input placeholder="https://your-blog.com" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required style={inp} />
            <label style={lbl}>Quality Standards You Commit To</label>
            <textarea placeholder="Original research, weekly updates, fact-checked…" value={form.criteria} onChange={e => setForm({ ...form, criteria: e.target.value })} required rows={3} style={inp} />
            <button type="submit" disabled={loading} style={{ ...btn, marginTop: 14, width: "100%" }}>Register as Creator</button>
          </form>
        )}

        {tab === "send" && (
          <form onSubmit={e => { e.preventDefault(); send("tip", [tipForm.creator], BigInt(tipForm.amount || "0") * BigInt(10 ** 18)); }} style={card}>
            <label style={lbl}>Creator Address</label>
            <input placeholder="0x…" value={tipForm.creator} onChange={e => setTipForm({ ...tipForm, creator: e.target.value })} required style={inp} />
            <label style={lbl}>Tip Amount (GEN)</label>
            <input type="number" min="1" value={tipForm.amount} onChange={e => setTipForm({ ...tipForm, amount: e.target.value })} required style={inp} />
            <p style={{ fontSize: 13, color: "#9a3412", background: "#fff7ed", padding: 10, borderRadius: 10, marginTop: 8 }}>💡 Your tip is held in escrow. AI checks the creator's content against their standards — released only if it passes, otherwise refunded to you.</p>
            <button type="submit" disabled={loading} style={{ ...btn, marginTop: 8, width: "100%" }}>💰 Send Tip</button>
          </form>
        )}

        {tab === "tips" && (
          <div style={{ display: "grid", gap: 12 }}>
            {tips.length === 0 && <p style={{ color: "#9a3412" }}>No tips yet.</p>}
            {tips.map(t => (
              <div key={t.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>#{t.id} → {shortAddr(t.creator)}</span>
                  <span style={{ ...pill, background: SCOLOR[t.status] + "22", color: SCOLOR[t.status] }}>{STATUS[t.status]}</span>
                </div>
                <div style={{ color: "#ea580c", fontWeight: 800, fontSize: 20, marginTop: 6 }}>{(Number(BigInt(t.amount)) / 1e18).toFixed(1)} GEN</div>
                {t.status === 0 && <button onClick={() => send("verify_and_release", [t.id])} disabled={loading} style={{ ...btn, marginTop: 10, padding: "8px 14px", fontSize: 13 }}>🔍 Verify & Release</button>}
                {t.review && (() => { try { const r = JSON.parse(t.review); return <p style={{ marginTop: 10, fontSize: 13, color: "#7c2d12", background: "#fff7ed", padding: 10, borderRadius: 10 }}>{r.reasoning} · Quality {r.quality_score}/10</p>; } catch { return null; } })()}
              </div>
            ))}
          </div>
        )}

        <footer style={{ marginTop: 50, textAlign: "center", color: "#c2784c", fontSize: 12 }}>
          Powered by GenLayer AI consensus · {shortAddr(CONTRACT_ADDRESS)}
        </footer>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "2px solid #fed7aa", borderRadius: 18, padding: 20, boxShadow: "0 4px 12px rgba(234,88,12,0.08)" };
const inp: React.CSSProperties = { padding: 12, borderRadius: 12, border: "2px solid #fed7aa", background: "#fffbf5", color: "#431407", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 4 };
const lbl: React.CSSProperties = { fontSize: 12, color: "#9a3412", fontWeight: 700, marginTop: 10, display: "block" };
const btn: React.CSSProperties = { padding: "11px 22px", borderRadius: 12, border: "none", background: "linear-gradient(90deg,#f97316,#ea580c)", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700 };
const pill: React.CSSProperties = { padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 };
const statusBar: React.CSSProperties = { background: "#fff", border: "2px solid #fed7aa", padding: 12, borderRadius: 12, fontSize: 13, color: "#ea580c", marginTop: 16, fontWeight: 600 };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "9px 16px", background: a ? "linear-gradient(90deg,#f97316,#ea580c)" : "#fff", border: "2px solid " + (a ? "transparent" : "#fed7aa"), borderRadius: 12, color: a ? "#fff" : "#9a3412", cursor: "pointer", fontWeight: 700, fontSize: 13 });
