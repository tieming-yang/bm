"""Subset the pinned Noto Serif TC font after changing greeting content.

Usage: python prepare-font.py /path/to/NotoSerifTC.ttf
Requires fonttools 4.68.0. The source SHA-256 is checked before processing.
"""

import hashlib
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


root = Path(__file__).resolve().parents[2]
source = Path(sys.argv[1])
expected_sha256 = "0077e18f57c6908f4a000969880940bdb0dad057c0e8d98b49dc364c3d1b09c6"
if hashlib.sha256(source.read_bytes()).hexdigest() != expected_sha256:
    raise ValueError("Greeting font source does not match the pinned SHA-256")

text = "Open today’s blessing打開今日祝福彼岸數位媒體每日祝福早安午安晚上好晚安年月日星期一二三四五六"
for name in ("content.ts", "contracts.ts", "policy.ts", "render.tsx"):
    text += (root / "lib/greet" / name).read_text()
codepoints = set(range(32, 127)) | {ord(char) for char in text if ord(char) > 127}
font = TTFont(source)
missing = codepoints - set(font.getBestCmap())
if missing:
    raise ValueError(f"Greeting font lacks characters: {''.join(chr(n) for n in sorted(missing))}")
font = instantiateVariableFont(font, {"wght": 400}, inplace=True)
options = subset.Options()
options.recalc_timestamp = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=codepoints)
subsetter.subset(font)
destination = root / "lib/greet/assets/greet-font.ttf"
destination.parent.mkdir(parents=True, exist_ok=True)
font.save(destination)
print(f"Bundled {len(codepoints)} characters in {destination.stat().st_size} bytes")
