import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

let failed = false;
for (const file of [...filesIn("src/app"), ...filesIn("src/components"), ...filesIn("src/hooks")].filter((file) => /\.tsx?$/.test(file))) {
  const result = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    console.error(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    failed = true;
  }
}

function translationKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child !== null && typeof child === "object" && !Array.isArray(child) ? translationKeys(child, path) : [path];
  }).sort();
}

const enFiles = readdirSync("src/lib/i18n/locales/en").filter((name) => name.endsWith(".json")).sort();
const zhFiles = readdirSync("src/lib/i18n/locales/zh-TW").filter((name) => name.endsWith(".json")).sort();
if (JSON.stringify(enFiles) !== JSON.stringify(zhFiles)) throw new Error("Translation namespace sets differ between English and Traditional Chinese");
for (const name of enFiles) {
  const en = translationKeys(JSON.parse(readFileSync(`src/lib/i18n/locales/en/${name}`, "utf8")));
  const zh = translationKeys(JSON.parse(readFileSync(`src/lib/i18n/locales/zh-TW/${name}`, "utf8")));
  if (JSON.stringify(en) !== JSON.stringify(zh)) {
    console.error(`Translation keys differ: ${name}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("UI syntax and bilingual translation contracts passed.");
const result = spawnSync(process.execPath, ["--test", ...readdirSync("tests").filter((name) => name.endsWith(".test.mjs")).map((name) => join("tests", name))], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
