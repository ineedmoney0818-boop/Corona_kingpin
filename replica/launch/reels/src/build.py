import json, sys, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from reels import REELS

VOICE, SPEED, PAD = "af_heart", 1.08, 0.35
k = Kokoro("voices/kokoro-v1.0.onnx", "voices/voices-v1.0.bin")
names = sys.argv[1:] or list(REELS)

def trim(a, sr, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    return a if len(idx) == 0 else a[max(0, idx[0] - int(.03 * sr)): idx[-1] + int(.08 * sr)]

for name in names:
    R = REELS[name]; sr = 24000; audio = []; t = 0.0; scenes = []; words = []; chunk = 0
    for sc in R["scenes"]:
        vo = sc["vo"]
        a, sr = k.create(vo, voice=VOICE, speed=SPEED, lang="en-us"); a = trim(a, sr)
        vd = len(a) / sr; dur = max(vd + PAD, sc.get("min", 0))
        lead = 0.15
        # captions: split into sentence-ish chunks of <=4 words, time words by char length
        toks = vo.replace("D M", "DM").split()
        tot = sum(len(w) + 1 for w in toks); c0 = t + lead; n = 0
        for w in toks:
            d = vd * (len(w) + 1) / tot
            words.append({"w": w, "s": round(c0, 3), "e": round(c0 + d, 3), "chunk": chunk})
            c0 += d; n += 1
            if n >= 4 or re.search(r"[.?!,]$", w): chunk += 1; n = 0
        chunk += 1
        seg = np.zeros(int(dur * sr) + int(lead * sr), dtype=np.float32)
        seg[int(lead * sr): int(lead * sr) + len(a)] = a
        audio.append(seg); dur += lead
        scenes.append({"type": sc["type"], "p": sc.get("p", {}), "start": round(t, 3), "dur": round(dur, 3), "nocap": sc.get("nocap", False)})
        t += dur
    full = np.concatenate(audio + [np.zeros(int(.4 * sr), dtype=np.float32)]); t += .4
    scenes[-1]["dur"] += .4
    sf.write(f"out/{name}.wav", full, sr)
    json.dump({"hook": R["hook"], "hookDur": R["hookDur"], "scenes": scenes, "words": words, "dur": round(t, 3)}, open(f"out/{name}.json", "w"))
    print(name, round(t, 1), "s")
