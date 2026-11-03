import test from "node:test";
import assert from "node:assert/strict";
import { loadSourceModule } from "./helpers/source-module.mjs";

for (const [requested, resolved] of [["en", "en"], ["zh-TW", "zh-TW"], ["ja", "zh-TW"]]) {
  test(`presentation locale follows rendered translations: ${requested} -> ${resolved}`, () => {
    const i18n = { language: requested, resolvedLanguage: resolved };
    const { useTranslation } = loadSourceModule("src/hooks/use-translation.ts", {
      react: { useEffect() {}, useCallback: (callback) => callback, useRef: (value) => ({ current: value }) },
      "react-i18next": { useTranslation: () => ({ t: (key) => key, i18n }) },
    });
    const result = useTranslation("ui");
    assert.equal(result.currentLanguage, resolved);
    assert.equal(result.i18n.language, requested);
  });
}
