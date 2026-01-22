import { Client } from "@notionhq/client";
import { config } from "dotenv";
config({ path: "../../.env.local" });

console.log("start working");
if (!process.env.NOTION_TOKEN || !process.env.BIBLE_ARTWORKS_DB_ID) {
  console.warn("⚠️ ", "no env is found");
  process.exit();
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dbID = process.env.BIBLE_ARTWORKS_DB_ID;

async function migrateSriptures() {
  try {
    const { results } = await notion.databases.query({
      database_id: dbID,
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });

    console.log("start getting");
    const entries = await Promise.all(
      results.map(async (page) => {
        const id = page.id;
        // Get block content for every page
        const { results: blocks } = await notion.blocks.children.list({
          block_id: id,
        });

        const paragraphs = blocks.filter((block) => block.type === "paragraph");
        const scripture = paragraphs
          ?.map((block) => {
            return block.paragraph.rich_text.map((text) => text.plain_text)?.join("");
          })
          ?.join("\n")
          ?.split("\n\n");

        return {
          id,
          scripture,
        };
      })
    );

    console.log("we got the scriptures");

    const updates = entries.map(async (entry) => {
      const en = entry.scripture[0];
      const zh = entry.scripture[1].replace(/[ ]+/g, "");

      return await notion.pages.update({
        page_id: entry.id,
        properties: {
          en: { rich_text: toRichTextChunks(en) },
          zh: { rich_text: toRichTextChunks(zh) },
        },
      });
    });
    console.log("start updating");
    await Promise.all(updates);
  } catch (error) {
    console.error("Error fetching wiki entries:", error);
  }
}

function toRichTextChunks(text, max = 2000) {
  const chars = Array.from(text ?? "");
  const chunks = [];
  for (let i = 0; i < chars.length; i += max) {
    chunks.push(chars.slice(i, i + max).join(""));
  }

  return chunks.map((content) => ({
    type: "text",
    text: { content },
  }));
}

await migrateSriptures();

console.log("done");
