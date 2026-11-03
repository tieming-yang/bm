import assert from "node:assert/strict";
import test from "node:test";
import { loadSourceModule } from "./helpers/source-module.mjs";

const navigation = loadSourceModule("src/lib/ui/ar-authoring.ts");

test("AR boundaries match route segments and retain hash-only navigation", () => {
  const { isARAuthoringPath, usesARDocumentBoundary } = navigation;
  assert.equal(isARAuthoringPath("/dashboard/ar"), true);
  assert.equal(isARAuthoringPath("/dashboard/ar/edit"), true);
  assert.equal(isARAuthoringPath("/dashboard/art"), false);
  const current = new URL("https://example.test/dashboard/ar/edit?id=one");
  for (const href of ["/dashboard", "/dashboard/ar", "/dashboard/ar/edit?id=two", "https://shop.example.test/"]) {
    assert.equal(usesARDocumentBoundary(current, new URL(href, current)), true);
  }
  assert.equal(usesARDocumentBoundary(current, new URL("#settings", current)), false);
  assert.equal(usesARDocumentBoundary(current, new URL("mailto:hello@example.test")), false);
  assert.equal(usesARDocumentBoundary(new URL("https://example.test/dashboard"), new URL("/dashboard/ar", current)), true);
  assert.equal(usesARDocumentBoundary(new URL("https://example.test/about"), new URL("/contact", current)), false);
});

test("busy writes take precedence and native unload approval is consumed once", () => {
  assert.equal(navigation.decideUnsavedLeave([]), "leave");
  assert.equal(navigation.decideUnsavedLeave([{ dirty: true, busy: false }]), "confirm");
  assert.equal(navigation.decideUnsavedLeave([{ dirty: true, busy: false }, { dirty: false, busy: true }]), "busy");
  const approval = navigation.createUnloadApproval();
  approval.approve();
  assert.equal(approval.consume(), true);
  assert.equal(approval.consume(), false);
  approval.approve();
  approval.reset();
  assert.equal(approval.consume(), false);
});

function providerHarness() {
  const slots = [];
  let cursor = 0;
  let changed = false;
  let effects = [];
  const listeners = new Map();
  const calls = [];
  const previous = { window: globalThis.window, document: globalThis.document, Element: globalThis.Element };
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useRef(value) {
      const index = cursor++;
      slots[index] ??= { current: value };
      return slots[index];
    },
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof value === "function" ? value() : value;
      return [slots[index], (next) => {
        const result = typeof next === "function" ? next(slots[index]) : next;
        if (!Object.is(result, slots[index])) { slots[index] = result; changed = true; }
      }];
    },
    useMemo(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((dep, i) => !Object.is(dep, slots[index].deps[i]))) slots[index] = { deps, value: callback() };
      return slots[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((dep, i) => !Object.is(dep, slots[index].deps[i]))) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: callback() }; });
      }
    },
  };
  const add = (name, listener) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(listener);
  };
  const remove = (name, listener) => listeners.get(name)?.delete(listener);
  const emit = (name, event = {}) => { for (const listener of listeners.get(name) ?? []) listener(event); };
  const unload = () => {
    let prevented = false;
    emit("beforeunload", { preventDefault() { prevented = true; }, returnValue: undefined });
    return prevented;
  };
  globalThis.window = {
    addEventListener: add, removeEventListener: remove,
    location: { href: "https://example.test/dashboard/ar/edit?id=one", assign: (href) => calls.push({ href, warning: unload() }), replace: (href) => calls.push({ href, warning: unload(), replace: true }) },
    history: { length: 2, back: () => calls.push({ back: true, warning: unload() }) },
  };
  globalThis.document = { addEventListener: add, removeEventListener: remove };
  globalThis.Element = class {
    constructor(anchor) { this.anchor = anchor; }
    closest() { return this.anchor; }
  };
  const { UnsavedChangesProvider } = loadSourceModule("src/components/unsaved-changes-provider.tsx", {
    react,
    sonner: { toast: { info: (message) => calls.push({ message }) } },
    "@/hooks/use-translation": () => ({ t: translate }),
    "@/components/ui/confirm-dialog": { ConfirmDialog: "ConfirmDialog" },
    "@/lib/ui/ar-authoring": navigation,
  });
  function translate(key) { return key; }
  let tree;
  const render = () => {
    for (let pass = 0; pass < 20; pass++) {
      cursor = 0; changed = false; effects = [];
      tree = UnsavedChangesProvider({ children: "content" });
      for (const effect of effects) effect();
      if (!changed) return tree;
    }
    throw new Error("Provider did not settle");
  };
  render();
  return {
    calls, render, unload, emit,
    api: () => tree.props.value,
    dialog: () => tree.props.children[1],
    click(href, extra = {}) {
      const event = { button: 0, target: new globalThis.Element({ href, target: "", hasAttribute: () => false }), preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...extra };
      emit("click", event);
      return event;
    },
    dispose() {
      for (const slot of slots) slot?.cleanup?.();
      Object.assign(globalThis, previous);
    },
  };
}

test("app links preserve drafts on Stay, navigate once on Discard, and retain native reload protection", () => {
  const h = providerHarness();
  try {
    const unregister = h.api().register(Symbol(), { dirty: true, busy: false });
    h.render();
    assert.equal(h.unload(), true);
    assert.equal(h.click("https://example.test/dashboard").defaultPrevented, true);
    h.render();
    assert.equal(h.dialog().props.open, true);
    h.dialog().props.onOpenChange(false);
    h.render();
    assert.deepEqual(h.calls, []);
    h.click("https://example.test/dashboard");
    h.render();
    h.dialog().props.onConfirm();
    assert.deepEqual(h.calls, [{ href: "https://example.test/dashboard", warning: false }]);
    assert.equal(h.unload(), true);
    h.api().leaveAfterSave("/dashboard/ar");
    assert.equal(h.calls.at(-1).warning, false);
    assert.equal(h.unload(), true);
    unregister();
    h.render();
    assert.equal(h.unload(), false);
  } finally { h.dispose(); }
});

test("pending writes block app navigation; browser traversal/reload still warns; new tabs and hashes remain available", () => {
  const h = providerHarness();
  try {
    h.api().register(Symbol(), { dirty: false, busy: true });
    h.render();
    h.api().back();
    assert.deepEqual(h.calls, [{ message: "ar.operationPending" }]);
    assert.equal(h.unload(), true);
    assert.equal(h.click("https://example.test/dashboard", { ctrlKey: true }).defaultPrevented, undefined);
    assert.equal(h.click("https://example.test/dashboard/ar/edit?id=one#settings").defaultPrevented, undefined);
    h.api().leaveAfterSave("/dashboard/ar");
    h.emit("pageshow");
    assert.equal(h.unload(), true);
  } finally { h.dispose(); }
});
