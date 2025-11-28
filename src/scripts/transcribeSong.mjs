#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`Audio file not found: ${filePath}`);
  }
}

async function runWhisper(audioPath, language, outputDir) {
  const args = [
    audioPath,
    "--model",
    "large-v3",
    "--output_dir",
    outputDir,
    "--task",
    "transcribe",
    "--output_format",
    "srt",
    "--language",
    language,
  ];

  await new Promise((resolve, reject) => {
    const child = spawn("whisper", args, { stdio: "inherit" });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to start whisper CLI. Is it installed and on your PATH?\n${error.message}`
        )
      );
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`whisper exited with code ${code}`));
    });
  });
}

async function main() {
  const [, , inputPath, language] = process.argv;

  if (!inputPath || !language) {
    console.error(
      "Usage: node src/scripts/transcribeSong.mjs <audio-file> <language-code>"
    );
    process.exit(1);
  }

  const audioPath = path.resolve(inputPath);
  const repoRoot = path.resolve(__dirname, "..", "..");
  const outputDir = path.join(repoRoot, "src", "data", "srts");

  await ensureFileExists(audioPath);
  await fs.mkdir(outputDir, { recursive: true });

  console.log(
    `Transcribing "${audioPath}" -> ${outputDir} (language: ${language})`
  );

  await runWhisper(audioPath, language, outputDir);

  const basename = path.parse(audioPath).name;
  console.log(
    `Done. Look for "${basename}.srt" inside ${outputDir}. (whisper keeps the original basename)`
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
