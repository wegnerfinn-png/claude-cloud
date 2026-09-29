#!/usr/bin/env python3
"""Soundtrack + final video.

Synthesises a background beat and all sound effects (no samples needed), ducks the
music under the voice, and muxes everything onto build/video.mp4:

  build/mix.wav             full soundtrack
  out/belly-fat-foods.mp4   the finished short
"""

import json
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
OUT = ROOT / "out"
SR = 44100
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d, seed=0):
    return np.random.default_rng(seed).uniform(-1, 1, int(d * SR))


def filt(x, kind, fc, order=2):
    return sosfilt(butter(order, fc, kind, fs=SR, output="sos"), x)


def sweep(f, d):
    """Sine whose frequency follows the array/func f over d seconds."""
    t = tt(d)
    freq = f(t) if callable(f) else f
    return np.sin(2 * np.pi * np.cumsum(freq * np.ones_like(t)) / SR)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n] * gain


# ---------------- instruments ----------------

def kick():
    t = tt(0.4)
    body = sweep(lambda t: 45 + 120 * np.exp(-t / 0.03), 0.4) * np.exp(-t / 0.13)
    click = filt(noise(0.4, 1), "highpass", 3000) * np.exp(-t / 0.004) * 0.3
    return np.tanh(1.6 * (body + click))


def clap():
    t = tt(0.25)
    n = filt(noise(0.25, 2), "bandpass", [1100, 5000])
    env = np.exp(-t / 0.07) + 0.6 * np.exp(-np.maximum(0, t - 0.012) / 0.02) * (t > 0.012)
    return n * env * 0.8


def hat(open_=False):
    d = 0.18 if open_ else 0.06
    t = tt(d)
    return filt(noise(d, 3), "highpass", 7500) * np.exp(-t / (0.05 if open_ else 0.014)) * 0.5


def bass(freq, d):
    t = tt(d)
    x = np.tanh(1.8 * (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)))
    env = np.minimum(1, t / 0.006) * np.exp(-t / 0.22)
    return filt(x * env, "lowpass", 900)


def pluck(freq, d=0.45):
    t = tt(d)
    x = (np.sin(2 * np.pi * freq * t)
         + 0.45 * np.sin(4 * np.pi * freq * t) * np.exp(-t / 0.05)
         + 0.2 * np.sin(6 * np.pi * freq * t) * np.exp(-t / 0.03))
    return x * np.minimum(1, t / 0.003) * np.exp(-t / 0.13)


def pad(freqs, d):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * k * t + k) for f in freqs for k in (0.996, 1.004))
    env = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
    return filt(x * env / len(freqs), "lowpass", 1400)


def bell(freq, d=1.2, decay=0.35):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * freq * m * t) * np.exp(-t / (decay / m ** 0.5)) for m, a in ((1, 1), (2.01, 0.5), (3.0, 0.3), (4.2, 0.15)))
    return x * np.minimum(1, t / 0.002)


# ---------------- sound effects ----------------

def fx_whoosh(d=0.55, seed=4):
    t = tt(d)
    n = noise(d, seed)
    # sweep a band-pass up then down by stacking a few fixed bands with moving gains
    out = np.zeros_like(n)
    centers = [400, 800, 1600, 3200, 6000]
    pos = np.sin(np.pi * t / d)
    for i, c in enumerate(centers):
        band = filt(n, "bandpass", [c * 0.7, c * 1.4])
        g = np.exp(-((pos * (len(centers) - 1) - i) ** 2) / 0.8)
        out += band * g
    return out * np.sin(np.pi * t / d) ** 1.5 * 0.9


def fx_slam():
    t = tt(0.7)
    boom = sweep(lambda t: 38 + 70 * np.exp(-t / 0.05), 0.7) * np.exp(-t / 0.22)
    crack = filt(noise(0.7, 5), "bandpass", [800, 6000]) * np.exp(-t / 0.03)
    return np.tanh(2.2 * (boom + 0.6 * crack)) * 0.9


def fx_pop():
    t = tt(0.12)
    return sweep(lambda t: 380 + 1400 * (t / 0.12) ** 0.6, 0.12) * np.exp(-t / 0.035) * 0.7


def fx_drop():
    t = tt(0.35)
    thud = sweep(lambda t: 55 + 90 * np.exp(-t / 0.04), 0.35) * np.exp(-t / 0.09)
    boing = sweep(lambda t: 180 + 60 * np.sin(t * 60) * np.exp(-t / 0.1), 0.35) * np.exp(-t / 0.12) * 0.25
    return np.tanh(1.8 * (thud + boing))


def fx_puff():
    t = tt(0.6)
    return filt(noise(0.6, 6), "lowpass", 1800) * np.minimum(1, t / 0.02) * np.exp(-t / 0.18) * 0.9


def fx_card():
    t = tt(0.3)
    return filt(noise(0.3, 7), "bandpass", [1500, 7000]) * np.sin(np.pi * t / 0.3) ** 2 * 0.6


def fx_rise():
    t = tt(0.55)
    return sweep(lambda t: 300 * 4 ** (t / 0.55) * (1 + 0.03 * np.sin(t * 40)), 0.55) * np.minimum(1, t / 0.05) * np.exp(-t / 0.35) * 0.5


def fx_stamp(soft=False):
    t = tt(0.6)
    thud = sweep(lambda t: 42 + 110 * np.exp(-t / 0.03), 0.6) * np.exp(-t / 0.16)
    slap = filt(noise(0.6, 8), "bandpass", [600, 4000]) * np.exp(-t / 0.05)
    x = np.tanh(2.5 * (thud + 0.8 * slap))
    return x * (0.5 if soft else 1.0)


def fx_tap():
    return sum(bell(f, 0.5, 0.12) for f in (1250, 2780)) * 0.3


def fx_pour(d=1.4):
    t = tt(d)
    n = filt(noise(d, 9), "bandpass", [300, 2500])
    r = np.random.default_rng(10)
    glug = np.zeros_like(t)
    for at in np.sort(r.uniform(0, d - 0.1, 14)):
        g = sweep(lambda tt_: r.uniform(250, 500) * (1 + 2 * tt_), 0.08) * np.exp(-tt(0.08) / 0.02)
        place(glug, g, at)
    env = np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.2)
    return (0.6 * n + 0.5 * glug) * env * 0.7


def fx_plop():
    t = tt(0.15)
    return sweep(lambda t: 260 + 1000 * (t / 0.15), 0.15) * np.exp(-t / 0.04) * 0.6


def fx_straw():
    t = tt(0.35)
    return sweep(lambda t: 650 + 700 * (t / 0.35) + 60 * np.sin(t * 90), 0.35) * np.sin(np.pi * t / 0.35) * 0.3


def fx_rain():
    out = np.zeros(int(0.9 * SR))
    for i in range(9):
        t = tt(0.05)
        tick = filt(noise(0.05, 20 + i), "bandpass", [2500, 8000]) * np.exp(-t / 0.008)
        place(out, tick, 0.35 + i * 0.06 + (i % 3) * 0.01, 0.8)
    return out


def fx_crunch():
    out = np.zeros(int(0.35 * SR))
    for i in range(6):
        t = tt(0.06)
        c = filt(noise(0.06, 30 + i), "bandpass", [1200, 7000]) * np.exp(-t / 0.015)
        place(out, c, i * 0.035 + (i % 2) * 0.01)
    return out


def fx_sneak():
    out = np.zeros(int(0.6 * SR))
    for i, n in enumerate((76, 72, 76, 72)):
        place(out, pluck(midi(n), 0.2) * 0.5, i * 0.13)
    return out


def fx_inflate():
    t = tt(0.45)
    return filt(noise(0.45, 11), "bandpass", [800, 5000]) * (t / 0.45) ** 2 * 0.5


def fx_burst():
    t = tt(0.7)
    pop = filt(noise(0.7, 12), "highpass", 500) * np.exp(-t / 0.05)
    thump = sweep(lambda t: 50 + 80 * np.exp(-t / 0.03), 0.7) * np.exp(-t / 0.12)
    return np.tanh(2 * (pop + thump)) * 0.9 + fx_sparkle(0.7)[: len(t)] * 0.4


def fx_ding():
    return (bell(midi(88), 1.0, 0.4) + 0.6 * bell(midi(95), 1.0, 0.3)) * 0.35


def fx_sparkle(d=0.9):
    out = np.zeros(int(d * SR))
    for i, n in enumerate((84, 88, 91, 96, 100)):
        place(out, bell(midi(n), 0.5, 0.15) * 0.25, i * 0.06)
    return out


def fx_zoom():
    return fx_whoosh(0.35, 13) * 0.8


def fx_click():
    t = tt(0.05)
    return filt(noise(0.05, 14), "bandpass", [2000, 6000]) * np.exp(-t / 0.006) * 0.8


SFX = {
    "whoosh": (fx_whoosh, 0.55), "slam": (fx_slam, 0.8), "pop": (fx_pop, 0.45), "drop": (fx_drop, 0.8),
    "puff": (fx_puff, 0.5), "card": (fx_card, 0.45), "rise": (fx_rise, 0.5), "stamp": (fx_stamp, 0.9),
    "stamp-soft": (lambda: fx_stamp(True), 0.8), "tap": (fx_tap, 0.5), "pour": (fx_pour, 0.55), "plop": (fx_plop, 0.5),
    "straw": (fx_straw, 0.45), "rain": (fx_rain, 0.55), "crunch": (fx_crunch, 0.75), "sneak": (fx_sneak, 0.55),
    "inflate": (fx_inflate, 0.45), "burst": (fx_burst, 0.8), "ding": (fx_ding, 0.6), "sparkle": (fx_sparkle, 0.6),
    "zoom": (fx_zoom, 0.5), "click": (fx_click, 0.6),
}


# ---------------- music ----------------

def music(duration, drums_in, drums_out):
    bpm = 112
    beat = 60 / bpm
    bar = 4 * beat
    prog_ = [(36, (60, 64, 67)), (43, (59, 62, 67)), (45, (57, 60, 64)), (41, (57, 60, 65))]  # C G Am F
    L = np.zeros(int((duration + 2) * SR))
    R = np.zeros_like(L)
    k, h, c = kick(), hat(), clap()
    n_bars = int(duration / bar) + 1
    for b in range(n_bars):
        root, chord = prog_[b % 4]
        t0 = b * bar
        p = pad([midi(n) for n in chord], bar + 0.4)
        place(L, p, t0, 0.22)
        place(R, p, t0, 0.22)
        for s in range(8):  # 8th notes
            at = t0 + s * beat / 2
            drums = drums_in <= at < drums_out
            if drums:
                if s % 2 == 0:
                    place(L, k, at, 0.85)
                    place(R, k, at, 0.85)
                if s in (2, 6):
                    place(L, c, at, 0.35)
                    place(R, c, at, 0.35)
                if s % 2 == 1:
                    place(L, h, at, 0.25)
                    place(R, h, at, 0.35)
                place(L, bass(midi(root + (12 if s in (3, 7) else 0)), beat / 2 + 0.05), at, 0.45)
                place(R, bass(midi(root + (12 if s in (3, 7) else 0)), beat / 2 + 0.05), at, 0.45)
            note = midi(chord[s % 3] + 12 + (12 if s == 7 else 0))
            pl = pluck(note)
            pan = 0.35 + 0.3 * (s % 2)
            place(L, pl, at, 0.16 * (1 - pan) * 2)
            place(R, pl, at, 0.16 * pan * 2)
    # riser into the drop
    rise_d = 1.2
    t = tt(rise_d)
    riser = filt(noise(rise_d, 42), "bandpass", [2000, 9000]) * (t / rise_d) ** 2 * 0.25
    place(L, riser, drums_in - rise_d)
    place(R, riser, drums_in - rise_d)
    n = int(duration * SR)
    L, R = L[:n], R[:n]
    fade = np.minimum(1, (duration - tt(duration)) / 2.0)
    return L * fade, R * fade


def read_wav_44k(path):
    raw = subprocess.run([FFMPEG, "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def main():
    tl = json.loads((BUILD / "timeline.json").read_text())
    cues = json.loads((BUILD / "cues.json").read_text())
    duration = tl["duration"]
    n = int(duration * SR)

    voice = read_wav_44k(BUILD / "voice.wav")[:n]
    voice = np.pad(voice, (0, n - len(voice)))

    scenes = tl["scenes"]
    drums_in = scenes[1]["start"] if len(scenes) > 1 else 0
    drums_out = scenes[-1]["start"] + 2.2
    mL, mR = music(duration, drums_in, drums_out)

    # duck the music while the voice talks
    env = filt(np.abs(voice), "lowpass", 8)
    duck = 1 - 0.5 * np.clip(env / 0.05, 0, 1)
    mL *= duck
    mR *= duck

    fx = np.zeros(n)
    cache = {}
    for c in cues:
        name = c["s"]
        if name not in SFX:
            print(f"  ! unknown sound effect {name}")
            continue
        make, gain = SFX[name]
        if name not in cache:
            cache[name] = make()
        place(fx, cache[name], c["t"], gain)

    L = voice * 1.0 + mL * 0.13 + fx * 0.33
    R = voice * 1.0 + mR * 0.13 + fx * 0.33
    peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
    L, R = (np.tanh(x / peak * 1.15) / np.tanh(1.15) * 0.93 for x in (L, R))

    stereo = np.stack([L, R], axis=1)
    with wave.open(str(BUILD / "mix.wav"), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((stereo * 32767).astype(np.int16).tobytes())
    print(f"build/mix.wav {duration:.1f}s, {len(cues)} sound effects")

    video = BUILD / "video.mp4"
    if not video.exists():
        print("build/video.mp4 missing, run: node render.mjs")
        return 1
    OUT.mkdir(exist_ok=True)
    out = OUT / "belly-fat-foods.mp4"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(video), "-i", str(BUILD / "mix.wav"),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100",
                    "-c:a", "aac", "-b:a", "192k",
                    "-shortest", "-movflags", "+faststart", str(out)], check=True)
    print(f"{out.relative_to(ROOT)} ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())
