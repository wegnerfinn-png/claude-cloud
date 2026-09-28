import json, numpy as np, soundfile as sf

SR = 48000
BPM = 124
BEAT = 60 / BPM
rng = np.random.default_rng(7)

segs = json.load(open("ok/vo/segments.json"))
GAP_AFTER = {"hook": 0.3, "i1": 0.18, "i2": 0.15, "i3": 0.15, "i4": 0.18, "i5": 0.35, "total": 0.5, "burn": 0.45, "twist": 0.35}
t = 0.3
voice_tracks = []
for s in segs:
    a, sr = sf.read(f"ok/vo/{s['id']}.wav")
    a = np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a)
    env = np.abs(a)
    win = int(0.01 * SR)
    frames = env[: len(env) // win * win].reshape(-1, win).max(1)
    loud = np.where(frames > 0.02)[0]
    s["vs"] = loud[0] * 0.01 if len(loud) else 0
    s["ve"] = (loud[-1] + 1) * 0.01 if len(loud) else len(a) / SR
    s["s"] = t
    s["dur"] = len(a) / SR
    s["e"] = t + s["dur"]
    voice_tracks.append((t, a))
    t = s["e"] + GAP_AFTER.get(s["id"], 0)
END = segs[-1]["e"] + 2.6
N = int(END * SR)
T = {s["id"]: s for s in segs}

voice = np.zeros(N)
for st, a in voice_tracks:
    i = int(st * SR)
    voice[i : i + len(a)] += a
voice /= np.abs(voice).max() + 1e-9
voice *= 0.92


def env_exp(n, k):
    return np.exp(-np.arange(n) / SR * k)


def add(buf, at, sig, g=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * g


def lp(x, cut):
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def kick():
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    f = 45 + 110 * np.exp(-tt * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env_exp(n, 9) + 0.3 * np.sin(ph) * env_exp(n, 40)


def clap():
    n = int(0.22 * SR)
    x = rng.standard_normal(n)
    x = x - lp(x, 900)
    return x * env_exp(n, 22) * 0.5


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    x = rng.standard_normal(n)
    x = x - lp(x, 7000)
    return x * env_exp(n, 18 if open_ else 70) * 0.35


def bass_note(freq, dur):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    saw = 2 * ((tt * freq) % 1) - 1
    sq = np.sign(np.sin(2 * np.pi * freq / 2 * tt))
    x = 0.7 * saw + 0.3 * sq
    x = lp(x, 380)
    e = np.minimum(1, tt / 0.005) * env_exp(n, 6)
    return x * e


def stab(freqs, dur):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = sum(2 * ((tt * f * d) % 1) - 1 for f in freqs for d in (0.996, 1.004))
    x = lp(x, 1800)
    return x * np.minimum(1, tt / 0.01) * env_exp(n, 7) * 0.08


# riser before app drop and before cta
def riser(dur):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = int(0.05 * SR)
    for i in range(0, n, seg):
        cut = 300 + 7000 * (i / n) ** 2
        out[i : i + seg] = lp(x[i : i + seg], cut)
    return out * (tt / dur) ** 2 * 0.9


def impact():
    n = int(1.0 * SR)
    tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-tt * 12)) / SR) * env_exp(n, 4.5)
    crack = rng.standard_normal(n) * env_exp(n, 30)
    return boom * 0.9 + lp(crack, 3000) * 0.6


def whoosh(dur=0.45):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = int(0.02 * SR)
    for i in range(0, n, seg):
        p = i / n
        out[i : i + seg] = lp(x[i : i + seg], 400 + 5000 * np.sin(np.pi * p))
    return out * np.sin(np.pi * tt / dur) ** 2 * 0.8


def pop(f=880):
    n = int(0.12 * SR)
    tt = np.arange(n) / SR
    fr = f * (1 + 0.6 * np.exp(-tt * 60))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env_exp(n, 30) * 0.5


def ding():
    n = int(1.4 * SR)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1318.5 * tt) + 0.6 * np.sin(2 * np.pi * 1975.5 * tt) + 0.3 * np.sin(2 * np.pi * 2637 * tt)) * env_exp(n, 3.5) * 0.25


def stamp():
    n = int(0.35 * SR)
    x = rng.standard_normal(n)
    return lp(x, 1200) * env_exp(n, 25) * 1.2 + impact()[:n] * 0.6



music = np.zeros(N)
def brass(freqs, dur, cut=2400, g=0.1):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(np.sign(np.sin(2*np.pi*f*d*tt)) * 0.6 + (2*((tt*f*d) % 1)-1) * 0.4 for f in freqs for d in (0.997, 1.003))
    x = lp(x, cut)
    e = np.minimum(1, tt/0.012) * np.exp(-tt*9)
    return x * e * g
def tuba(f, dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = lp(2*((tt*f) % 1)-1 + 0.5*np.sin(2*np.pi*f*tt), 500)
    return x * np.minimum(1, tt/0.02) * np.exp(-tt*5) * 0.9
K, C, H = kick(), clap(), hat()
F, Bb, C_, A = 87.31, 116.54, 65.41, 110.0
# bars: F F C7 C7 F F C7 F  (root, fifth, chord)
bars = [("F",F,C_*2,[349.2,440,523.3]),("F",F,C_*2,[349.2,440,523.3]),("C",C_*1.0,98.0,[329.6,392,466.2]),("C",C_,98.0,[329.6,392,466.2]),
        ("F",F,C_*2,[349.2,440,523.3]),("Bb",Bb,F,[349.2,466.2,587.3]),("C",C_,98.0,[329.6,392,466.2]),("F",F,C_*2,[349.2,440,523.3])]
cache = {}
nb = int(END / BEAT) + 1
twist_s = T["twist"]["s"]; cta_s = T["cta"]["s"]; tot_s = T["total"]["s"]
for b in range(nb):
    bt = 0.3 + b * BEAT
    if bt > END - 1.6: break
    name, root, fifth, chord = bars[(b // 4) % 8]
    pos = b % 4
    soft = tot_s - 0.2 <= bt < tot_s + 0.9
    if soft: 
        add(music, bt, H, 0.4); continue
    bass_f = root if pos in (0,) else fifth if pos == 2 else None
    if bass_f:
        key = ("t", bass_f)
        if key not in cache: cache[key] = tuba(bass_f, BEAT*0.9)
        add(music, bt, cache[key], 0.8)
        add(music, bt, K, 0.75)
    else:
        key = ("b", name)
        if key not in cache: cache[key] = brass(chord, BEAT*0.45)
        add(music, bt, cache[key], 1.4)
        add(music, bt, C, 0.45)
    add(music, bt + BEAT/2, H, 0.55)

def dotmatrix(dur=0.4):
    n = int(dur*SR); out = np.zeros(n)
    for i in range(0, n, int(0.028*SR)):
        m = int(0.012*SR); x = rng.standard_normal(m); x = x - lp(x, 2500)
        out[i:i+m] += x[:len(out[i:i+m])] * np.exp(-np.arange(min(m, n-i))/SR*200)
    return out * 0.5
def kaching():
    n = int(1.3*SR); tt = np.arange(n)/SR
    bell = (np.sin(2*np.pi*2093*tt) + 0.7*np.sin(2*np.pi*2637*tt) + 0.5*np.sin(2*np.pi*3136*tt)) * np.exp(-tt*4) * 0.3
    x = rng.standard_normal(n); clunk = lp(x, 1500) * np.exp(-tt*35) * 1.2
    return bell + clunk
def clink():
    n = int(1.6*SR); tt = np.arange(n)/SR
    y = np.zeros(n)
    for off in (0, 0.045):
        i = int(off*SR); m = n - i; t2 = tt[:m]
        y[i:] += (np.sin(2*np.pi*2710*t2) + 0.6*np.sin(2*np.pi*4020*t2) + 0.4*np.sin(2*np.pi*5390*t2)) * np.exp(-t2*6) * 0.25
    return y
sfx = np.zeros(N)
IMP, WH = impact(), whoosh()
add(sfx, T["hook"]["s"] - 0.02, IMP, 0.8)
for k in ("i1","i2","i3","i4","i5"):
    add(sfx, T[k]["s"] - 0.05, dotmatrix(), 0.9)
    add(sfx, T[k]["s"] + 0.1, pop(900), 0.5)
add(sfx, tot_s - 1.0, riser(1.0), 0.6)
add(sfx, tot_s, kaching(), 1.0); add(sfx, tot_s, IMP, 0.7)
add(sfx, T["burn"]["s"] - 0.3, WH, 0.7)
run0 = T["burn"]["s"] + 0.3; run1 = T["burn"]["e"] - 0.2
marathon_t = run0 + (run1 - run0) * 42/55
add(sfx, marathon_t, ding(), 0.9)
add(sfx, twist_s - 0.3, WH, 0.7); add(sfx, twist_s + 0.05, IMP, 0.6)
add(sfx, T["twist"]["e"] - 1.5, ding(), 0.7)
add(sfx, cta_s - 0.3, WH, 0.6)
add(sfx, T["cta"]["e"] - 0.55, clink(), 1.2)
add(sfx, T["cta"]["e"] - 0.55, IMP, 0.5)
# ducking: music lower while voice present
venv = np.abs(voice)
win = int(0.02 * SR)
pad = np.concatenate([venv, np.zeros((-len(venv)) % win)])
blk = pad.reshape(-1, win).max(1)
blk = np.convolve(blk > 0.03, np.ones(12) / 12, mode="same")
duck = np.repeat(blk, win)[:N]
duck = lp(duck, 6)
mgain = 0.42 - 0.22 * np.clip(duck, 0, 1)
fade = np.clip((END - np.arange(N) / SR) / 1.2, 0, 1)
mix = voice * 1.0 + music * mgain * 0.55 * fade + sfx * 0.45
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.abs(mix).max() / 0.95
sf.write("ok/mix.wav", np.stack([mix, mix], 1).astype(np.float32), SR)

json.dump({"end": END, "bpm": BPM, "beat0": 0.3, "segs": segs, "marathon": marathon_t, "run": [run0, run1]}, open("ok/timeline.json", "w"), indent=1)
print("END", round(END, 2), {s["id"]: round(s["s"], 2) for s in segs})
