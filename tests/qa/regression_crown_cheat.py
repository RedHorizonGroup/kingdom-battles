#!/usr/bin/env python3
"""Regression test: the unbounded crown cheat and the battle-erasing save.

Drives the real page against a served origin. Exits non-zero if any check
fails, which is what happens against the pre-fix game.js.
Usage: regression_crown_cheat.py <base_url> [evidence_dir]
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765").rstrip("/")
EV = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/opencode/kb/tests/qa/evidence")
LABEL = "regression"
EV.mkdir(parents=True, exist_ok=True)

SAVE_KEY = "kingdom-battles-cinderwatch-v4"
results = []
page_errors = []


def check(name, ok, detail):
    results.append({"name": name, "pass": bool(ok), "detail": detail})
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")


def fresh(page, query=""):
    """Clear the save and reload, preserving the dev-mode query when asked."""
    page.goto(f"{BASE}/index.html{query}", wait_until="networkidle")
    page.evaluate("() => { localStorage.clear(); }")
    page.reload(wait_until="networkidle")


def banked(page, view):
    """Read the reward counters with the view pinned in the same JS turn, so the
    4s income tick cannot move crowns between the save and the reading."""
    return page.evaluate(
        f"() => {{ KB.show({json.dumps(view)}); return {{ crowns: KB.state.crowns, renown: KB.state.renown,"
        f" cleared: KB.state.cleared.slice(), level: KB.state.level,"
        f" battle: KB.state.battle, view: KB.state.view }}; }}")


with sync_playwright() as p:
    # service workers are blocked so a cached game.js can never make this lie.
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")
    page = ctx.new_page()
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    # -- (a) the "m" key mints nothing on a normal load ----------------------
    fresh(page)
    crowns0 = page.evaluate("() => KB.state.crowns")
    for _ in range(50):
        page.keyboard.press("m")
    crowns1 = page.evaluate("() => KB.state.crowns")
    check("a-m-key-mints-no-crowns", crowns1 == crowns0,
          f"50 presses of 'm' on a normal load: crowns {crowns0} -> {crowns1} (want no change)")

    # -- (b) the console cheats are absent on a normal load ------------------
    hooks = page.evaluate("() => ({ kb: typeof window.KB, grant: typeof window.KB.grantCrowns, set: typeof window.KB.setState })")
    check("b-cheat-hooks-absent-on-normal-load",
          hooks["kb"] == "object" and hooks["grant"] == "undefined" and hooks["set"] == "undefined",
          f"window.KB={hooks['kb']} grantCrowns={hooks['grant']} setState={hooks['set']} (want undefined)")

    # -- (c) ?kbdev=1 opts the QA harness in --------------------------------
    fresh(page, "?kbdev=1")
    dev_hooks = page.evaluate("() => ({ grant: typeof window.KB.grantCrowns, set: typeof window.KB.setState })")
    dev0 = page.evaluate("() => KB.state.crowns")
    page.evaluate("() => KB.grantCrowns(500)")
    dev1 = page.evaluate("() => KB.state.crowns")
    check("c-dev-optin-exposes-hooks",
          dev_hooks["grant"] == "function" and dev_hooks["set"] == "function" and dev1 == dev0 + 500,
          f"?kbdev=1 grantCrowns={dev_hooks['grant']} setState={dev_hooks['set']}, crowns {dev0} -> {dev1} on +500")

    # -- a live battle: the cheat is gone here too ---------------------------
    page.evaluate("""() => {
        KB.grantCrowns(100000);
        KB.buy('barracks'); KB.buy('fletchery'); KB.buy('stables'); KB.buy('mansion');
        KB.recruit('scout'); KB.recruit('archer');
        KB.enterBattle(); KB.deploy('scout');
    }""")
    mid0 = page.evaluate("() => KB.state.crowns")
    for _ in range(20):
        page.keyboard.press("m")
    mid1 = page.evaluate("() => KB.state.crowns")
    check("m-key-mints-no-crowns-in-battle", mid1 == mid0,
          f"20 presses of 'm' inside a live battle: crowns {mid0} -> {mid1} (want no change)")

    # -- (d) a mid-battle refresh resumes the battle ------------------------
    snapshot = page.evaluate("() => KB.state.battle")
    page.reload(wait_until="networkidle")
    resumed = page.evaluate("() => KB.state.battle")
    resumed_view = page.evaluate("() => KB.state.view")
    resumed_crowns = page.evaluate("() => KB.state.crowns")
    same = bool(resumed) and (
        [u["id"] for u in resumed["units"]] == [u["id"] for u in snapshot["units"]]
        and resumed["turn"] == snapshot["turn"] and resumed["enemy"] == snapshot["enemy"]
        and resumed["player"] == snapshot["player"] and not resumed["ended"]
        and resumed_crowns == mid1
    )
    check("d-battle-survives-refresh", same and resumed_view == "battle",
          f"view={resumed_view}, units={[u['id'] for u in (resumed or {}).get('units', [])]}, "
          f"turn={(resumed or {}).get('turn')}, enemy={(resumed or {}).get('enemy')}, "
          f"player={(resumed or {}).get('player')}, crowns={resumed_crowns}")

    # -- (e) a finished battle pays out once, not again on reload ------------
    for _ in range(8):
        page.evaluate("() => { const s = KB.state.units; if (s.length) KB.deploy(s[0]); }")
    page.evaluate("() => KB.seizeControl()")
    for _ in range(6):
        page.evaluate("() => KB.volley()")
    won = page.evaluate("() => KB.state.battle") or {}
    before_reload = banked(page, "battle")
    page.reload(wait_until="networkidle")
    after_reload = banked(page, "battle")
    check("e-finished-battle-pays-out-once",
          won.get("ended") == "victory" and after_reload["battle"] is None
          and after_reload["crowns"] == before_reload["crowns"]
          and after_reload["renown"] == before_reload["renown"]
          and after_reload["cleared"] == before_reload["cleared"]
          and after_reload["level"] == before_reload["level"],
          f"ended={won.get('ended')}, reward banked at renown {before_reload['renown']} level {before_reload['level']} "
          f"cleared {before_reload['cleared']} crowns {before_reload['crowns']}; after reload renown {after_reload['renown']} "
          f"level {after_reload['level']} cleared {after_reload['cleared']} crowns {after_reload['crowns']} "
          f"battle={after_reload['battle']}")

    # -- a corrupt battle in the save is dropped, not rendered ---------------
    corrupt_ok = True
    detail = []
    for payload in ['"not-a-battle"', '{ "enemy": "lots", "player": null, "turn": "x" }']:
        page.evaluate("""payload => {
            const s = JSON.parse(localStorage.getItem('kingdom-battles-cinderwatch-v4'));
            s.battle = JSON.parse(payload); s.view = 'battle';
            localStorage.setItem('kingdom-battles-cinderwatch-v4', JSON.stringify(s));
        }""", payload)
        page.reload(wait_until="networkidle")
        got = banked(page, "capital")
        ok = got["battle"] is None and got["view"] != "battle" and got["crowns"] == after_reload["crowns"]
        corrupt_ok = corrupt_ok and ok
        detail.append(f"{payload[:24]}… -> battle={got['battle']} view={got['view']} crowns={got['crowns']} {'ok' if ok else 'BROKEN'}")
    check("corrupt-battle-save-is-dropped", corrupt_ok, "; ".join(detail))

    check("zero-page-errors", len(page_errors) == 0, f"page errors={page_errors[:5]}")
    browser.close()

passed = sum(1 for r in results if r["pass"])
summary = {"label": LABEL, "base": BASE, "results": results, "passed": passed, "total": len(results)}
(EV / f"evidence-{LABEL}.json").write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
sys.exit(0 if passed == len(results) else 1)
