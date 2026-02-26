import { Client } from "@notionhq/client";
import { config } from "dotenv";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
config({ path: ".env.local" });
import vm from "node:vm";

console.log("start working");
if (!process.env.NOTION_TOKEN || !process.env.BIBLE_ARTWORKS_DB_ID) {
  console.warn("⚠️ ", "no env is found");
  process.exit();
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dbID = process.env.BIBLE_ARTWORKS_DB_ID;

async function getAllScriptures() {
  try {
    const { results } = await notion.databases.query({
      database_id: dbID,
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });

    console.log("start getting");
    const scriptures = await Promise.all(
      results.map(async (page) => {
        const zh = page.properties.zh.rich_text ?? "";
        const en = page.properties.en.rich_text ?? "";
        return {
          zh: zh.map((text) => text.plain_text)?.join(""),
          en: en.map((text) => text.plain_text)?.join(""),
        };
      })
    );

    return scriptures;
  } catch (error) {
    console.error("Error fetching wiki entries:", error);
  }
}
/**
 * @todo get all scriptures, insert the separater for batch voice over generation
 * @see http://new.text-to-speech.cn/tts/
 * @example @@@批量生成分隔@@@
 */
const SEPARATER = "\n@@@批量生成分隔@@@\n";
const RAW_SCRIPTURES_PATH = new URL("./create-vo-text/raw-vo-scripts.txt", import.meta.url);
async function main() {
  const rawScriptures = await getAllScriptures();
  await writeFile(RAW_SCRIPTURES_PATH, rawScriptures, { encoding: "utf-8" });

  const scriptures = await readFile(RAW_SCRIPTURES_PATH, "utf-8");
  const parsed = vm.runInNewContext(scriptures);

  const vo = parsed.map((p) => {
    const script = p.zh.replace(/\d+/g, "").trim();
    // const script = p.en.replace(/\d+/g, "").trim();
    return script + SEPARATER;
  });

  console.debug(vo.join(""));
  return vo.join("");
}

await main();
