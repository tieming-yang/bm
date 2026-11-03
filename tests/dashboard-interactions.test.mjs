import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { enUS, zhTW } from "date-fns/locale";
import { loadSourceModule } from "./helpers/source-module.mjs";

const uiImports = Object.fromEntries([
  ["button", ["Button"]],
  ["card", ["Card", "CardContent", "CardDescription", "CardHeader", "CardTitle"]],
  ["input", ["Input"]],
  ["label", ["Label"]],
  ["textarea", ["Textarea"]],
  ["tabs", ["Tabs", "TabsContent", "TabsList", "TabsTrigger"]],
  ["dialog", ["Dialog", "DialogContent", "DialogDescription", "DialogFooter", "DialogHeader", "DialogTitle"]],
  ["table", ["Table", "TableBody", "TableCell", "TableHead", "TableHeader", "TableRow"]],
  ["select", ["Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue"]],
  ["confirm-dialog", ["ConfirmDialog"]],
].map(([path, names]) => [`@/components/ui/${path}`, Object.fromEntries(names.map((name) => [name, name]))]));

const commonImports = {
  ...uiImports,
  "next/navigation": { useRouter: () => ({ replace() {} }) },
  "next/link": "Link",
  "lucide-react": new Proxy({}, { get: (_, name) => name }),
  "@/app/loading": { default: "Loading", ActionSpinner: "ActionSpinner" },
  "@/app/dashboard/dashboard-error": "DashboardError",
  "@/hooks/use-auth-user": () => ({ authUser: { uid: "admin" }, isAuthUserLoading: false }),
  "@/hooks/use-translation": () => ({ t: (key) => key, currentLanguage: "en" }),
  "@/models/auth": {},
  "@/lib/policy": { Policy: { canViewAR: () => true } },
  "@tanstack/react-table": {},
  "@/utils/query-keys": {},
  "@/app/(works)/school/summer/2026/domain": { EVENT_SLUG: "summer", GRADE_OPTIONS: [] },
};

function findAll(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => findAll(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...findAll(tree.props?.children, predicate)];
}

function createDashboardHarness({ collectionsError = null } = {}) {
  const state = [];
  let cursor = 0;
  const calls = [];
  const mutations = [];
  let mutationCursor = 0;
  const collection = { id: "collection-1", title: "Creation", version: "1", items: [], targetsPath: "targets.mind" };
  const model = { id: "model-1", title: "adam", titleZh: "亞當", contentType: "character", modelPath: "adam.glb" };
  const module = loadSourceModule("src/app/dashboard/ar/page.tsx", {
    ...commonImports,
    react: {
      useEffect() {},
      useRef: () => ({ current: null }),
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
      },
    },
    sonner: { toast: { success() {}, error() {} } },
    "@tanstack/react-query": {
      useQuery({ queryKey }) {
        if (queryKey[0] === "profile-role") return { data: { role: "admin" }, refetch() {} };
        if (queryKey[0] === "admin-ar-collections") return { data: [collection], error: collectionsError, refetch() {} };
        return { data: [model], refetch() {} };
      },
      useMutation(options) {
        const index = mutationCursor++;
        mutations[index] ??= { isPending: false, mutate(id) { calls.push({ index, id }); } };
        mutations[index].options = options;
        return mutations[index];
      },
    },
  });
  return {
    calls,
    mutations,
    render() { cursor = 0; mutationCursor = 0; return module.default(); },
  };
}

test("AR deletion waits for confirmation and preserves the selected aggregate ID", () => {
  const harness = createDashboardHarness();
  let tree = harness.render();
  const deleteButtons = findAll(tree, (node) => node.type === "Button" && node.props.onClick && findAll(node.props.children, (child) => child.type === "Trash2Icon").length);
  assert.equal(deleteButtons.length, 2);
  deleteButtons[0].props.onClick();
  assert.deepEqual(harness.calls, []);
  tree = harness.render();
  let confirmation = findAll(tree, (node) => node.type === "ConfirmDialog")[0];
  assert.equal(confirmation.props.open, true);
  confirmation.props.onOpenChange(false);
  assert.deepEqual(harness.calls, []);
  tree = harness.render();
  assert.equal(findAll(tree, (node) => node.type === "ConfirmDialog")[0].props.open, false);
  deleteButtons[1].props.onClick();
  tree = harness.render();
  confirmation = findAll(tree, (node) => node.type === "ConfirmDialog")[0];
  confirmation.props.onConfirm();
  assert.deepEqual(harness.calls, [{ index: 3, id: "model-1" }]);
});

test("confirmed AR project deletion closes only after the mutation succeeds", () => {
  const harness = createDashboardHarness();
  const deleteButton = findAll(harness.render(), (node) => node.type === "Button" && node.props.onClick && findAll(node.props.children, (child) => child.type === "Trash2Icon").length)[0];
  deleteButton.props.onClick();
  findAll(harness.render(), (node) => node.type === "ConfirmDialog")[0].props.onConfirm();
  assert.deepEqual(harness.calls, [{ index: 0, id: "collection-1" }]);
  assert.equal(findAll(harness.render(), (node) => node.type === "ConfirmDialog")[0].props.open, true);
  harness.mutations[0].options.onSuccess();
  assert.equal(findAll(harness.render(), (node) => node.type === "ConfirmDialog")[0].props.open, false);
});

test("pending AR deletion cannot submit again or dismiss its confirmation", () => {
  const harness = createDashboardHarness();
  let tree = harness.render();
  const deleteButton = findAll(tree, (node) => node.type === "Button" && node.props.onClick && findAll(node.props.children, (child) => child.type === "Trash2Icon").length)[0];
  deleteButton.props.onClick();
  harness.mutations[0].isPending = true;
  tree = harness.render();
  let confirmation = findAll(tree, (node) => node.type === "ConfirmDialog")[0];
  assert.equal(confirmation.props.pending, true);
  confirmation.props.onConfirm();
  confirmation.props.onOpenChange(false);
  assert.deepEqual(harness.calls, []);
  confirmation = findAll(harness.render(), (node) => node.type === "ConfirmDialog")[0];
  assert.equal(confirmation.props.open, true);
});

test("AR model dialog disables close controls and prevents Escape/outside dismissal while saving", () => {
  const harness = createDashboardHarness();
  let tree = harness.render();
  let dialog = findAll(tree, (node) => node.type === "DialogContent")[0];
  assert.equal(dialog.props.closeDisabled, false);
  let prevented = 0;
  const event = { preventDefault() { prevented += 1; } };
  dialog.props.onEscapeKeyDown(event);
  dialog.props.onPointerDownOutside(event);
  assert.equal(prevented, 0);
  harness.mutations[1].isPending = true;
  tree = harness.render();
  dialog = findAll(tree, (node) => node.type === "DialogContent")[0];
  assert.equal(dialog.props.closeDisabled, true);
  dialog.props.onEscapeKeyDown(event);
  dialog.props.onPointerDownOutside(event);
  assert.equal(prevented, 2);
});

test("an AR collection fetch failure renders retry feedback instead of an empty collection list", () => {
  const harness = createDashboardHarness({ collectionsError: new Error("Network unavailable") });
  assert.equal(findAll(harness.render(), (node) => node.type === "DashboardError").length, 1);
});

test("AR model validation exposes local name and upload errors without a mutation", () => {
  const harness = createDashboardHarness();
  let tree = harness.render();
  const form = findAll(tree, (node) => node.type === "form")[0];
  form.props.onSubmit({ preventDefault() {}, currentTarget: { checkValidity: () => true, querySelector: () => ({ focus() {} }) } });
  assert.deepEqual(harness.calls, []);
  tree = harness.render();
  const title = findAll(tree, (node) => node.type === "Input" && node.props.id === "mod-title")[0];
  assert.equal(title.props["aria-invalid"], true);
  assert.equal(title.props["aria-describedby"], "mod-title-error");
  assert.equal(findAll(tree, (node) => node.props?.id === "mod-title-error")[0].props.children, "ar.nameRequired");
  const upload = findAll(tree, (node) => node.props?.id === "mod-file-upload")[0];
  assert.equal(upload.props.error, "ar.modelRequired");
  const uploadControl = findAll(upload.type(upload.props), (node) => node.type === "Button" && node.props.id === "mod-file-upload")[0];
  assert.equal(uploadControl.props["aria-invalid"], true);
  assert.equal(uploadControl.props["aria-describedby"], "mod-file-upload-error");
});

test("AR model form retains native required rules and submits valid values once", () => {
  const harness = createDashboardHarness();
  let tree = harness.render();
  const title = findAll(tree, (node) => node.type === "Input" && node.props.id === "mod-title")[0];
  const chineseTitle = findAll(tree, (node) => node.type === "Input" && node.props.id === "mod-title-zh")[0];
  assert.equal(title.props.required, true);
  assert.equal(chineseTitle.props.required, true);
  title.props.onChange({ target: { value: "adam" } });
  chineseTitle.props.onChange({ target: { value: "亞當", validity: { valid: true } } });
  findAll(tree, (node) => node.props?.id === "mod-file-upload")[0].props.onChange("adam.glb");
  tree = harness.render();
  const submit = () => findAll(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: { checkValidity: () => true } });
  submit();
  assert.deepEqual(harness.calls, [{ index: 1, id: { contentType: "character", title: "adam", titleZh: "亞當", modelPath: "adam.glb" } }]);
  harness.mutations[1].isPending = true;
  tree = harness.render();
  submit();
  assert.equal(harness.calls.length, 1);
});

test("school table formats birthdays and submitted dates using the selected UI locale", () => {
  const path = "src/app/dashboard/summer-school/page.tsx";
  const { getColumns } = loadSourceModule(path, {
    ...commonImports,
    "@tanstack/react-query": {},
  }, `${readFileSync(path, "utf8")}\nexport { getColumns };`);
  const t = (key) => key;
  const row = { original: { birthday: "2020-02-03", submittedAt: "2026-06-15T09:30:00Z", grade: "kinder" } };
  const english = getColumns(t, t, t, enUS);
  const chinese = getColumns(t, t, t, zhTW);
  const birthday = (columns) => columns.find((column) => column.accessorKey === "birthday").cell({ row });
  const submitted = (columns) => columns.find((column) => column.accessorKey === "submittedAt").cell({ row });
  assert.match(birthday(english), /February/);
  assert.match(birthday(chinese), /2月/);
  assert.notEqual(submitted(english), submitted(chinese));
  assert.equal(english.find((column) => column.accessorKey === "grade").cell({ row }), "grades.kinder");
});
