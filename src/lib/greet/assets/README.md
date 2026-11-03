The greeting renderer uses a static, subsetted Noto Serif TC Regular font.

- Source: https://github.com/google/fonts/blob/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf
- Source SHA-256: `0077e18f57c6908f4a000969880940bdb0dad057c0e8d98b49dc364c3d1b09c6`
- License: SIL Open Font License 1.1, included in `OFL.txt`.
- Rebuild after changing card text or the content rotation with `python src/scripts/greet/prepare-font.py /path/to/NotoSerifTC.ttf` (fonttools 4.68.0).
- Regenerate the fixed invitation with `node src/scripts/greet/generate-invitation.mjs`.

The font is read from disk by the Node renderer, with no font network request during card generation.
