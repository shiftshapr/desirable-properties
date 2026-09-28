#!/usr/bin/env python3
"""Scheduled DP loop monitor (cron, every 30 min).

1. Gate 1 fallback: open ML-REQ regeneration clones for DPs published since last run.
2. Refresh data/loop/dp-loop-status.json (both /admin loop dashboards read it).
3. Post new / cleared loop alerts to the meta-console Telegram transport
   (~/.config/meta-console/alerts.env). Only transitions are sent, never repeats.

  python3 scripts/dp_loop_monitor.py            # normal run
  python3 scripts/dp_loop_monitor.py --no-send  # print transitions only
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
DP_ROOT = SCRIPTS.parent
STATUS = DP_ROOT / "data/loop/dp-loop-status.json"
ALERT_STATE = DP_ROOT / "data/loop/alerts-state.json"
ALERTS_ENV = Path.home() / ".config/meta-console/alerts.env"
DASH_URL = "https://desirableproperties.org/admin?tab=loop-book"


def read_env(path: Path) -> dict[str, str]:
    out = {}
    if path.exists():
        for line in path.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def send_telegram(text: str) -> str:
    env = read_env(ALERTS_ENV)
    token, chat = env.get("ALERT_TELEGRAM_BOT_TOKEN"), env.get("ALERT_TELEGRAM_CHAT_ID")
    if not token or not chat:
        return "telegram not configured"
    data = urllib.parse.urlencode({"chat_id": chat, "text": text, "disable_web_page_preview": "true"}).encode()
    try:
        with urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data=data, timeout=15) as r:
            return "sent" if r.status == 200 else f"http {r.status}"
    except Exception as e:
        return f"send failed: {e}"[:200]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--no-send", action="store_true")
    args = ap.parse_args()

    regen = subprocess.run([sys.executable, str(SCRIPTS / "ml_req_regen_on_publish.py"), "--trigger", "monitor"],
                           capture_output=True, text=True, timeout=300)
    print(regen.stdout.strip() or regen.stderr.strip())
    col = subprocess.run([sys.executable, str(SCRIPTS / "dp_loop_status.py"), "--out", str(STATUS)],
                         capture_output=True, text=True, timeout=300)
    if col.returncode != 0:
        alerts = [f"loop collector failed: {col.stderr.strip()[-200:]}"]
    else:
        status = json.loads(STATUS.read_text())
        alerts = list(status.get("alerts", [])) + [f"collector: {e}" for e in status.get("errors", [])]

    prev = set(json.loads(ALERT_STATE.read_text())) if ALERT_STATE.exists() else None
    cur = set(alerts)
    ALERT_STATE.parent.mkdir(parents=True, exist_ok=True)
    ALERT_STATE.write_text(json.dumps(sorted(cur), indent=1))
    if prev is None:
        print(f"seeded alert state with {len(cur)} alert(s); nothing sent")
        return 0
    new, cleared = sorted(cur - prev), sorted(prev - cur)
    if not new and not cleared:
        print("no alert transitions")
        return 0
    lines = ["DP loop"]
    lines += [f"NEW: {a}" for a in new]
    lines += [f"CLEARED: {a}" for a in cleared]
    lines.append(DASH_URL)
    text = "\n".join(lines)
    print(text)
    if not args.no_send:
        print(send_telegram(text))
    return 0


if __name__ == "__main__":
    sys.exit(main())
