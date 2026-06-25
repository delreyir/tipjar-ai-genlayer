# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing
from datetime import datetime, timezone


def _coerce_bool(value: typing.Any) -> bool:
    """Normalize whatever the model emits for `approved` into a real bool."""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in ("true", "yes", "y", "1", "approve", "approved", "pass")
    return False


def _coerce_score(value: typing.Any) -> int:
    """Normalize `quality_score` into an int clamped to 1..10."""
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        score = 0
    if score < 1:
        score = 1
    if score > 10:
        score = 10
    return score


def _parse_verdict(raw: str) -> dict:
    """Sanitize and normalize the raw LLM output into a canonical verdict.

    LLMs return JSON wrapped in markdown fences, with trailing prose, or with
    fields typed inconsistently (e.g. "8" vs 8). Comparing that raw text across
    validators makes them disagree on verdicts that are effectively identical.
    We strip the noise and project everything onto a fixed shape so the only
    things validators ever compare are a clean bool and a clean int.
    """
    text = (raw or "").strip()

    # Strip a ```json ... ``` (or plain ``` ... ```) markdown fence if present.
    if "```" in text:
        start = text.find("```") + 3
        rest = text[start:]
        end = rest.find("```")
        if end != -1:
            rest = rest[:end]
        newline = rest.find("\n")
        if newline != -1 and rest[:newline].strip().isalpha():
            rest = rest[newline + 1:]
        text = rest.strip()

    # Keep only the outermost JSON object, dropping any surrounding prose.
    lo = text.find("{")
    hi = text.rfind("}")
    if lo != -1 and hi != -1 and hi > lo:
        text = text[lo:hi + 1]

    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        data = {}
    if not isinstance(data, dict):
        data = {}

    return {
        "approved": _coerce_bool(data.get("approved", False)),
        "quality_score": _coerce_score(data.get("quality_score", 0)),
        "reasoning": str(data.get("reasoning", "")).strip()[:500],
    }


class TipJarAI(gl.Contract):
    tip_count: i32
    tips: TreeMap[str, str]
    creators: TreeMap[str, str]  # creator_address -> profile JSON

    def __init__(self):
        self.tip_count = i32(0)

    @gl.public.write
    def register_creator(self, name: str, content_url: str, criteria: str) -> None:
        addr = str(gl.message.sender_address)
        creator = {
            "address": addr,
            "name": name,
            "content_url": content_url,
            "criteria": criteria,
            "total_earned": "0",
            "tip_count": 0,
        }
        self.creators[addr] = json.dumps(creator)

    @gl.public.write.payable
    def tip(self, creator_address: str) -> i32:
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must send a tip")

        self.tip_count = i32(int(self.tip_count) + 1)
        tip_id = str(int(self.tip_count))
        now = int(datetime.now(timezone.utc).timestamp())

        tip = {
            "id": tip_id,
            "tipper": str(gl.message.sender_address),
            "creator": creator_address,
            "amount": str(value),
            "status": 0,  # 0=pending, 1=released, 2=refunded
            "review": "",
            "created_at": now,
        }
        self.tips[tip_id] = json.dumps(tip)
        return self.tip_count

    @gl.public.write
    def verify_and_release(self, tip_id: str) -> typing.Any:
        tip = json.loads(self.tips[tip_id])
        if tip["status"] != 0:
            raise gl.vm.UserError("Already processed")

        creator = json.loads(self.creators[tip["creator"]])
        url = creator["content_url"]
        criteria = creator["criteria"]

        def leader_fn():
            web_data = gl.nondet.web.get(url).body.decode("utf-8", errors="ignore")
            prompt = f"""You are evaluating a content creator's work to determine if a tip should be released.

CREATOR: {creator['name']}
CONTENT URL: {url}
QUALITY CRITERIA: {criteria}

CONTENT (first 3000 chars):
{web_data[:3000]}

Evaluate:
1. Does the content meet the stated quality criteria?
2. Is it original and well-crafted?
3. Does it provide value to the audience?

Return ONLY a valid JSON object, with no markdown fences and no extra text:
{{
    "approved": true or false,
    "quality_score": 1-10,
    "reasoning": "brief explanation"
}}"""
            response = gl.nondet.exec_prompt(prompt)
            # Normalize the model output before it ever leaves this block so the
            # value the leader stores and the value validators compare are the
            # exact same canonical shape.
            return _parse_verdict(response)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata
            if not isinstance(leader_data, dict):
                return False
            validator_data = leader_fn()
            # Both sides are already normalized: approved is a clean bool and
            # quality_score a clean 1..10 int, so validators only disagree on
            # genuine differences of opinion, not on text formatting noise.
            return (leader_data.get("approved") == validator_data.get("approved")
                    and abs(leader_data.get("quality_score", 0) - validator_data.get("quality_score", 0)) <= 2)

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        amount = u256(int(tip["amount"]))
        if result["approved"]:
            tip["status"] = 1
            self._pay(tip["creator"], amount)
            # Update creator stats
            c = json.loads(self.creators[tip["creator"]])
            c["total_earned"] = str(int(c["total_earned"]) + int(amount))
            c["tip_count"] += 1
            self.creators[tip["creator"]] = json.dumps(c)
        else:
            tip["status"] = 2
            self._pay(tip["tipper"], amount)

        tip["review"] = json.dumps(result)
        self.tips[tip_id] = json.dumps(tip)

    @gl.public.view
    def get_tip(self, tip_id: str) -> str:
        return self.tips[tip_id]

    @gl.public.view
    def get_creator(self, address: str) -> str:
        return self.creators[address]

    @gl.public.view
    def get_tip_count(self) -> i32:
        return self.tip_count

    def _pay(self, recipient: str, amount: u256) -> None:
        @gl.evm.contract_interface
        class _Recipient:
            class View:
                pass
            class Write:
                pass
        _Recipient(Address(recipient)).emit_transfer(value=amount)
