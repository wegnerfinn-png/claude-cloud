"""Generate the voiceover clips with Chatterbox (run on a machine with the model).

    pip install chatterbox-tts
    python vo/chatterbox_batch.py --voice my_voice.wav      # optional reference voice
    node render.mjs                                         # beats stretch to fit the clips
"""
import argparse
import json
import pathlib

import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

here = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument("--voice", help="reference voice wav (5-10 s, clean)")
ap.add_argument("--exaggeration", type=float, default=0.55)
ap.add_argument("--cfg", type=float, default=0.45)
args = ap.parse_args()

device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
model = ChatterboxTTS.from_pretrained(device=device)

for line in json.loads((here / "lines.json").read_text()):
    wav = model.generate(line["say"], audio_prompt_path=args.voice,
                         exaggeration=args.exaggeration, cfg_weight=args.cfg)
    ta.save(str(here / line["file"]), wav, model.sr)
    print(line["file"], line["say"])
