import json, numpy as np, soundfile as sf

SR = 48000
BPM = 128
BEAT = 60 / BPM
rng = np.random.default_rng(7)

segs = json.load(open("vo/segments.json"))
GAP_AFTER = {"hook": 0.25, "m1q": 0.3, "m1a": 0.4, "m2q": 0.3, "m2a": 0.4, "m3q": 0.3, "m3a": 0.4, "twist": 0.25, "app": 0.3}
t = 0.3
voice_tracks = []
for s in segs:
    a, sr = sf.read(f"vo/{s['id']}.wav")
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
END = segs[-1]["e"] + 2.2
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


music = np.zeros(N)
K, C, H, HO = kick(), clap(), hat(), hat(True)
prog = [(55.0, [220, 261.6, 329.6]), (43.65, [174.6, 220, 261.6]), (65.4, [261.6, 329.6, 392]), (49.0, [196, 246.9, 293.7])]
twist_s, app_s, cta_s = T["twist"]["s"], T["app"]["s"], T["cta"]["s"]
bass_cache = {}
nb = int(END / BEAT) + 1
for b in range(nb):
    bt = 0.3 + b * BEAT - BEAT * 0  # grid anchored to first voice start
    if bt > END - 1.4:
        break
    breakdown = twist_s - 0.1 <= bt < app_s - 0.05
    bar = (b // 4) % 4
    root, chord = prog[bar]
    if not breakdown:
        add(music, bt, K, 0.9)
        if b % 4 in (1, 3):
            add(music, bt, C, 0.7)
        add(music, bt + BEAT / 2, HO if b % 2 else H, 0.8)
        add(music, bt + BEAT / 4, H, 0.4)
        add(music, bt + 3 * BEAT / 4, H, 0.4)
        for eighth in (0, 1):
            key = (root, eighth)
            if key not in bass_cache:
                bass_cache[key] = bass_note(root * (2 if eighth else 1), BEAT / 2)
            add(music, bt + eighth * BEAT / 2, bass_cache[key], 0.55)
    else:
        add(music, bt, H, 0.5)
    if b % 4 == 0:
        add(music, bt, stab(chord, BEAT * 3.5), 0.9 if not breakdown else 1.3)

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


sfx = np.zeros(N)
IMP, WH = impact(), whoosh()
events = {"impact": [], "whoosh": [], "pop": [], "ding": []}
add(sfx, T["hook"]["s"] - 0.02, IMP, 0.9); events["impact"].append(T["hook"]["s"] - 0.02)
for m in ("m1", "m2", "m3"):
    q, a = T[m + "q"], T[m + "a"]
    add(sfx, q["s"] - 0.3, WH, 0.7); events["whoosh"].append(q["s"] - 0.3)
    add(sfx, a["s"] - 0.05, stamp(), 0.85); events["impact"].append(a["s"] - 0.05)
add(sfx, twist_s - 0.3, WH, 0.7)
add(sfx, twist_s + 0.05, IMP, 0.6)
add(sfx, app_s - 1.6, riser(1.6), 0.7)
add(sfx, app_s, IMP, 0.8)
# food chip pops inside app scene (visual uses same schedule)
app = T["app"]
chip_times = [app["s"] + 0.7 + i * (app["dur"] - 1.2) / 6 for i in range(6)]
for i, ct in enumerate(chip_times):
    add(sfx, ct, pop(700 + 90 * i), 0.8)
goal_t = chip_times[-1] + 0.35
add(sfx, goal_t, ding(), 1.0)
add(sfx, cta_s - 1.0, riser(1.0), 0.6)
add(sfx, cta_s, IMP, 0.9)
add(sfx, cta_s + 0.02, ding(), 0.6)

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
sf.write("mix.wav", np.stack([mix, mix], 1).astype(np.float32), SR)

json.dump({"end": END, "bpm": BPM, "beat0": 0.3, "segs": segs, "chips": chip_times, "goal": goal_t}, open("timeline.json", "w"), indent=1)
print("END", round(END, 2), {s["id"]: round(s["s"], 2) for s in segs})
