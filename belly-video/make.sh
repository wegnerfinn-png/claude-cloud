#!/usr/bin/env bash
# Full pipeline: voiceover -> frames -> soundtrack + final MP4
set -euo pipefail
cd "$(dirname "$0")"
python3 tts.py
node render.mjs
python3 mix.py
