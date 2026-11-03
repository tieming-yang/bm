import test from "node:test";
import assert from "node:assert/strict";
import { loadSourceModule } from "./helpers/source-module.mjs";

test("school video names recreated provider frames and disconnects on player cleanup", () => {
  const observers = [];
  const originalObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = function(callback) {
    const state = { callback, disconnected: false, observe: (root, options) => { state.root = root; state.options = options; }, disconnect: () => { state.disconnected = true; } };
    observers.push(state);
    return state;
  };
  try {
    const { default: Player } = loadSourceModule("src/app/(works)/school/components/school-video-player.tsx", {
      react: { useRef: () => ({ current: null }), useCallback: (callback) => callback },
      "react-player": "Player",
    });
    let frame = null;
    const root = { querySelector: () => frame };
    const player = { shadowRoot: root };
    let loadStart = 0;
    const view = Player({ title: "Bible School: Fish", src: "https://youtu.be/B6e347CbetE", onLoadStart: () => { loadStart++; } });
    view.props.ref(player);
    assert.equal(observers.length, 1);
    const labels = [];
    frame = { setAttribute: (name, value) => labels.push([name, value]) };
    observers[0].callback();
    assert.deepEqual(labels.at(-1), ["title", "Bible School: Fish"]);
    view.props.onLoadStart({ currentTarget: player });
    assert.equal(loadStart, 1);
    assert.equal(observers[0].disconnected, true);
    assert.equal(observers.length, 2);
    assert.deepEqual(observers[1].options, { childList: true, subtree: true });
    view.props.ref(null);
    assert.equal(observers[1].disconnected, true);
    const translated = Player({ title: "聖經學堂：魚", src: "https://youtu.be/B6e347CbetE" });
    translated.props.ref(player);
    assert.deepEqual(labels.at(-1), ["title", "聖經學堂：魚"]);
    translated.props.ref(null);
  } finally {
    globalThis.MutationObserver = originalObserver;
  }
});
