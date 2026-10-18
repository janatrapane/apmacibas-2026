"""Sentence-by-sentence generation with resume: each sentence is saved to <out>.parts/NNN.wav."""
import sys, re, torch, soundfile as sf, numpy as np, time, pathlib
from omnivoice import OmniVoice
ref, txt, out = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3])
cps = float(sys.argv[4]) if len(sys.argv) > 4 else 12.0
parts = pathlib.Path(str(out) + ".parts"); parts.mkdir(exist_ok=True)
units = []
for pi, p in enumerate([p.strip() for p in open(txt, encoding="utf-8").read().split("\n") if p.strip()]):
    for s in [s.strip() for s in re.split(r'(?<=[.!?:])\s+', p) if s.strip()]:
        units.append((pi, s))
t0 = time.time(); model = prompt = None
for i, (pi, s) in enumerate(units):
    f = parts / f"{i:03d}.wav"
    if f.exists(): continue
    if model is None:
        model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="mps", dtype=torch.float32)
        prompt = model.create_voice_clone_prompt(ref_audio=ref)
    a = model.generate(text=s, language="lv", voice_clone_prompt=prompt, duration=max(1.4, len(s)/cps), denoise=True)[0].astype(np.float32)
    sf.write(f, a, 24000); print(f"{i+1}/{len(units)} {len(a)/24000:.1f}s t={round(time.time()-t0)}s | {s[:48]}", flush=True)
short, long_gap = np.zeros(int(24000*0.25), dtype=np.float32), np.zeros(int(24000*0.6), dtype=np.float32)
pieces, last_p = [], None
for i, (pi, s) in enumerate(units):
    if last_p is not None and pi != last_p: pieces.append(long_gap)
    pieces += [sf.read(parts / f"{i:03d}.wav", dtype="float32")[0], short]; last_p = pi
sf.write(out, np.concatenate(pieces), 24000); print("wrote", out, round(sum(len(x) for x in pieces)/24000,1), "s")
