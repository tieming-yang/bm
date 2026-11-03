import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import i18next from "i18next";

test("English curriculum tabs resolve without falling back to Chinese", async () => {
  const resources = {};
  for (const language of ["en", "zh-TW"]) {
    resources[language] = {
      school: JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/school.json`, import.meta.url), "utf8")),
    };
  }
  const i18n = i18next.createInstance();
  await i18n.init({ lng: "en", fallbackLng: "zh-TW", resources, defaultNS: "school" });

  for (const [course, expected] of [["genesis", "Genesis"], ["characters", "Bible Characters"]]) {
    const result = i18n.t(`school.curriculums.${course}.title`, { returnDetails: true });
    assert.equal(result.res, expected);
    assert.equal(result.usedLng, "en");
  }
});
