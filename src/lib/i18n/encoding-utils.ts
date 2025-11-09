/**
 * Utilities to help with character encoding issues in i18n files
 */

/**
 * Checks if a string might have encoding issues (high concentration of question marks)
 */
export const hasEncodingIssues = (str: string): boolean => {
  if (typeof str !== "string") return false;

  const questionMarkCount = (str.match(/\?/g) || []).length;
  // If more than 50% of the string is question marks, it might have encoding issues
  return questionMarkCount > str.length * 0.5;
};

/**
 * Scans a translation object for potential encoding issues
 */
export const scanForEncodingIssues = (
  obj: Record<string, any>,
  path = "",
  issues: string[] = []
): string[] => {
  for (const key in obj) {
    const value = obj[key];
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === "string") {
      if (hasEncodingIssues(value)) {
        issues.push(`Possible encoding issue at '${currentPath}': ${value}`);
      }
    } else if (typeof value === "object" && value !== null) {
      scanForEncodingIssues(value, currentPath, issues);
    }
  }

  return issues;
};

/**
 * Checks if a translation file's encoding looks good
 */
export const verifyTranslationEncoding = (
  translations: Record<string, any>,
  name: string
): void => {
  const issues = scanForEncodingIssues(translations);

  if (issues.length > 0) {
    console.warn(`[i18n] Encoding issues detected in ${name}:`);
    issues.forEach((issue) => console.warn(`  - ${issue}`));
    console.warn(`[i18n] Please ensure all translation files are saved with UTF-8 encoding`);
  }
};

/**
 * Instructions for manually fixing encoding issues:
 *
 * 1. Open the JSON file in a good editor like VS Code
 * 2. Ensure your editor is set to use UTF-8 encoding
 * 3. For VS Code:
 *    - Open the file
 *    - Click on the encoding indicator in the bottom right (usually says "UTF-8")
 *    - Select "Save with Encoding"
 *    - Choose "UTF-8" (not "UTF-8 with BOM")
 *    - Save the file
 *
 * If your files still have issues after saving with UTF-8 encoding:
 * 1. Make sure you're typing Chinese characters directly or copying from a reliable source
 * 2. Verify your font has Chinese character glyphs
 * 3. Check that your browser and editor have the proper language packs installed
 */
