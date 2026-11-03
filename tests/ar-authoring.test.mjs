import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadSourceModule } from "./helpers/source-module.mjs";

const authoring = loadSourceModule("src/lib/ar/authoring.ts");
const project = () => ({ id: "project-1", title: "Creation", description: "", version: "1.0", targetsPath: "/creation.mind", items: [
  { modelId: "adam", title: "adam", titleZh: "亞當", modelPath: "/adam.glb", audioPath: "/old.mp3" },
  { modelId: "eve", title: "eve", titleZh: "夏娃", modelPath: "/eve.glb" },
] });
const models = [{ id: "adam", contentType: "character", title: "adam", titleZh: "亞當", modelPath: "/adam.glb" }, { id: "eve", contentType: "character", title: "eve", titleZh: "夏娃", modelPath: "/eve.glb" }, { id: "noah", contentType: "character", title: "noah", titleZh: "挪亞", modelPath: "/noah.glb" }];

function findAll(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => findAll(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...findAll(tree.props?.children, predicate)];
}

function hooksHarness() {
  const slots = [];
  let cursor = 0;
  let changed = false;
  let effects = [];
  const react = {
    useRef(value) { const i = cursor++; slots[i] ??= { current: value }; return slots[i]; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === "function" ? value() : value;
      return [slots[i], (next) => {
        const result = typeof next === "function" ? next(slots[i]) : next;
        if (!Object.is(result, slots[i])) { slots[i] = result; changed = true; }
      }];
    },
    useMemo(callback, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, j) => !Object.is(dep, slots[i].deps[j]))) slots[i] = { deps, value: callback() };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(callback, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, j) => !Object.is(dep, slots[i].deps[j]))) effects.push(() => {
        slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: callback() };
      });
    },
  };
  return { react, render(component) {
    for (let pass = 0; pass < 25; pass++) {
      cursor = 0; changed = false; effects = [];
      const tree = component();
      for (const effect of effects) effect();
      if (!changed) return tree;
    }
    throw new Error("Authoring component did not settle");
  }, dispose() { for (const slot of slots) slot?.cleanup?.(); } };
}

const ui = Object.fromEntries([
  ["button", ["Button"]], ["card", ["Card", "CardContent", "CardDescription", "CardHeader", "CardTitle"]],
  ["input", ["Input"]], ["label", ["Label"]], ["textarea", ["Textarea"]],
  ["tabs", ["Tabs", "TabsContent", "TabsList", "TabsTrigger"]],
  ["dialog", ["Dialog", "DialogContent", "DialogDescription", "DialogFooter", "DialogHeader", "DialogTitle"]],
  ["table", ["Table", "TableBody", "TableCell", "TableHead", "TableHeader", "TableRow"]],
  ["select", ["Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue"]],
  ["confirm-dialog", ["ConfirmDialog"]],
].map(([path, names]) => [`@/components/ui/${path}`, Object.fromEntries(names.map((name) => [name, name]))]));

function pageHarness({ editing = true, collection = project(), hub = false } = {}) {
  const hooks = hooksHarness();
  const calls = [];
  const mutations = [];
  const focus = [];
  let mutationCursor = 0;
  let canonical = collection;
  let guard = {};
  let discardAction;
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = { addEventListener() {}, removeEventListener() {}, location: { replace() {} } };
  globalThis.document = { getElementById: (id) => ({ focus: () => focus.push(id) }) };
  const path = hub ? "src/app/dashboard/ar/page.tsx" : "src/app/dashboard/ar/edit/page.tsx";
  const module = loadSourceModule(path, {
    ...ui, react: hooks.react,
    "next/navigation": { useSearchParams: () => new URLSearchParams(editing ? "id=project-1" : "") },
    "next/link": "Link",
    "lucide-react": new Proxy({}, { get: (_, name) => name }),
    sonner: { toast: { success() {}, error() {} } },
    "@/app/loading": { default: "Loading", ActionSpinner: "ActionSpinner" },
    "@/app/dashboard/dashboard-error": "DashboardError",
    "@/hooks/use-auth-user": () => ({ authUser: { uid: "admin" }, isAuthUserLoading: false }),
    "@/hooks/use-translation": () => ({ t: (key) => key, currentLanguage: "en" }),
    "@/models/auth": {}, "@/lib/policy": { Policy: { canViewAR: () => true } },
    "@/lib/ar/authoring": authoring,
    "@/components/ar-authoring-upload": { ARAuthoringUpload: "ARAuthoringUpload" },
    "@/components/unsaved-changes-provider": {
      useUnsavedChanges: (state) => { guard = state; },
      useUnsavedNavigation: () => ({ leaveAfterSave: (href) => calls.push({ leave: href }), requestDiscard: (action) => {
        if (guard.busy) return;
        if (guard.dirty) discardAction = action;
        else action();
      } }),
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
      useQuery({ queryKey }) {
        const data = queryKey[0] === "profile-role" ? { role: "admin" } : queryKey[0] === "admin-ar-models" ? models : queryKey[0] === "admin-ar-collections" ? [canonical] : canonical;
        return { data, refetch() {} };
      },
      useMutation(options) {
        const i = mutationCursor++;
        mutations[i] ??= { isPending: false, mutate(data) { calls.push({ index: i, data }); this.isPending = true; } };
        mutations[i].options = options;
        return mutations[i];
      },
    },
  }, hub ? readFileSync(path, "utf8") : `${readFileSync(path, "utf8")}\nexport { ArEditPageContent };`);
  let tree;
  return {
    calls, focus, mutations,
    guard: () => guard,
    render() { tree = hooks.render(() => { mutationCursor = 0; return hub ? module.default() : module.ArEditPageContent(); }); return tree; },
    find(predicate) { return findAll(tree, predicate); },
    field(id) { return findAll(tree, (node) => node.props?.id === id)[0]; },
    refetch(next) { canonical = next; },
    discard() { discardAction?.(); },
    dispose() { hooks.dispose(); Object.assign(globalThis, previous); },
  };
}

test("media results follow stable character IDs after reorder and never revive removed characters", () => {
  const original = authoring.projectFormValue(project());
  const moved = { ...original, items: [...original.items].reverse() };
  const changed = authoring.applyItemMedia(moved, "adam", "audioPath", "/new.mp3");
  assert.equal(changed.items[0].modelId, "eve");
  assert.equal(changed.items[0].audioPath, "");
  assert.equal(changed.items[1].audioPath, "/new.mp3");
  assert.equal(original.items[0].audioPath, "/old.mp3");
  const removed = { ...original, items: original.items.slice(1) };
  assert.equal(authoring.applyItemMedia(removed, "adam", "audioPath", "/new.mp3"), removed);
});

test("collapsed project settings cannot bypass required validation and invalid submit focuses the reopened field", () => {
  const h = pageHarness({ collection: { ...project(), title: "" } });
  try {
    h.render();
    h.find((node) => node.type === "Button" && node.props["aria-controls"] === "ar-project-settings")[0].props.onClick();
    h.render();
    assert.equal(h.field("col-title"), undefined);
    h.find((node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    h.render();
    assert.equal(h.calls.length, 0);
    assert.equal(h.field("col-title").props["aria-invalid"], true);
    assert.equal(h.focus.at(-1), "col-title");
  } finally { h.dispose(); }
});

test("project refetches preserve unsaved edits; immediate uploads advance only their saved field", () => {
  const h = pageHarness();
  try {
    h.render();
    assert.equal(h.guard().dirty, false);
    h.field("col-description").props.onChange({ target: { value: "My draft" } });
    h.render();
    h.refetch({ ...project(), title: "Remote title" });
    h.render();
    assert.equal(h.field("col-description").props.value, "My draft");
    assert.equal(h.field("col-title").props.value, "Creation");
    h.field("col-targets-upload").props.onChange({ kind: "upload", path: "/new.mind", persisted: true, attempt: "target:1" });
    h.render();
    assert.equal(h.guard().dirty, true);
    h.field("col-description").props.onChange({ target: { value: "" } });
    h.render();
    assert.equal(h.guard().dirty, false);
    h.field("col-targets-upload").props.onChange({ kind: "clear", path: "" });
    h.render();
    assert.equal(h.guard().dirty, true);
  } finally { h.dispose(); }
});

test("new characters in saved projects require Save before media; new project precreate uploads stay available", () => {
  const h = pageHarness();
  try {
    h.render();
    h.find((node) => node.type === "Select")[0].props.onValueChange("noah");
    h.render();
    h.find((node) => node.type === "Button" && findAll(node, (child) => child.type === "PlusIcon").length)[0].props.onClick();
    h.render();
    const uploads = h.find((node) => node.type === "ARAuthoringUpload" && node.props.uploadKey.includes(":noah:"));
    assert.equal(uploads.length, 3);
    assert.equal(uploads.every((node) => node.props.disabled), true);
    assert.equal(h.find((node) => node.type === "p" && node.props.children === "ar.saveBeforeMedia").length, 1);
  } finally { h.dispose(); }
  const fresh = pageHarness({ editing: false });
  try {
    fresh.render();
    assert.equal(fresh.field("col-targets-upload").props.disabled, false);
    assert.equal(fresh.field("col-targets-upload").props.uploadPersistence, undefined);
  } finally { fresh.dispose(); }
});

test("upload/save serialization blocks structural edits and repeat submits without losing failed drafts", () => {
  const h = pageHarness();
  try {
    h.render();
    const upload = h.find((node) => node.type === "ARAuthoringUpload" && node.props.uploadKey.endsWith(":adam:audioPath"))[0];
    assert.equal(upload.props.onUploadStart(), true);
    assert.equal(upload.props.onUploadStart(), false);
    h.find((node) => node.type === "Button" && node.props["aria-label"] === "ar.remove")[0].props.onClick();
    h.find((node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    h.render();
    assert.equal(h.calls.length, 0);
    assert.equal(h.guard().busy, true);
    upload.props.onChange({ kind: "upload", path: "/new.mp3", persisted: true, attempt: "adam:1" });
    upload.props.onUploadEnd();
    h.render();
    assert.equal(h.find((node) => node.type === "ARAuthoringUpload" && node.props.uploadKey.endsWith(":adam:audioPath"))[0].props.value, "/new.mp3");
    const form = h.find((node) => node.type === "form")[0];
    form.props.onSubmit({ preventDefault() {} });
    form.props.onSubmit({ preventDefault() {} });
    assert.equal(h.calls.length, 1);
    h.mutations[1].isPending = false;
    const previousError = console.error; console.error = () => {};
    try { h.mutations[1].options.onError(new Error("Offline")); } finally { console.error = previousError; }
    h.render();
    assert.equal(h.field("col-title").props.value, "Creation");
    assert.equal(h.guard().busy, false);
    h.find((node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    assert.equal(h.calls.length, 2);
  } finally { h.dispose(); }
});

test("model Close warns only for unsaved details, while uploaded replacements remain saved", () => {
  const h = pageHarness({ hub: true });
  try {
    h.render();
    h.find((node) => node.type === "Button" && node.props.onClick && findAll(node, (child) => child.type === "EditIcon").length)[0].props.onClick();
    h.render();
    assert.equal(h.guard().dirty, false);
    h.field("mod-file-upload").props.onChange({ kind: "upload", path: "/replacement.glb", persisted: true, attempt: "adam:1" });
    h.render();
    assert.equal(h.guard().dirty, false);
    h.field("mod-title").props.onChange({ target: { value: "renamed" } });
    h.render();
    assert.equal(h.guard().dirty, true);
    h.find((node) => node.type === "Dialog")[0].props.onOpenChange(false);
    h.render();
    assert.equal(h.find((node) => node.type === "Dialog")[0].props.open, true);
    h.discard();
    h.render();
    assert.equal(h.find((node) => node.type === "Dialog")[0].props.open, false);
  } finally { h.dispose(); }
});

function uploadHarness() {
  const hooks = hooksHarness();
  const requests = [];
  const changes = [];
  const toasts = [];
  const previous = { fetch: globalThis.fetch, error: console.error };
  let resolve;
  let locked = false;
  let finishes = 0;
  let key = "project:one:adam:audioPath";
  globalThis.fetch = async (_url, input) => {
    requests.push(input);
    return new Promise((done) => { resolve = done; });
  };
  console.error = () => {};
  const { ARAuthoringUpload } = loadSourceModule("src/components/ar-authoring-upload.tsx", {
    react: hooks.react, ...ui,
    sonner: { toast: {
      loading: () => "upload-toast",
      success: (message) => toasts.push(["success", message]),
      error: (message) => toasts.push(["error", message]),
      dismiss: (id) => toasts.push(["dismiss", id]),
    } },
    "lucide-react": { UploadIcon: "UploadIcon" },
    "@/app/loading": { ActionSpinner: "ActionSpinner" },
    "@/hooks/use-translation": () => ({ t: (message) => message }),
    "@/models/auth": { user: { getIdToken: async () => "test-token" } },
  });
  let tree;
  const render = () => {
    tree = hooks.render(() => ARAuthoringUpload({
      id: "upload", accept: ".mp3", type: "audio", label: "Audio", value: "/old.mp3", folder: "adam", uploadKey: key,
      uploadPersistence: { collectionId: "one", modelId: "adam", field: "audioPath" },
      onChange: (change) => changes.push(change),
      onUploadStart() { if (locked) return false; locked = true; return true; },
      onUploadEnd() { locked = false; finishes += 1; },
    }));
    return tree;
  };
  render();
  return {
    requests, changes, toasts, render,
    finishes: () => finishes,
    retarget(value) { key = value; render(); },
    start() {
      const input = findAll(tree, (node) => node.type === "Input")[0];
      return input.props.onChange({ target: { files: [new File(["audio"], "intro.mp3", { type: "audio/mpeg" })], value: "intro.mp3" } });
    },
    complete(data, status = 200) { resolve({ ok: status === 200, status, json: async () => data }); },
    errors() { return findAll(tree, (node) => node.props?.role === "alert"); },
    unmount() { hooks.dispose(); },
    dispose() { hooks.dispose(); globalThis.fetch = previous.fetch; console.error = previous.error; },
  };
}

test("uploads retain their record/field identity and retry after a failed request with persistent feedback", async () => {
  const h = uploadHarness();
  try {
    const failed = h.start();
    await Promise.resolve();
    assert.equal(h.requests[0].body.get("collectionId"), "one");
    assert.equal(h.requests[0].body.get("modelId"), "adam");
    assert.equal(h.requests[0].body.get("field"), "audioPath");
    h.complete({}, 503);
    await failed;
    h.render();
    assert.equal(h.changes.length, 0);
    assert.equal(h.errors()[0].props.children, "upload.failed");
    const retry = h.start();
    await Promise.resolve();
    h.complete({ path: "/new.mp3", persisted: true });
    await retry;
    h.render();
    assert.deepEqual(h.changes, [{ kind: "upload", path: "/new.mp3", persisted: true, attempt: "project:one:adam:audioPath:2" }]);
    assert.equal(h.errors().length, 0);
    assert.equal(h.finishes(), 2);
  } finally { h.dispose(); }
});

test("obsolete upload attempts and unmounted uploaders cannot apply late success callbacks", async () => {
  const h = uploadHarness();
  try {
    const pending = h.start();
    await Promise.resolve();
    h.retarget("project:two:eve:audioPath");
    h.complete({ path: "/late.mp3", persisted: true });
    await pending;
    assert.deepEqual(h.changes, []);
    assert.equal(h.toasts.some(([kind]) => kind === "success"), false);
    assert.equal(h.finishes(), 1);
  } finally { h.dispose(); }
  const unmounted = uploadHarness();
  try {
    const pending = unmounted.start();
    await Promise.resolve();
    unmounted.unmount();
    unmounted.complete({ path: "/late.mp3", persisted: true });
    await pending;
    assert.deepEqual(unmounted.changes, []);
    assert.equal(unmounted.finishes(), 1);
  } finally { unmounted.dispose(); }
});

test("malformed upload responses fail without changing a saved path", async () => {
  const h = uploadHarness();
  try {
    const pending = h.start();
    await Promise.resolve();
    h.complete({ path: 42, persisted: true });
    await pending;
    h.render();
    assert.deepEqual(h.changes, []);
    assert.equal(h.errors().length, 1);
    assert.equal(h.finishes(), 1);
  } finally { h.dispose(); }
});
