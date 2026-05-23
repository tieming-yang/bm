// @ts-nocheck

import { NextResponse } from "next/server";
import { assertIsDefined } from "@/lib/utils";
import { Client, PageObjectResponse } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_SONGS_INTEGRATION_TOKEN });
const dbID = process.env.SONGS_DB_ID;

export async function GET() {
  assertIsDefined(notion, "Notion is not defined");
  assertIsDefined(dbID, "Songs.dbID is not defined");

  try {
    const { results } = await notion.databases.query({
      database_id: dbID,
      sorts: [{ property: "createdAt", direction: "descending" }],
      page_size: 100,
      filter: {
        "property": "isPublic",
        "checkbox": {
          "equals": true
        }
      }
    });

    const entries = results.map((page: PageObjectResponse) => {
      const id = page.properties.title?.title?.[0]?.plain_text ?? "";
      const title = page.properties.title?.title?.[0]?.plain_text ?? "";
      const genre = page.properties.genre?.multi_select?.map((select) => select.name).join(", ") ?? "";
      const isPublic = page.properties.isPublic?.checkbox ?? false;

      const lyricsText =
        page.properties.lyrics?.rich_text ?? page.properties.lyrics?.title ?? [];
      const lyrics = Array.isArray(lyricsText)
        ? lyricsText.map((text: any) => text?.plain_text ?? "").join("")
        : "";

      const fileUrl = page.properties.file?.files?.[0].file?.url;

      const createdAt = page.properties.createdAt?.date?.start ?? page.created_time;

      return {
        id,
        title,
        genre,
        isPublic,
        lyrics,
        fileUrl,
        createdAt,
      };
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}
