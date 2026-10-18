import sys, re, torch, soundfile as sf, numpy as np, time
from omnivoice import OmniVoice
ref, txt, out = sys.argv[1], sys.argv[2], sys.argv[3]
cps = float(sys.argv[4]) if len(sys.argv) > 4 else 13.0   # characters per second
text = open(txt, encoding="utf-8").read()
paras = [p.strip() for p in text.split("\n") if p.strip()]
t0 = time.time()
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="mps", dtype=torch.float32)
prompt = model.create_voice_clone_prompt(ref_audio=ref)
print("prompt ready", round(time.time()-t0), "s", flush=True)
pieces = []
short, long_gap = np.zeros(int(24000*0.25), dtype=np.float32), np.zeros(int(24000*0.6), dtype=np.float32)
for pi, p in enumerate(paras, 1):
    sents = [s.strip() for s in re.split(r'(?<=[.!?:])\s+', p) if s.strip()]
    for s in sents:
        dur = max(1.3, len(s) / cps)
        a = model.generate(text=s, language="lv", voice_clone_prompt=prompt, duration=dur, denoise=True)[0].astype(np.float32)
        pieces += [a, short]
        print(f"p{pi} {dur:.1f}s -> {len(a)/24000:.1f}s | {s[:50]}", flush=True)
    pieces.append(long_gap)
sf.write(out, np.concatenate(pieces), 24000)
print("wrote", out, round(sum(len(x) for x in pieces)/24000,1), "s", "in", round(time.time()-t0), "s")
