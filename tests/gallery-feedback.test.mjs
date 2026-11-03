import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import i18next from "i18next";
import ts from "typescript";

const source = ts.createSourceFile(
  "image-gallery.tsx",
  readFileSync(new URL("../src/components/image-gallery.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let shareCallback;
function findShareCallback(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "handleShare") {
    shareCallback = node.initializer;
  }
  ts.forEachChild(node, findShareCallback);
}
findShareCallback(source);
assert.ok(shareCallback, "The gallery share callback must exist");
const callbackCode = ts.transpileModule(`(${shareCallback.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

const i18n = i18next.createInstance();
const resources = {};
for (const language of ["en", "zh-TW"]) {
  resources[language] = {
    gallery: JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/gallery.json`, import.meta.url), "utf8")),
  };
}
await i18n.init({ resources, fallbackLng: "zh-TW", defaultNS: "gallery" });

function makeShare({ language = "en", navigator, selectedArtwork = { id: "genesis-1" } }) {
  const notifications = [];
  const errors = [];
  const handleShare = runInNewContext(callbackCode, {
    selectedArtwork,
    window: { location: { origin: "https://example.test" } },
    pathname: "/bible-gallery/genesis",
    navigator,
    console: { error: (error) => errors.push(error) },
    t: i18n.getFixedT(language, "gallery"),
    toast: {
      success: (title, options) => notifications.push({ type: "success", title, ...options }),
      error: (title, options) => notifications.push({ type: "error", title, ...options }),
    },
  });
  return { handleShare, notifications, errors };
}

for (const language of ["en", "zh-TW"]) {
  const messages = resources[language].gallery.toast;

  test(`gallery confirms a completed clipboard write in ${language}`, async () => {
    let finishCopy;
    const writes = [];
    const { handleShare, notifications } = makeShare({
      language,
      navigator: {
        clipboard: {
          writeText: (text) => {
            writes.push(text);
            return new Promise((resolve) => { finishCopy = resolve; });
          },
        },
      },
    });

    const pending = handleShare();
    assert.deepEqual(writes, ["https://example.test/bible-gallery/genesis?image=genesis-1"]);
    assert.deepEqual(notifications, []);
    finishCopy();
    await pending;
    assert.deepEqual(notifications, [{ type: "success", ...messages.linkCopied }]);
  });

  test(`gallery shows only localized failure feedback when clipboard writing rejects in ${language}`, async () => {
    const failure = new Error("Clipboard permission denied");
    const { handleShare, notifications, errors } = makeShare({
      language,
      navigator: { clipboard: { writeText: async () => { throw failure; } } },
    });

    await handleShare();
    assert.deepEqual(notifications, [{ type: "error", ...messages.copyFailed }]);
    assert.deepEqual(errors, [failure]);
  });

  test(`gallery handles an unavailable clipboard API in ${language}`, async () => {
    const { handleShare, notifications } = makeShare({ language, navigator: {} });

    await handleShare();
    assert.deepEqual(notifications, [{ type: "error", ...messages.copyFailed }]);
  });
}

test("gallery ignores sharing without a selected artwork", async () => {
  const { handleShare, notifications, errors } = makeShare({
    selectedArtwork: null,
    navigator: {},
  });

  await handleShare();
  assert.deepEqual(notifications, []);
  assert.deepEqual(errors, []);
});
