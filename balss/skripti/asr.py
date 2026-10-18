import sys, torch
from transformers import pipeline
asr = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3-turbo", device="mps", dtype=torch.float32)
for f in sys.argv[1:]:
    r = asr(f, generate_kwargs={"language": "lv", "task": "transcribe"}, return_timestamps=True, chunk_length_s=30)
    print(f, "=>", r["text"])
