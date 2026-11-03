import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { GreetingCardDescription } from "./contracts";
import type { GreetingArtwork } from "./artwork";

let fontPromise: Promise<Buffer> | undefined;

/** Renders and fully buffers the single PNG used for display, sharing, and download. */
export async function renderGreetingCard(
  card: GreetingCardDescription,
  artwork: GreetingArtwork,
): Promise<Uint8Array> {
  fontPromise ??= readFile(path.join(process.cwd(), "src/lib/greet/assets/greet-font.ttf"));
  const [font, picture] = await Promise.all([
    fontPromise,
    sharp(artwork.bytes, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 984, height: 554, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer(),
  ]);
  const isChinese = card.locale === "zh-TW";
  const ink = card.period === "night" || card.period === "evening" ? "#243b4a" : "#2e4c3c";
  const verseSize = isChinese
    ? (card.verse.length > 90 ? 36 : card.verse.length > 65 ? 40 : 44)
    : (card.verse.length > 250 ? 32 : card.verse.length > 180 ? 35 : 39);
  const image = new ImageResponse(
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        padding: "36px 48px 32px",
        backgroundColor: "#f5f0e5",
        color: ink,
        fontFamily: "Greeting",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="14" stroke={ink} strokeWidth="1.2" />
            <path d="M15 7V23M9 13H21" stroke={ink} strokeWidth="1.2" />
          </svg>
          <span style={{ fontSize: 23, letterSpacing: 3 }}>BEYOND MEDIA</span>
        </div>
        <span style={{ fontSize: 22, color: "#807256", letterSpacing: isChinese ? 3 : 2 }}>
          {isChinese ? "每日祝福" : "DAILY BLESSING"}
        </span>
      </div>

      <div style={{ display: "flex", width: 984, height: 554, alignItems: "center", justifyContent: "center", backgroundColor: "#ebe5d9" }}>
        <img
          src={`data:image/png;base64,${picture.toString("base64")}`}
          width={984}
          height={554}
          style={{ objectFit: "contain" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 36 }}>
        <div style={{ fontSize: isChinese ? 74 : 64, lineHeight: 1.2, letterSpacing: isChinese ? 10 : -1 }}>
          {card.greeting}
        </div>
        <div style={{ fontSize: 27, color: "#807256", marginTop: 12, letterSpacing: 1 }}>
          {card.dateLabel}
        </div>
        <div style={{ display: "flex", width: 64, height: 1, backgroundColor: "#ad9563", marginTop: 28 }} />
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 34px 18px" }}>
        <div style={{ display: "flex", width: "100%", justifyContent: "center", textAlign: "center", fontSize: verseSize, lineHeight: isChinese ? 1.6 : 1.45 }}>
          {card.verse}
        </div>
        <div style={{ fontSize: 26, color: "#807256", marginTop: 22, letterSpacing: 1 }}>
          {card.reference}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", borderTop: "1px solid #d9ceba", paddingTop: 18, fontSize: 20, color: "#81775f", letterSpacing: 2 }}>
        beyond-media.art/daily-blessing
      </div>
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: [{ name: "Greeting", data: new Uint8Array(font).buffer, weight: 400, style: "normal" }],
    },
  );
  return new Uint8Array(await image.arrayBuffer());
}
