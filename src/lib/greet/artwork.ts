import { z } from "zod";
import type { GreetingEntry } from "./policy.ts";

const MAX_ARTWORK_BYTES = 20 * 1024 * 1024;
const ASSET_HOSTS = new Set([
  "prod-files-secure.s3.us-west-2.amazonaws.com",
]);

const NotionArtworkPageSchema = z.object({
  object: z.literal("page"),
  id: z.string().uuid(),
  archived: z.boolean(),
  in_trash: z.boolean().optional(),
  parent: z.object({ type: z.literal("database_id"), database_id: z.string() }),
  properties: z.object({
    Book: z.object({ type: z.literal("select"), select: z.object({ name: z.string().min(1) }) }),
    Section: z.object({ type: z.literal("rich_text"), rich_text: z.array(z.object({ plain_text: z.string() })).min(1) }),
    en: z.object({ type: z.literal("rich_text"), rich_text: z.array(z.object({ plain_text: z.string() })).min(1) }),
    zh: z.object({ type: z.literal("rich_text"), rich_text: z.array(z.object({ plain_text: z.string() })).min(1) }),
    Artwork: z.object({
      type: z.literal("files"),
      files: z.array(z.object({
        type: z.literal("file"),
        file: z.object({
          url: z.string().url(),
          expiry_time: z.string().datetime({ offset: true }),
        }),
      })).min(1),
    }),
  }),
});

type ArtworkPageRead = { kind: "found"; page: unknown } | { kind: "missing" };

/** I/O used to refresh a gallery asset without retaining its temporary signed URL. */
export type GreetingArtworkEffects = {
  readPage: (pageId: string) => Promise<ArtworkPageRead>;
  fetchAsset: (url: string) => Promise<Response>;
  now: () => number;
};

/** The only asset data passed to the image renderer. */
export type GreetingArtwork = {
  bytes: Uint8Array;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
};

/** Missing or expired artwork is recoverable; invalid provider state is an invariant failure. */
export type GreetingArtworkResult =
  | { kind: "ready"; artwork: GreetingArtwork }
  | { kind: "unavailable"; reason: "removed" | "expired" };

function normalizedId(value: string): string {
  if (!/^[a-f0-9]{32}$/i.test(value.replaceAll("-", ""))) {
    throw new Error("Invalid gallery identifier");
  }
  return value.replaceAll("-", "").toLowerCase();
}

/** Validates gallery membership and restricts asset fetching to Notion's configured storage hosts. */
export function readGreetingArtworkFile(input: unknown, entry: GreetingEntry, databaseId: string) {
  const parsed = NotionArtworkPageSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid Notion artwork page payload");
  const page = parsed.data;
  if (normalizedId(page.id) !== normalizedId(entry.artworkPageId)) {
    throw new Error("Notion artwork page identifier changed");
  }
  if (normalizedId(page.parent.database_id) !== normalizedId(databaseId)) {
    throw new Error("Notion artwork is outside the configured gallery database");
  }
  if (page.archived || page.in_trash) return { kind: "removed" } as const;
  if (
    page.properties.Book.select.name !== entry.provenance.book ||
    page.properties.Section.rich_text.map((text) => text.plain_text).join("") !== entry.provenance.section
  ) {
    throw new Error("Notion artwork scripture identity changed");
  }
  if (
    !page.properties.en.rich_text.map((text) => text.plain_text).join("").includes(entry.verse.en) ||
    !page.properties.zh.rich_text.map((text) => text.plain_text).join("").includes(entry.verse["zh-TW"])
  ) {
    throw new Error("Notion artwork no longer contains the verified greeting excerpt");
  }

  const file = page.properties.Artwork.files[0].file;
  const url = new URL(file.url);
  if (
    url.protocol !== "https:" ||
    !ASSET_HOSTS.has(url.hostname) ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new Error("Notion artwork has an unsupported asset URL");
  }
  return { kind: "file", url: url.href, expiresAtMs: Date.parse(file.expiry_time) } as const;
}

async function readImageBytes(response: Response): Promise<GreetingArtwork> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_ARTWORK_BYTES)) {
    throw new Error("Artwork exceeds the maximum image size");
  }
  const mediaType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "image/png" && mediaType !== "image/jpeg" && mediaType !== "image/webp") {
    throw new Error("Artwork has an unsupported image content type");
  }
  if (!response.body) throw new Error("Artwork response has no image body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_ARTWORK_BYTES) {
        await reader.cancel();
        throw new Error("Artwork exceeds the maximum image size");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const signature = Array.from(bytes.subarray(0, 12));
  const isPng = signature.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  const isJpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
  const isWebp = String.fromCharCode(...signature.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  if (!((mediaType === "image/png" && isPng) || (mediaType === "image/jpeg" && isJpeg) || (mediaType === "image/webp" && isWebp))) {
    throw new Error("Artwork image signature does not match its content type");
  }
  return { bytes, mediaType };
}

/** Refreshes the provider URL once when an asset expires, preserving the selected artwork. */
export async function loadGreetingArtwork(
  entry: GreetingEntry,
  databaseId: string,
  effects: GreetingArtworkEffects,
): Promise<GreetingArtworkResult> {
  normalizedId(entry.artworkPageId);
  normalizedId(databaseId);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await effects.readPage(entry.artworkPageId);
    if (result.kind === "missing") return { kind: "unavailable", reason: "removed" };
    const file = readGreetingArtworkFile(result.page, entry, databaseId);
    if (file.kind === "removed") return { kind: "unavailable", reason: "removed" };
    if (file.expiresAtMs <= effects.now() + 5_000) continue;

    const response = await effects.fetchAsset(file.url);
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      continue;
    }
    if (response.status === 404) {
      await response.body?.cancel();
      return { kind: "unavailable", reason: "removed" };
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Artwork image request failed");
    }
    return { kind: "ready", artwork: await readImageBytes(response) };
  }
  return { kind: "unavailable", reason: "expired" };
}

/** Creates the production Notion/network boundary without exposing credentials to callers. */
export function createGreetingArtworkEffects(): { databaseId: string; effects: GreetingArtworkEffects } {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.BIBLE_ARTWORKS_DB_ID;
  if (!token || !databaseId) throw new Error("Greeting artwork provider is not configured");
  normalizedId(databaseId);
  return {
    databaseId,
    effects: {
      now: Date.now,
      readPage: async (pageId) => {
        normalizedId(pageId);
        const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
          cache: "no-store",
        });
        if (response.status === 404) return { kind: "missing" };
        if (!response.ok) throw new Error("Notion artwork lookup failed");
        return { kind: "found", page: await response.json() };
      },
      fetchAsset: (url) => fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      }),
    },
  };
}
