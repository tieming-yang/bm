import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Run the actual route/contracts with only their external effects replaced.
export function loadSourceModule(path, imports = {}, source = readFileSync(path, "utf8")) {
  const code = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
  });
  const errors = (code.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  }));
  const module = { exports: {} };
  const localRequire = (name) => Object.hasOwn(imports, name) ? imports[name] : require(name);
  new Function("require", "module", "exports", code.outputText)(localRequire, module, module.exports);
  return module.exports;
}
