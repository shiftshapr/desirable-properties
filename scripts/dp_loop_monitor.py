#!/usr/bin/env python3
"""Scheduled DP loop monitor (cron, every 30 min).

0. File new Canopi book patches into Gov Hub under their authors (prod and staging sandbox),
   and re-sync the staging book from DEV Gov Hub (fallback for the DEV publish hook).
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
import os
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

    filing_alerts = []
    # While this file exists the filer only dry-runs (report written, nothing filed).
    filing_paused = (DP_ROOT / "data/loop/canopi-filing.paused").exists()
    for env in ("prod", "staging"):
        cmd = [sys.executable, str(SCRIPTS / "canopi_patch_file_to_govhub.py"), "--env", env]
        if not filing_paused:
            cmd.append("--apply")
        f = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        print(f"canopi filing {env}{' (paused: dry run)' if filing_paused else ''}: {(f.stdout.strip().splitlines() or [f.stderr.strip()[-200:]])[-1]}")
        report = DP_ROOT / f"data/loop/canopi-filing-{env}.json"
        if report.exists():
            counts = json.loads(report.read_text()).get("counts", {})
            if counts.get("blocked") or counts.get("error"):
                filing_alerts.append(f"Canopi filing {env}: {counts.get('blocked', 0)} blocked, {counts.get('error', 0)} error(s)")
    sync = subprocess.run(["bash", str(SCRIPTS / "staging_rail_sync.sh")], env={**os.environ, "TRIGGER": "monitor"},
                          capture_output=True, text=True, timeout=600)
    print(f"staging rail sync: {(sync.stdout.strip().splitlines() or [sync.stderr.strip()[-200:]])[-1]}")

    regen = subprocess.run([sys.executable, str(SCRIPTS / "ml_req_regen_on_publish.py"), "--trigger", "monitor"],
                           capture_output=True, text=True, timeout=300)
    print(regen.stdout.strip() or regen.stderr.strip())
    col = subprocess.run([sys.executable, str(SCRIPTS / "dp_loop_status.py"), "--out", str(STATUS)],
                         capture_output=True, text=True, timeout=300)
    if col.returncode != 0:
        alerts = [f"loop collector failed: {col.stderr.strip()[-200:]}"]
    else:
        status = json.loads(STATUS.read_text())
        alerts = list(status.get("alerts", [])) + [f"collector: {e}" for e in status.get("errors", [])] + filing_alerts

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
