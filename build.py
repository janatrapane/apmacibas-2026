#!/usr/bin/env python3
"""Bundle the deck, inline audio (bundle.py skips mp3), QA the bundle."""
import base64, re, subprocess, sys, pathlib, shutil
here = pathlib.Path(__file__).resolve().parent
skill = here.parent.parent / "skills/platformas/html-presentation/scripts"
out = here / "apmacibas-2026.html"
subprocess.run([sys.executable, str(skill / "bundle.py"), str(here / "deck"), str(out)], check=True)
html = out.read_text()
def inline(m):
    p = here / "deck" / m.group(2)
    if not p.is_file(): print("MISSING", p); return m.group(0)
    return f'{m.group(1)}="data:audio/mpeg;base64,{base64.b64encode(p.read_bytes()).decode()}"'
html = re.sub(r'\b(src)="(assets/audio/[^"]+\.mp3)"', inline, html)
out.write_text(html)
print(f"bundle with audio: {out.stat().st_size/1024:.0f} KB")
qa = here / "qa-bundle"; shutil.rmtree(qa, ignore_errors=True); qa.mkdir(); shutil.copy(out, qa / "index.html")
r = subprocess.run(["node", str(skill / "qa.mjs"), str(qa)], capture_output=True, text=True)
print("\n".join(l for l in r.stdout.splitlines() if l.startswith(("RESULT", "Published", "Placeholders", "Slides:"))))
sys.exit(0 if "RESULT: PASS" in r.stdout else 1)
