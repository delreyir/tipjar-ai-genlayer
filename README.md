# 💰 TipJar AI

**Tips that only land if the content is actually good.**

🔗 **Live app:** https://tipjar-ai.pages.dev
📜 **Contract (GenLayer Studionet):** `0x504bca5b64a864cB1e327da7Cc260CA13830F514`

---

## The Problem

Tipping online is blind faith — you send money hoping the creator's work is worth it, with no recourse when it's low-effort, recycled, or doesn't deliver on what was promised. Supporters get burned and stop tipping.

TipJar AI adds accountability: tips are held in escrow and only released if AI validators confirm the creator's content meets the standards they publicly committed to. Otherwise the supporter is refunded.

---

## How It Works

1. **Connect your wallet** (MetaMask, Rabby, or any EVM wallet — no Snap required)
2. **Creators register** — set their name, content URL, and the quality standards they commit to.
3. **Supporters tip** a creator — the GEN is held in escrow.
4. **AI verifies** — validators fetch the creator's content and check it against the committed standards.
5. **Release or refund** — passes → tip released to the creator; fails → refunded to the supporter.

---

## Use Cases

- Newsletter writers who promise weekly deep dives
- Creators who commit to original, fact-checked work
- Open-source devs who promise regular updates
- Any creator who wants to prove they earn their support

---

## Why GenLayer?

Judging whether content "meets a quality bar" is subjective and requires reading live web content. GenLayer validators fetch the creator's page and evaluate it against the criteria, agreeing on approval and a quality score (±2) before releasing funds — so the escrow decision is fair and not controlled by any single party.

---

## Wallet & Network

Standard EVM wallet, normal signing popup — **no GenLayer Snap**. On connect it adds/switches to the **GenLayer Studio Network** (chain `61999`, RPC `https://studio.genlayer.com/api`).

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `register_creator(name, content_url, criteria)` | write | Register & set your quality standards |
| `tip(creator_address)` | payable | Send a tip (held in escrow) |
| `verify_and_release(tip_id)` | write (AI) | AI checks content → release or refund |
| `get_tip(tip_id)` | view | Tip status + AI review |
| `get_creator(address)` | view | Creator profile + stats |
| `get_tip_count()` | view | Total tips |

**Consensus rule:** `approved` must match exactly; `quality_score` within ±2.

---

## Project Structure

```
tipjar-ai-genlayer/
├── contracts/
│   └── tipjar_ai.py         # GenLayer Intelligent Contract (Python)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx     # Social-feed UI
│   │   └── lib/
│   │       └── genlayer.ts  # Wallet connect (no Snap) + read client
│   ├── next.config.js
│   └── package.json
└── README.md
```

---

## Run Locally

```bash
npm install -g genlayer
genlayer network set studionet
genlayer account create --name deployer --password "yourpass"
genlayer account unlock --password "yourpass"
genlayer deploy --contract contracts/tipjar_ai.py

cd frontend
npm install
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Python — GenLayer Intelligent Contract |
| Web access | `gl.nondet.web.get()` |
| AI consensus | `gl.vm.run_nondet_unsafe` |
| Frontend | Next.js (static export) + TypeScript |
| SDK | genlayer-js |
| Hosting | Cloudflare Pages |

---

## License

MIT
