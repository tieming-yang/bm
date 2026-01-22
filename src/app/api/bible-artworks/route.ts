// @ts-nocheck

import { NextResponse } from "next/server";
import { assertIsDefined } from "@/lib/utils";
import { Client, PageObjectResponse } from "@notionhq/client";
import { BibleArtwork, Scripture } from "../../../types/bible-artwork";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dbID = process.env.BIBLE_ARTWORKS_DB_ID;

export async function GET() {
  assertIsDefined(notion, "Notion is not defined");
  assertIsDefined(dbID, "BibleArtworks.dbID is not defined");

  try {
    const { results } = await notion.databases.query({
      database_id: dbID,
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });

    const entries = await Promise.all(
      results.map(async (page: PageObjectResponse) => {
        const id = page.id;
        const title = page.properties.Name.title[0]?.plain_text ?? "";
        const zh = page.properties.zh?.rich_text ?? "";
        const en = page.properties.en?.rich_text ?? "";
        const book = page.properties.Book.select?.name ?? "";
        const section = page.properties.Section.rich_text[0]?.plain_text ?? "";
        const artwork = page.properties.Artwork.files[0]?.file.url ?? "";
        const createdTime = page.created_time;

        return {
          id,
          title,
          book,
          section,
          scriptures: {
            en: en.map((text) => text.plain_text)?.join(""),
            zh: zh.map((text) => text.plain_text)?.join(""),
          },
          imageUrl: artwork,
          createdTime,
        } as BibleArtwork;
      })
    );
    const sanitized = entries.filter((entry) => entry.imageUrl !== "");

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error fetching artwork entries:", error);
    return NextResponse.error("Failed to fetch artwork entries", { status: 500 });
  }
}
