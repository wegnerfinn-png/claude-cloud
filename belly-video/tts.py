#!/usr/bin/env python3
"""Voiceover + word timings for the video.

Reads script.json, speaks every scene with Piper (offline neural TTS) and writes
  build/voice.wav      the full voiceover
  build/timeline.json  scene boundaries and per-word start/end times

Word times come from Piper's phoneme alignments, so the captions and the
animation beats line up with the voice exactly.
"""

import json
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
FPS = 30

PUNCT = set(",.;:!?¡¿—–-…\"'()")


def ensure_voice(model: Path) -> None:
    """Default voice: en_US-joe-medium (CC0), which is published on npm."""
    if model.exists():
        return
    print(f"Voice {model.name} missing, fetching en_US-joe-medium from npm ...")
    tmp = BUILD / "npm-voice"
    tmp.mkdir(parents=True, exist_ok=True)
    subprocess.run(["npm", "pack", "vowel-lab-voices-float@0.1.0", "--silent"], cwd=tmp, check=True)
    tgz = next(tmp.glob("vowel-lab-voices-float-*.tgz"))
    subprocess.run(["tar", "xzf", tgz.name], cwd=tmp, check=True)
    model.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(tmp / "package" / "float.onnx"), model)
    shutil.rmtree(tmp)


def ensure_config(model: Path, espeak_voice: str) -> Path:
    """Piper voices from rhasspy ship a .onnx.json; the npm copy does not, so write the standard one."""
    cfg = model.with_suffix(".onnx.json")
    if not cfg.exists():
        from piper.phoneme_ids import DEFAULT_PHONEME_ID_MAP

        cfg.write_text(json.dumps({
            "audio": {"sample_rate": 22050},
            "espeak": {"voice": espeak_voice},
            "phoneme_type": "espeak",
            "num_symbols": 256,
            "num_speakers": 1,
            "inference": {"noise_scale": 0.667, "length_scale": 1.0, "noise_w": 0.8},
            "phoneme_id_map": DEFAULT_PHONEME_ID_MAP,
            "speaker_id_map": {},
        }))
    return cfg


def split_sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


def display_words(sentence: str) -> list[str]:
    return [w for w in sentence.split() if re.search(r"[A-Za-z0-9]", w)]


def phoneme_word_spans(chunks) -> list[tuple[int, int]]:
    """(start_sample, end_sample) of every spoken word across the chunks of one sentence."""
    spans, offset = [], 0
    for chunk in chunks:
        cur = None
        for al in chunk.phoneme_alignments:
            n = int(al.num_samples)
            p = al.phoneme
            if p in ("^", "$", "_") or p in PUNCT or p == " ":
                if cur is not None:
                    spans.append(tuple(cur))
                    cur = None
            else:
                if cur is None:
                    cur = [offset, offset + n]
                else:
                    cur[1] = offset + n
            offset += n
        if cur is not None:
            spans.append(tuple(cur))
    return spans


def trim(audio: np.ndarray, sr: int, thresh: float = 0.02, margin: float = 0.04) -> tuple[np.ndarray, int]:
    """Cut leading/trailing silence, return (audio, samples removed at the start)."""
    loud = np.flatnonzero(np.abs(audio) > thresh)
    if loud.size == 0:
        return audio, 0
    m = int(margin * sr)
    a, b = max(0, loud[0] - m), min(len(audio), loud[-1] + m)
    return audio[a:b], a


def main() -> int:
    script = json.loads((ROOT / "script.json").read_text())
    vcfg = script["voice"]
    model = ROOT / vcfg["model"]
    BUILD.mkdir(exist_ok=True)
    ensure_voice(model)
    cfg_path = ensure_config(model, vcfg.get("espeak_voice", "en-us"))

    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(str(model), config_path=str(cfg_path), include_alignments=True)
    sr = voice.config.sample_rate
    syn = SynthesisConfig(length_scale=vcfg.get("length_scale", 1.0))

    lead_in = 0.35
    audio_parts = [np.zeros(int(lead_in * sr), dtype=np.float32)]
    cursor = lead_in
    scenes = []

    for scene in script["scenes"]:
        words, speech_start = [], cursor
        sentences = split_sentences(scene["text"])
        for si, sentence in enumerate(sentences):
            chunks = list(voice.synthesize(sentence, syn_config=syn, include_alignments=True))
            audio = np.concatenate([c.audio_float_array for c in chunks])
            shown = display_words(sentence)
            if all(c.phoneme_alignments for c in chunks):
                spans = phoneme_word_spans(chunks)
            else:
                spans = []
            audio, cut = trim(audio, sr)
            if len(spans) != len(shown):
                # Fallback: spread the words over the sentence by letter count.
                print(f"  ! {scene['id']}: {len(spans)} spoken vs {len(shown)} shown words, estimating: {sentence!r}")
                lens = np.array([len(re.sub(r'\W', '', w)) + 1 for w in shown], dtype=float)
                edges = np.concatenate([[0], np.cumsum(lens)]) / lens.sum() * len(audio)
                spans = [(int(edges[i]) + cut, int(edges[i + 1]) + cut) for i in range(len(shown))]
            for w, (a, b) in zip(shown, spans):
                t0 = cursor + max(0, a - cut) / sr
                t1 = cursor + max(0, b - cut) / sr
                words.append({"w": w, "t0": round(t0, 3), "t1": round(t1, 3)})
            audio_parts.append(audio.astype(np.float32))
            cursor += len(audio) / sr
            if si < len(sentences) - 1:
                pause = vcfg.get("sentence_pause", 0.12)
                audio_parts.append(np.zeros(int(pause * sr), dtype=np.float32))
                cursor += pause
        speech_end = cursor
        gap = vcfg.get("scene_gap", 0.35)
        audio_parts.append(np.zeros(int(gap * sr), dtype=np.float32))
        cursor += gap
        scenes.append({k: v for k, v in scene.items() if k != "text"} | {
            "speechStart": round(speech_start, 3),
            "speechEnd": round(speech_end, 3),
            "words": words,
        })

    tail = 1.6  # hold the outro after the last word
    audio_parts.append(np.zeros(int(tail * sr), dtype=np.float32))
    duration = cursor + tail

    # Visual boundaries sit just before each scene starts talking, so the wipe lands in the pause.
    for i, sc in enumerate(scenes):
        sc["start"] = 0.0 if i == 0 else round(sc["speechStart"] - 0.18, 3)
    for i, sc in enumerate(scenes):
        sc["end"] = scenes[i + 1]["start"] if i + 1 < len(scenes) else round(duration, 3)

    full = np.concatenate(audio_parts)
    full = full / max(1e-6, np.max(np.abs(full))) * 0.9
    with wave.open(str(BUILD / "voice.wav"), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes((full * 32767).astype(np.int16).tobytes())

    timeline = {"title": script.get("title", ""), "fps": FPS, "duration": round(duration, 3), "scenes": scenes}
    (BUILD / "timeline.json").write_text(json.dumps(timeline, indent=1))
    n_words = sum(len(s["words"]) for s in scenes)
    print(f"voice.wav {duration:.1f}s, {len(scenes)} scenes, {n_words} words -> build/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
