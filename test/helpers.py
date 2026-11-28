# shared Playwright helpers for صقر tests (mock Firebase, see test/mock)
import json, os
from playwright.sync_api import sync_playwright
URL = os.environ.get("SAQR_URL", "http://localhost:8765/")
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)

class Run:
    def __init__(self):
        self.pw = sync_playwright().start()
        self.br = self.pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        self.ctx = self.br.new_context(viewport={"width": 420, "height": 860}, device_scale_factor=2, locale="ar-SA")
        self.errors = []
    def page(self, name):
        p = self.ctx.new_page()
        p.on("pageerror", lambda e: self.errors.append(f"[{name}] {e}"))
        p.on("console", lambda m: (m.type in ("error", "warning") and "mock rules" in m.text) and self.errors.append(f"[{name}] {m.text}"))
        p.goto(URL); p.wait_for_timeout(900)
        return p
    def shot(self, p, name): p.screenshot(path=os.path.join(SHOTS, name + ".png"))
    def close(self):
        self.br.close(); self.pw.stop()
        if self.errors: print("ERRORS:\n" + "\n".join(self.errors))
        else: print("no page errors")

def teacher(r, name="teacher"):
    p = r.page(name)
    p.evaluate("localStorage.clear(); sessionStorage.clear()")
    p.reload(); p.wait_for_timeout(900)
    p.click("#gBtn"); p.wait_for_selector("#grid .empty, #grid .card", timeout=8000); p.wait_for_timeout(800)
    return p

def add_students(p, names):
    # uses the app's own state + save(), like the add-student sheet does
    p.evaluate("""names=>{ const c=cls(); names.forEach(n=>c.students.push({id:uid(),name:n,points:0,pos:0,neg:0,look:{body:BODY[c.students.length%BODY.length],acc:"none"}})); ensureCodes(); save(); render(); }""", names)
    p.wait_for_timeout(600)

def codes(p): return p.evaluate("cls().students.map(s=>[s.name,s.code])")

def parent(r, code, name="parent"):
    p = r.page(name)
    p.click("#parBtn"); p.fill("#parCode", code); p.click("#parGo")
    p.wait_for_selector("#par.show .pkid[data-c]", timeout=8000); p.wait_for_timeout(800)
    return p
