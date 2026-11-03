import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { format, parseISO } from "date-fns";
import { DayPicker } from "react-day-picker";
import { enUS, zhTW } from "react-day-picker/locale";
import i18next from "i18next";
import ts from "typescript";

const source = ts.createSourceFile(
  "family-settings-card.tsx",
  readFileSync(new URL("../src/app/(auth)/profile/[userId]/family-settings-card.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
const datePicker = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "DatePickerDialogField");
assert.ok(datePicker, "The family birthday picker must exist");
const datePickerCode = ts.transpileModule(`(${datePicker.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

const resources = {};
for (const language of ["en", "zh-TW"]) {
  resources[language] = {
    settings: JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/settings.json`, import.meta.url), "utf8")),
  };
}

function renderContainer({ children }) {
  return React.createElement("div", null, children);
}

for (const [language, resolvedLanguage, birthday, close, nextMonth] of [
  ["en", "en", "May 26th, 2026", "Close", "Go to the Next Month"],
  ["en-US", "en", "May 26th, 2026", "Close", "Go to the Next Month"],
  ["en-GB", "en", "May 26th, 2026", "Close", "Go to the Next Month"],
  ["zh-TW", "zh-TW", "2026年5月26日", "關閉", "前往下個月"],
  ["ja", "zh-TW", "2026年5月26日", "關閉", "前往下個月"],
]) {
  test(`family birthday picker follows the resolved UI language for ${language}`, async () => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: language, fallbackLng: "zh-TW", resources, defaultNS: "settings" });
    assert.equal(i18n.resolvedLanguage, resolvedLanguage);

    // Flatten dialog portals so the real birthday picker and calendar can render together.
    const DatePickerDialogField = runInNewContext(datePickerCode, {
      React,
      useState: React.useState,
      useTranslation: () => ({ t: i18n.t.bind(i18n), i18n }),
      format,
      parseISO,
      enUS,
      zhTW,
      Dialog: renderContainer,
      DialogTrigger: renderContainer,
      DialogContent: renderContainer,
      DialogHeader: renderContainer,
      DialogTitle: renderContainer,
      DialogFooter: renderContainer,
      DialogClose: renderContainer,
      Button: ({ children, ...props }) => React.createElement("button", props, children),
      CalendarIcon: () => null,
      Calendar: DayPicker,
    });
    const markup = renderToStaticMarkup(React.createElement(DatePickerDialogField, {
      value: "2026-05-26",
      onChange: () => {},
      label: i18n.t("family.birthdayPlaceholder"),
    }));

    assert.ok(markup.includes(`<span>${birthday}</span>`), "Birthday must use the UI language");
    assert.ok(markup.includes(`>${close}</button>`), "Close button must use the UI language");
    assert.ok(markup.includes(`aria-label="${nextMonth}"`), "Calendar navigation must use the UI language");
    assert.ok(!markup.includes("family.close"), "Close translation must resolve");
  });
}

test("localized birthday selection preserves the ISO storage format", () => {
  let onSelect;
  const updates = [];
  const DatePickerDialogField = runInNewContext(datePickerCode, {
    React,
    useState: () => [true, () => {}],
    useTranslation: () => ({ t: (key) => key, i18n: { resolvedLanguage: "zh-TW" } }),
    format,
    parseISO,
    enUS,
    zhTW,
    Dialog: renderContainer,
    DialogTrigger: renderContainer,
    DialogContent: renderContainer,
    DialogHeader: renderContainer,
    DialogTitle: renderContainer,
    DialogFooter: renderContainer,
    DialogClose: renderContainer,
    Button: renderContainer,
    CalendarIcon: () => null,
    Calendar: (props) => {
      onSelect = props.onSelect;
      return null;
    },
  });
  renderToStaticMarkup(React.createElement(DatePickerDialogField, {
    value: "",
    onChange: (value) => updates.push(value),
    label: "選擇生日",
  }));

  onSelect(undefined);
  assert.deepEqual(updates, []);
  onSelect(new Date(2026, 4, 26));
  assert.deepEqual(updates, ["2026-05-26"]);
});
