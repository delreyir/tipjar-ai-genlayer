# 💰 TipJar AI

**Tips that only land if the content is actually good.**

TipJar AI protects supporters from low-effort creators. When you tip someone, your money is held in escrow. AI validators fetch the creator's content, evaluate it against quality criteria, and only release the tip if the work passes. If it doesn't, you get refunded automatically.

---

## The Problem

Tipping online is blind faith. You send money to a creator hoping their content is worth it, but there's no recourse when it's low-effort, recycled, or doesn't deliver on promises. Subscription fatigue is real — people stop tipping entirely because they've been burned.

TipJar AI adds accountability. Creators set their own quality standards. AI validators hold them to it.

---

## How It Works

1. **Creator registers** — Sets their name, content URL, and quality criteria they commit to
2. **Supporter tips** — Sends GEN to the creator (held in escrow)
3. **AI verification** — Validators fetch the creator's content, evaluate against criteria
4. **Release or refund** — Quality content = tip released. Low effort = supporter refunded

---

## Use Cases

- Newsletter writers who promise weekly deep dives
- YouTubers who commit to production quality
- Open source devs who promise regular updates
- Artists who commit to originality
- Writers who promise fact-checked content

---

## Consensus Rules

| Field | Rule |
|-------|------|
| Approved (true/false) | Must match exactly |
| Quality score | Within ±2 tolerance |

---

## Deployed Contract

```
Network: GenLayer Studionet
Address: (see deployment)
```

---

## Quick Start

```bash
npm install -g genlayer
genlayer network set studionet
genlayer deploy --contract contracts/tipjar_ai.py

cd frontend && npm install && npm run dev
```

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `register_creator(name, content_url, criteria)` | write | Creator sets profile + standards |
| `tip(creator_address)` | payable | Send tip (held in escrow) |
| `verify_and_release(tip_id)` | write (AI) | AI checks quality, releases or refunds |
| `get_creator(address)` | view | Creator profile + stats |
| `get_tip(tip_id)` | view | Tip status and review |

---

## License

MIT
