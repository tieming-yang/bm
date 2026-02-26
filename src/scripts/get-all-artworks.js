import { Client } from "@notionhq/client";
import { config } from "dotenv";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import os from "node:os";
config({ path: ".env.local" });

console.log("start working");
if (!process.env.NOTION_TOKEN || !process.env.BIBLE_ARTWORKS_DB_ID) {
  console.warn("⚠️ ", "no env is found");
  process.exit();
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dbID = process.env.BIBLE_ARTWORKS_DB_ID;

async function getAllArtworks() {
  try {
    const { results } = await notion.databases.query({
      database_id: dbID,
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });

    console.log("start getting");
    const artworks = await Promise.all(
      results.map(async (page) => {
        const url = page.properties.Artwork.files[0]?.file.url ?? "";
        const section = page.properties.Section.rich_text[0]?.plain_text ?? "";
        const book = page.properties.Book.select?.name ?? "";

        return {
          url,
          section,
          book,
        };
      })
    );

    return artworks;
  } catch (error) {
    console.error("Error fetching wiki entries:", error);
  }
}

function safePathname(name) {
  return String(name)
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || ".jpg";
  } catch {
    return ".jpg";
  }
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error("❌", res.error);
    return { ok: false, error: "fetch error" };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { ok: true, data: buffer };
}

async function main() {
  // const outputDirectory = path.join(os.homedir(), "Desktop", "bible-artworks");
  // console.log({ outputDirectory });

  const artworks = await getAllArtworks();
  const total = artworks.length;
  let done = 0;

  for (const artwork of artworks) {
    if (!artwork.url || !artwork.section) {
      done++;
      console.log(`skip ${done}/${total}`);
      continue;
    }

    const book = safePathname(artwork.book);
    const section = safePathname(artwork.section);
    const extension = extFromUrl(artwork.url);
    console.warn(`${book}-${section}`);
    
    // const file = path.join(outputDirectory, `${book}${section}${extension}`);
    // const result = await downloadImage(artwork.url);
    // if (!result.ok) {
    //   console.error("❌", result.error);
    //   continue;
    // }
    // await writeFile(file, result.data);
    done++;
    const percentage = Math.round((done / total) * 100);
    // console.log(`downloaded ${done} / ${total} (${percentage}%)`);
  }
}

await main();
console.log("done");
