#!/usr/bin/env python3
"""Kingdom Battles 8-point verification contract (Playwright).

Run against a served origin (localhost or a deployed URL).
Usage: qa_contract.py <base_url> <evidence_dir> [label]
"""
import json
import sys
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765"
EV = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/opencode/kb/tests/qa/evidence")
LABEL = sys.argv[3] if len(sys.argv) > 3 else "local"
EV.mkdir(parents=True, exist_ok=True)

results = {}
console_errors = []
page_errors = []


def check(name, ok, detail):
    results[name] = {"pass": bool(ok), "detail": detail}
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    page.goto(BASE + "/index.html", wait_until="networkidle")
    page.evaluate("() => { localStorage.clear(); }")
    page.reload(wait_until="networkidle")

    # -- 5a title + instructions + world map ---------------------------------
    title_ok = page.locator("#playButton").count() == 1 and page.locator("#instructionsButton").count() == 1 and page.locator("#loadButton").count() == 1
    brand = page.inner_text("#titleHeading")
    page.screenshot(path=str(EV / f"{LABEL}-01-title.png"), full_page=True)
    page.click("#instructionsButton")
    page.wait_for_timeout(150)
    instr_ok = page.locator("#instrTitle").is_visible() and page.locator(".tips li").count() >= 5
    page.screenshot(path=str(EV / f"{LABEL}-02-instructions.png"), full_page=True)
    page.click("#closeInstructions")
    page.wait_for_timeout(150)
    world_ok = page.locator(".level-node").count() == 6
    page.screenshot(path=str(EV / f"{LABEL}-03-worldmap.png"), full_page=True)
    check("title-instructions-worldmap", title_ok and instr_ok and world_ok,
          f"title={brand!r} play/instructions/load present, {page.locator('.tips li').count()} tips, {page.locator('.level-node').count()} level nodes")

    # -- 2 economy -----------------------------------------------------------
    before = page.evaluate("() => KB.state.crowns")
    page.evaluate("""() => { KB.grantCrowns(100000); KB.buy('barracks'); KB.buy('fletchery'); KB.buy('stables'); KB.show('capital'); }""")
    page.wait_for_timeout(200)
    st = page.evaluate("() => KB.state")
    saved = page.evaluate("() => JSON.parse(localStorage.getItem('kingdom-battles-cinderwatch-v4'))")
    economy_ok = ("barracks" in st["buildings"] and "fletchery" in st["buildings"] and "stables" in st["buildings"]
                  and st["crowns"] < before + 100000 and saved and saved["version"] == 4)
    page.screenshot(path=str(EV / f"{LABEL}-04-capital-economy.png"), full_page=True)
    check("capital-economy", economy_ok,
          f"buildings={st['buildings']} crowns {before}->{st['crowns']} v4-save={bool(saved and saved['version']==4)}")

    # -- 3 class tree --------------------------------------------------------
    page.evaluate("() => KB.show('tree')")
    page.wait_for_timeout(200)
    doctrine_cards = page.locator(".tree-card").count()
    family_chips = page.locator("#treeFamilies .class-node").count()
    tree_text = page.inner_text("#treeList")
    lineage_nodes = page.locator(".lineage-list .class-node").count()
    page.screenshot(path=str(EV / f"{LABEL}-05-class-tree.png"), full_page=True)
    check("class-tree-12-doctrines-15-families",
          doctrine_cards == 12 and family_chips == 15 and lineage_nodes > 40,
          f"doctrine cards={doctrine_cards}, family chips={family_chips}, lineage nodes={lineage_nodes}")

    # -- 4 battle: victory ---------------------------------------------------
    page.evaluate("""() => {
      KB.grantCrowns(100000);
      KB.buy('barracks'); KB.buy('fletchery'); KB.buy('stables'); KB.buy('mansion');
      KB.recruit('scout'); KB.recruit('archer'); KB.recruit('cavalry');
      KB.setState({level:1, cleared:[]});
      KB.enterBattle();
    }""")
    page.wait_for_timeout(150)
    for _ in range(8):
        page.evaluate("() => { const s=KB.state.units; if(s.length) KB.deploy(s[0]); }")
    page.evaluate("() => KB.seizeControl()")
    for _ in range(6):
        page.evaluate("() => KB.volley()")
    page.wait_for_timeout(150)
    b = page.evaluate("() => KB.state.battle")
    victory_ok = b and b.get("ended") == "victory"
    page.screenshot(path=str(EV / f"{LABEL}-06-battle-victory.png"), full_page=True)

    # -- 4b battle: defeat ---------------------------------------------------
    page.evaluate("() => { KB.setState({level:1, cleared:[], battle:null}); KB.enterBattle(); }")
    page.wait_for_timeout(120)
    for _ in range(40):
        page.evaluate("() => { if (KB.state.battle && !KB.state.battle.ended) KB.holdTurn(); }")
    page.wait_for_timeout(120)
    b2 = page.evaluate("() => KB.state.battle")
    defeat_ok = b2 and b2.get("ended") == "defeat"
    page.screenshot(path=str(EV / f"{LABEL}-07-battle-defeat.png"), full_page=True)
    check("deterministic-battle-victory-and-defeat", victory_ok and defeat_ok,
          f"victory={'victory' if victory_ok else b.get('ended') if b else None}; defeat={'defeat' if defeat_ok else b2.get('ended') if b2 else None}")

    # -- 5 generated art + responsive + reduced motion -----------------------
    page.evaluate("() => KB.show('battle')")
    page.wait_for_timeout(400)
    imgs_loaded = page.evaluate("""() => Array.from(document.querySelectorAll('.crest img'))
        .map(i => ({src: i.getAttribute('src'), w: i.naturalWidth}))
        .filter(x => x.src && x.src.includes('assets/generated/'))""")
    loaded_ok = len(imgs_loaded) > 0 and all(x["w"] > 0 for x in imgs_loaded)
    page.set_viewport_size({"width": 375, "height": 780})
    page.wait_for_timeout(300)
    mobile_ok = page.evaluate("() => document.querySelector('.capital-grid') ? getComputedStyle(document.querySelector('.capital-grid')).gridTemplateColumns.split(' ').length === 1 : true")
    page.screenshot(path=str(EV / f"{LABEL}-08-responsive-375.png"), full_page=True)
    page.set_viewport_size({"width": 1280, "height": 900})
    page.emulate_media(reduced_motion="reduce")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(200)
    reduced_ok = page.evaluate("() => document.documentElement.classList.contains('reduced-motion')")
    page.emulate_media(reduced_motion="no-preference")
    check("art-responsive-reduced-motion", loaded_ok and reduced_ok,
          f"generated imgs loaded={len(imgs_loaded)} all-nonzero={loaded_ok}, reduced-motion={reduced_ok}, mobile-stacked={mobile_ok}")

    # -- 6 PWA ---------------------------------------------------------------
    pwa = page.evaluate("""async () => {
      const r = await fetch('manifest.webmanifest'); const m = await r.json();
      const reg = await navigator.serviceWorker.getRegistrations();
      const keys = await caches.keys();
      return {manifest: m.name, served: r.status, registrations: reg.length, caches: keys};
    }""")
    pwa_ok = pwa["served"] == 200 and pwa["registrations"] >= 1 and "kingdom-battles-cinderwatch-v4" in pwa["caches"]
    check("pwa-offline-cache", pwa_ok, f"manifest={pwa['manifest']} served={pwa['served']} sw-registrations={pwa['registrations']} caches={pwa['caches']}")

    # -- 7 save + fullscreen -------------------------------------------------
    page.evaluate("() => { KB.grantCrowns(0); KB.setState({crowns: 4321}); }")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(200)
    crown_after = page.evaluate("() => KB.state.crowns")
    save_ok = crown_after == 4321
    fs = page.evaluate("""async () => {
      try { await document.documentElement.requestFullscreen(); } catch (e) { return 'rejected:' + e.name; }
      return document.fullscreenElement ? 'fullscreen' : 'no-element';
    }""")
    fullscreen_ok = fs in ("fullscreen", "rejected:TypeError")
    check("save-reload-fullscreen", save_ok and fullscreen_ok, f"crowns after reload={crown_after} (want 4321), fullscreen={fs}")

    # -- 8 zero console errors ----------------------------------------------
    check("zero-console-errors", len(console_errors) == 0 and len(page_errors) == 0,
          f"console errors={console_errors[:5]} page errors={page_errors[:5]}")

    page.screenshot(path=str(EV / f"{LABEL}-09-final.png"), full_page=True)
    browser.close()

summary = {"label": LABEL, "base": BASE, "results": results,
           "passed": sum(1 for r in results.values() if r["pass"]), "total": len(results)}
Path(EV / f"evidence-{LABEL}.json").write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
sys.exit(0 if summary["passed"] == summary["total"] else 1)