/**
 * This script can be run to verify the encoding of all translation files
 * Usage: npx ts-node src/lib/i18n/verify-encoding.ts
 */

import fs from "fs";
import path from "path";
import { verifyTranslationEncoding } from "./encoding-utils";

// Path to locales directory (relative to this file)
const LOCALES_DIR = path.join(__dirname, "locales");

// Get all locale directories
const locales = fs
  .readdirSync(LOCALES_DIR)
  .filter((file) => fs.statSync(path.join(LOCALES_DIR, file)).isDirectory());

console.log("Verifying encoding of translation files...");

// Process each locale
locales.forEach((locale) => {
  console.log(`\nChecking locale: ${locale}`);

  // Get all JSON files in the locale directory
  const files = fs
    .readdirSync(path.join(LOCALES_DIR, locale))
    .filter((file) => file.endsWith(".json"));

  // Verify each file
  files.forEach((file) => {
    try {
      const filePath = path.join(LOCALES_DIR, locale, file);
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));

      console.log(`\nVerifying: ${locale}/${file}`);
      verifyTranslationEncoding(content, `${locale}/${file}`);
    } catch (error) {
      console.error(`Error reading/parsing ${locale}/${file}:`, error);
    }
  });
});

console.log("\nEncoding verification complete.");
console.log("\nIF YOU FOUND ENCODING ISSUES:");
console.log("1. Open the file in VS Code");
console.log("2. Click on the encoding in the bottom status bar");
console.log('3. Choose "Save with Encoding" and select UTF-8');
console.log("4. Fix any corrupted text and save the file");
