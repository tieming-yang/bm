#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const CLI_VERSION = "1.1.0";
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp"]);

type CollisionMode = "error" | "rename";

type CliOptions = {
  inputs: string[];
  outputDir: string | null;
  recursive: boolean;
  bundleDirectories: boolean;
  overwrite: boolean;
  verbose: boolean;
  failFast: boolean;
  collision: CollisionMode;
  help: boolean;
  version: boolean;
};

type InputFile = {
  absolutePath: string;
  displayPath: string;
  stem: string;
};

type InputBatch = {
  kind: "file" | "directory";
  absolutePath: string;
  displayPath: string;
  stem: string;
  files: InputFile[];
};

type PlannedOutput = {
  inputs: InputFile[];
  sourceDisplayPath: string;
  label: string;
  outputPath: string;
};

type CompileRuntime = {
  OfflineCompiler: new () => {
    compileImageTargets(
      images: unknown[],
      progressCallback: (percent: number) => void
    ): Promise<unknown>;
    exportData(): Uint8Array;
  };
  loadImage: (source: string) => Promise<unknown>;
  tf: {
    ready?: () => Promise<void>;
    setBackend?: (backend: string) => Promise<boolean>;
    getBackend?: () => string;
  };
};

type CompileFailure = {
  input: string;
  reason: string;
};

function printHelp() {
  console.log(`MindAR target compiler

Generate .mind files from source images using MindAR's offline compiler.

Usage:
  node src/lib/ar/compile-mind.ts [options] <image-or-directory>...

Required:
  -o, --output <dir>         Output directory for generated .mind files

Input options:
  -i, --input <path>         Repeatable input file or directory
  -r, --recursive            Recurse into input directories
      --bundle-directories   Compile each input directory into one .mind file

Output options:
      --collision <mode>     Collision strategy: error | rename (default: error)
      --overwrite            Replace existing .mind files

Behavior:
      --fail-fast            Stop after the first compile failure
  -v, --verbose              Print per-file progress and backend details
  -h, --help                 Show this help
      --version              Print CLI version

Supported image extensions:
  .jpg .jpeg .png .webp .bmp

Examples:
  node src/lib/ar/compile-mind.ts -o public/ar/targets public/targets/adam.png
  node src/lib/ar/compile-mind.ts -o public/ar/targets -i public/targets/adam.png -i public/targets/eve.png
  node src/lib/ar/compile-mind.ts -o public/ar/targets -r public/targets
  node src/lib/ar/compile-mind.ts -o public/ar/targets --bundle-directories public/targets/team
  node src/lib/ar/compile-mind.ts -o public/ar/targets --collision rename --overwrite public/targets

Notes:
  - By default, each input image becomes its own .mind file.
  - With --bundle-directories, each input directory becomes one .mind file that contains one target per image.
  - Output filenames default to <image-stem>.mind for files and <directory-name>.mind for bundled directories.
  - If MindAR's native canvas binding is missing on this machine, rebuild it first:
      pnpm rebuild canvas
    or:
      npm rebuild canvas
`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    inputs: [],
    outputDir: null,
    recursive: false,
    bundleDirectories: false,
    overwrite: false,
    verbose: false,
    failFast: false,
    collision: "error",
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--version") {
      options.version = true;
      continue;
    }

    if (arg === "-r" || arg === "--recursive") {
      options.recursive = true;
      continue;
    }

    if (arg === "--bundle-directories") {
      options.bundleDirectories = true;
      continue;
    }

    if (arg === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (arg === "-v" || arg === "--verbose") {
      options.verbose = true;
      continue;
    }

    if (arg === "--fail-fast") {
      options.failFast = true;
      continue;
    }

    if (arg === "-i" || arg === "--input") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${arg} requires a path value`);
      }
      options.inputs.push(value);
      index += 1;
      continue;
    }

    if (arg === "-o" || arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${arg} requires a directory value`);
      }
      options.outputDir = value;
      index += 1;
      continue;
    }

    if (arg === "--collision") {
      const value = argv[index + 1];
      if (!value || (value !== "error" && value !== "rename")) {
        throw new Error(`--collision must be one of: error, rename`);
      }
      options.collision = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    options.inputs.push(arg);
  }

  return options;
}

function getImportMetaResolve(): ((specifier: string) => string) | undefined {
  const meta = import.meta as ImportMeta & {
    resolve?: (specifier: string) => string;
  };
  return typeof meta.resolve === "function" ? meta.resolve.bind(meta) : undefined;
}

function createCanvasBindingError(originalError: unknown): Error {
  const details = originalError instanceof Error ? originalError.message : String(originalError);

  return new Error(
    [
      "MindAR's offline compiler could not load the native `canvas` binding.",
      "This repo already has the dependency in MindAR's tree, but the binary is not available on this machine.",
      "",
      "Run one of the following, then rerun this CLI:",
      "  pnpm rebuild canvas",
      "  npm rebuild canvas",
      "",
      `Original error: ${details}`,
    ].join("\n")
  );
}

async function loadCompileRuntime(): Promise<CompileRuntime> {
  const resolve = getImportMetaResolve();

  if (!resolve) {
    throw new Error("Node import.meta.resolve is required to load MindAR's offline compiler.");
  }

  const offlineCompilerUrl = resolve("mind-ar/src/image-target/offline-compiler.js");
  const requireFromMindAr = createRequire(offlineCompilerUrl);

  let canvasModule: { loadImage: (source: string) => Promise<unknown> };
  try {
    canvasModule = requireFromMindAr("canvas");
  } catch (error) {
    throw createCanvasBindingError(error);
  }

  const tf = requireFromMindAr("@tensorflow/tfjs") as CompileRuntime["tf"];
  if (typeof tf.ready === "function") {
    await tf.ready();
  }
  if (typeof tf.setBackend === "function") {
    await tf.setBackend("cpu");
  }

  let compilerModule: { OfflineCompiler: CompileRuntime["OfflineCompiler"] };
  try {
    compilerModule = await import(offlineCompilerUrl);
  } catch (error) {
    throw createCanvasBindingError(error);
  }

  return {
    OfflineCompiler: compilerModule.OfflineCompiler,
    loadImage: canvasModule.loadImage,
    tf,
  };
}

function isSupportedImageFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function collectDirectoryImages(
  directoryPath: string,
  recursive: boolean
): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        const nested = await collectDirectoryImages(absolutePath, true);
        collected.push(...nested);
      }
      continue;
    }

    if (entry.isFile() && isSupportedImageFile(entry.name)) {
      collected.push(absolutePath);
    }
  }

  return collected;
}

function createInputFile(absolutePath: string): InputFile {
  return {
    absolutePath,
    displayPath: path.relative(process.cwd(), absolutePath) || path.basename(absolutePath),
    stem: path.parse(absolutePath).name,
  };
}

async function collectInputs(options: CliOptions): Promise<InputBatch[]> {
  const absoluteInputs = options.inputs.map((inputPath) => path.resolve(process.cwd(), inputPath));
  const batches = new Map<string, InputBatch>();

  for (const absoluteInput of absoluteInputs) {
    let stats;
    try {
      stats = await fs.stat(absoluteInput);
    } catch {
      throw new Error(`Input path does not exist: ${absoluteInput}`);
    }

    if (stats.isDirectory()) {
      const images = await collectDirectoryImages(absoluteInput, options.recursive);
      if (images.length === 0) {
        throw new Error(`No supported image files found in directory: ${absoluteInput}`);
      }

      const files = images
        .map((imagePath) => createInputFile(path.resolve(imagePath)))
        .sort((left, right) => left.displayPath.localeCompare(right.displayPath));
      console.debug("🔎", { files });
      batches.set(absoluteInput, {
        kind: "directory",
        absolutePath: absoluteInput,
        displayPath: path.relative(process.cwd(), absoluteInput) || path.basename(absoluteInput),
        stem: path.basename(absoluteInput),
        files,
      });
      continue;
    }

    if (!stats.isFile()) {
      throw new Error(`Input path is not a file or directory: ${absoluteInput}`);
    }

    if (!isSupportedImageFile(absoluteInput)) {
      throw new Error(
        `Unsupported image file extension: ${absoluteInput} (supported: ${[
          ...SUPPORTED_EXTENSIONS,
        ].join(", ")})`
      );
    }

    batches.set(absoluteInput, {
      kind: "file",
      absolutePath: absoluteInput,
      displayPath: path.relative(process.cwd(), absoluteInput) || path.basename(absoluteInput),
      stem: path.parse(absoluteInput).name,
      files: [createInputFile(absoluteInput)],
    });
  }

  return [...batches.values()].sort((left, right) =>
    left.displayPath.localeCompare(right.displayPath)
  );
}

function planOutputs(inputs: InputBatch[], options: CliOptions): PlannedOutput[] {
  const outputDir = path.resolve(process.cwd(), options.outputDir ?? "");
  const usedPaths = new Map<string, string>();
  const nextSuffixByStem = new Map<string, number>();
  const compileJobs: Array<{
    inputs: InputFile[];
    sourceDisplayPath: string;
    label: string;
    stem: string;
  }> = [];
  const planned: PlannedOutput[] = [];

  for (const input of inputs) {
    if (input.kind === "directory" && !options.bundleDirectories) {
      for (const file of input.files) {
        compileJobs.push({
          inputs: [file],
          sourceDisplayPath: file.displayPath,
          label: file.displayPath,
          stem: file.stem,
        });
      }
      continue;
    }

    const imageCount = input.files.length;
    const label =
      input.kind === "directory"
        ? `${input.displayPath} (${imageCount} image${imageCount === 1 ? "" : "s"})`
        : input.displayPath;

    compileJobs.push({
      inputs: input.files,
      sourceDisplayPath: input.displayPath,
      label,
      stem: input.stem,
    });
  }

  for (const compileJob of compileJobs) {
    let candidateName = `${compileJob.stem}.mind`;
    let candidatePath = path.join(outputDir, candidateName);

    if (options.collision === "rename") {
      const seen = nextSuffixByStem.get(compileJob.stem) ?? 0;
      let nextIndex = seen;
      while (usedPaths.has(candidatePath)) {
        nextIndex += 1;
        candidateName = `${compileJob.stem}-${nextIndex + 1}.mind`;
        candidatePath = path.join(outputDir, candidateName);
      }
      nextSuffixByStem.set(compileJob.stem, nextIndex);
    } else {
      const existingSource = usedPaths.get(candidatePath);
      if (existingSource && existingSource !== compileJob.sourceDisplayPath) {
        throw new Error(
          [
            `Output filename collision for ${candidateName}.`,
            `  ${existingSource}`,
            `  ${compileJob.sourceDisplayPath}`,
            `Use --collision rename to auto-rename colliding outputs.`,
          ].join("\n")
        );
      }
    }

    usedPaths.set(candidatePath, compileJob.sourceDisplayPath);
    planned.push({
      inputs: compileJob.inputs,
      sourceDisplayPath: compileJob.sourceDisplayPath,
      label: compileJob.label,
      outputPath: candidatePath,
    });
  }

  return planned;
}

async function ensureWritableOutputs(
  plannedOutputs: PlannedOutput[],
  options: CliOptions
): Promise<void> {
  const conflicts: string[] = [];

  for (const output of plannedOutputs) {
    try {
      const stats = await fs.stat(output.outputPath);
      if (stats.isFile() && !options.overwrite) {
        conflicts.push(path.relative(process.cwd(), output.outputPath));
      }
    } catch {
      // file does not exist, which is fine
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      [
        "Refusing to overwrite existing .mind files without --overwrite:",
        ...conflicts.map((item) => `  ${item}`),
      ].join("\n")
    );
  }
}

function renderProgress(
  itemIndex: number,
  totalItems: number,
  label: string,
  percent: number
): void {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const prefix = `[${itemIndex}/${totalItems}]`;
  if (process.stdout.isTTY) {
    process.stdout.write(`\r${prefix} ${label}: ${clamped}%`);
  } else {
    console.log(`${prefix} ${label}: ${clamped}%`);
  }
}

function clearProgressLine(): void {
  if (!process.stdout.isTTY) {
    return;
  }
  process.stdout.write("\r");
  process.stdout.write(" ".repeat(process.stdout.columns || 120));
  process.stdout.write("\r");
}

async function compileOneTarget(
  runtime: CompileRuntime,
  plannedOutput: PlannedOutput,
  itemIndex: number,
  totalItems: number,
  options: CliOptions
): Promise<void> {
  const compiler = new runtime.OfflineCompiler();
  const images = [];
  for (const input of plannedOutput.inputs) {
    images.push(await runtime.loadImage(input.absolutePath));
  }

  if (options.verbose && typeof runtime.tf.getBackend === "function") {
    console.log(
      `[${itemIndex}/${totalItems}] backend=${runtime.tf.getBackend()} source=${plannedOutput.sourceDisplayPath} images=${plannedOutput.inputs.length}`
    );
  }

  await compiler.compileImageTargets(images, (percent) => {
    if (options.verbose) {
      renderProgress(itemIndex, totalItems, plannedOutput.label, percent);
    }
  });

  if (options.verbose) {
    clearProgressLine();
  }

  const outputBuffer = compiler.exportData();
  await fs.mkdir(path.dirname(plannedOutput.outputPath), { recursive: true });
  await fs.writeFile(plannedOutput.outputPath, Buffer.from(outputBuffer));

  const outputDisplayPath =
    path.relative(process.cwd(), plannedOutput.outputPath) ||
    path.basename(plannedOutput.outputPath);
  const targetCount = plannedOutput.inputs.length;

  console.log(
    `[${itemIndex}/${totalItems}] wrote ${outputDisplayPath} (${targetCount} target${
      targetCount === 1 ? "" : "s"
    })`
  );

  if (targetCount > 1) {
    for (const [targetIndex, input] of plannedOutput.inputs.entries()) {
      console.log(`  [${targetIndex}] ${input.displayPath}`);
    }
  }
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.version) {
    console.log(CLI_VERSION);
    return;
  }

  if (!options.outputDir) {
    throw new Error(`Missing required --output <dir>`);
  }

  if (options.inputs.length === 0) {
    throw new Error(`At least one image or directory input is required`);
  }

  const inputBatches = await collectInputs(options);
  console.debug("🔎", { inputBatches });
  const plannedOutputs = planOutputs(inputBatches, options);
  await fs.mkdir(path.resolve(process.cwd(), options.outputDir), { recursive: true });
  await ensureWritableOutputs(plannedOutputs, options);

  const runtime = await loadCompileRuntime();
  const failures: CompileFailure[] = [];

  for (let index = 0; index < plannedOutputs.length; index += 1) {
    const plannedOutput = plannedOutputs[index];
    try {
      await compileOneTarget(runtime, plannedOutput, index + 1, plannedOutputs.length, options);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push({
        input: plannedOutput.label,
        reason,
      });

      console.error(`[${index + 1}/${plannedOutputs.length}] failed ${plannedOutput.label}`);
      console.error(reason);

      if (options.failFast) {
        break;
      }
    }
  }

  if (failures.length > 0) {
    const summary = failures.map((failure) => `  ${failure.input}: ${failure.reason}`).join("\n");
    throw new Error(
      [`Compilation finished with ${failures.length} failure(s).`, summary].join("\n")
    );
  }

  const totalTargets = plannedOutputs.reduce((count, output) => count + output.inputs.length, 0);
  console.log(
    `Done. Generated ${plannedOutputs.length} .mind file(s) from ${totalTargets} image(s).`
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
