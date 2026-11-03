import assert from "node:assert/strict";
import test from "node:test";
import * as v from "valibot";
import { loadSourceModule } from "./helpers/source-module.mjs";

function find(element, predicate) {
  if (!element || typeof element !== "object") return undefined;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat()) {
    const match = find(child, predicate);
    if (match) return match;
  }
}
function resetDialog(initialEmail, request) {
  const slots = [];
  const closed = [];
  let cursor = 0;
  const { PasswordResetDialog } = loadSourceModule("src/components/password-reset-dialog.tsx", {
    react: {
      useState: (initial) => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value) => { slots[index] = value; }]; },
      useRef: (initial) => { const index = cursor++; return slots[index] ??= { current: initial }; },
    },
    "@/models/auth": { default: { requestPasswordReset: request }, PasswordResetInputSchema: v.object({ email: v.pipe(v.string(), v.trim(), v.email()) }), __esModule: true },
    "@/hooks/use-translation": () => ({ t: (key) => key, currentLanguage: "zh-TW" }),
    "@/components/ui/dialog": { Dialog: "dialog", DialogContent: "content", DialogDescription: "description", DialogHeader: "header", DialogTitle: "title" },
    "@/components/ui/button": { Button: "button" }, "@/components/ui/input": { Input: "input" }, "@/components/ui/label": { Label: "label" },
    "@/app/loading": { ActionSpinner: "spinner" },
  });
  return { closed, render: () => { cursor = 0; return PasswordResetDialog({ open: true, initialEmail, onOpenChange: (open) => closed.push(open) }); } };
}

test("reset dialog validates blur and submit, associates its error, and focuses invalid email", async () => {
  let requests = 0;
  let focused = false;
  const h = resetDialog("invalid", async () => { requests++; return { kind: "sent" }; });
  let tree = h.render();
  find(tree, (node) => node.type === "input").props.onBlur();
  tree = h.render();
  const input = find(tree, (node) => node.type === "input");
  assert.equal(input.props["aria-invalid"], true);
  assert.equal(input.props["aria-describedby"], "reset-email-error");
  input.props.ref.current = { focus: () => { focused = true; } };
  await find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(focused, true);
  assert.equal(requests, 0);
  input.props.onChange({ target: { value: "owner@example.test" } });
  assert.equal(find(h.render(), (node) => node.type === "input").props["aria-invalid"], false);
});

test("reset dialog locks repeat submissions and provides neutral completion with a return control", async () => {
  let finish;
  const requests = [];
  const h = resetDialog("owner@example.test", (email, language) => { requests.push({ email, language }); return new Promise((resolve) => { finish = resolve; }); });
  const form = find(h.render(), (node) => node.type === "form");
  const pending = form.props.onSubmit({ preventDefault() {} });
  await form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(requests, [{ email: "owner@example.test", language: "zh-TW" }]);
  assert.equal(find(h.render(), (node) => node.type === "input").props.disabled, true);
  finish({ kind: "sent" });
  await pending;
  const tree = h.render();
  assert.equal(find(tree, (node) => node.props?.role === "status").props.children, "reset.sent");
  find(tree, (node) => node.type === "button").props.onClick();
  assert.deepEqual(h.closed, [false]);
});

test("reset failure retains entered email and keeps retry and cancel available", async () => {
  const h = resetDialog("owner@example.test", async () => ({ kind: "unavailable" }));
  await find(h.render(), (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  const tree = h.render();
  assert.equal(find(tree, (node) => node.type === "input").props.value, "owner@example.test");
  assert.equal(find(tree, (node) => node.props?.role === "alert").props.children, "reset.unavailable");
  assert.equal(find(tree, (node) => node.type === "button" && node.props.type === "submit").props.disabled, false);
  find(tree, (node) => node.type === "button" && node.props.type === "button").props.onClick();
  assert.deepEqual(h.closed, [false]);
});
