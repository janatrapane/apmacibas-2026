import sys, torch, soundfile as sf, numpy as np, time
from omnivoice import OmniVoice
ref, txt, out = sys.argv[1], sys.argv[2], sys.argv[3]
cps = float(sys.argv[4]) if len(sys.argv) > 4 else 12.0
lines = [l.strip() for l in open(txt, encoding="utf-8").read().split("\n") if l.strip()]
t0 = time.time()
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="mps", dtype=torch.float32)
prompt = model.create_voice_clone_prompt(ref_audio=ref)
pieces, gap = [], np.zeros(int(24000*0.35), dtype=np.float32)
for i, l in enumerate(lines, 1):
    a = model.generate(text=l, language="lv", voice_clone_prompt=prompt, duration=max(1.5, len(l)/cps), denoise=True, num_step=48)[0].astype(np.float32)
    pieces += [a, gap]; print(f"line {i}/{len(lines)} {len(a)/24000:.1f}s t={round(time.time()-t0)}s", flush=True)
sf.write(out, np.concatenate(pieces), 24000); print("wrote", out, round(sum(len(x) for x in pieces)/24000,1), "s")
