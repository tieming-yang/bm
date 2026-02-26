#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    list: "src/data/completed-sections.txt",
    dir: "",
    apply: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    if (cur === "--list") {
      args.list = argv[++i];
    } else if (cur === "--dir") {
      args.dir = argv[++i];
    } else if (cur === "--apply") {
      args.apply = true;
    } else if (cur === "--help" || cur === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${cur}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node src/scripts/rename-mp3-from-list.cjs --dir <mp3-directory> [--list <txt-file>] [--apply]

Options:
  --dir     Directory containing mp3 files (required)
  --list    Text file with one target name per line (default: src/data/completed-sections.txt)
  --apply   Actually rename files (default is dry run)
`);
}

async function readNames(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("No names found in list file.");
  }
  return lines;
}

async function readMp3Files(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.mp3$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error("No .mp3 files found in target directory.");
  }
  return files;
}

function sanitizeName(name) {
  return name
    .trim()
    .replace(/[\/\\:]/g, "-")
    .replace(/[*?"<>|]/g, "");
}

function buildTargets(names) {
  const targets = [];
  const seen = new Set();

  for (let i = 0; i < names.length; i++) {
    const safe = sanitizeName(names[i]);
    if (!safe) {
      throw new Error(`Invalid empty name at list line ${i + 1}`);
    }

    const file = `${safe}.mp3`;
    const key = file.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`Duplicate target filename generated: ${file}`);
    }
    seen.add(key);
    targets.push(file);
  }

  return targets;
}

function printPlan(oldFiles, newFiles) {
  console.log("Rename plan:");
  oldFiles.forEach((oldName, i) => {
    console.log(`${String(i + 1).padStart(3, " ")}. ${oldName} -> ${newFiles[i]}`);
  });
}

async function renameTwoPhase(dirPath, oldFiles, newFiles) {
  const tempFiles = [];

  for (let i = 0; i < oldFiles.length; i++) {
    const oldPath = path.join(dirPath, oldFiles[i]);
    const tempName = `.__tmp_rename_${String(i + 1).padStart(4, "0")}__.mp3`;
    const tempPath = path.join(dirPath, tempName);
    await fs.rename(oldPath, tempPath);
    tempFiles.push(tempName);
  }

  for (let i = 0; i < tempFiles.length; i++) {
    const tempPath = path.join(dirPath, tempFiles[i]);
    const finalPath = path.join(dirPath, newFiles[i]);
    await fs.rename(tempPath, finalPath);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) {
    printHelp();
    throw new Error("Missing required --dir");
  }

  const names = await readNames(args.list);
  const mp3Files = await readMp3Files(args.dir);

  if (names.length !== mp3Files.length) {
    throw new Error(
      `Count mismatch: ${names.length} names in list, ${mp3Files.length} mp3 files in dir.`
    );
  }

  const targets = buildTargets(names);
  printPlan(mp3Files, targets);

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to perform rename.");
    return;
  }

  await renameTwoPhase(args.dir, mp3Files, targets);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
