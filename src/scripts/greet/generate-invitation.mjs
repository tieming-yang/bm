import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";

const root = new URL("../../../", import.meta.url);
const [font, painting] = await Promise.all([
  readFile(new URL("src/lib/greet/assets/greet-font.ttf", root)),
  readFile(new URL("public/paintings/Genesis/Genesis1-1-31.webp", root)),
]);
const image = await sharp(painting).resize({ width: 1200, withoutEnlargement: true }).png().toBuffer();
const response = new ImageResponse(
  h("div", { style: { display: "flex", width: "100%", height: "100%", background: "#f7f3e9", padding: 40, fontFamily: "Greeting", color: "#254238" } },
    h("div", { style: { display: "flex", width: 540, height: 550, alignItems: "center", background: "#e8e5d9", borderRadius: 8, overflow: "hidden" } },
      h("img", { src: `data:image/png;base64,${image.toString("base64")}`, width: 540, height: 550, style: { objectFit: "contain" } })),
    h("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 40, width: 580 } },
      h("div", { style: { fontSize: 20, letterSpacing: 4, color: "#947747", marginBottom: 34 } }, "BEYOND MEDIA"),
      h("div", { style: { fontSize: 49, lineHeight: 1.35 } }, "打開今日祝福"),
      h("div", { style: { fontSize: 40, lineHeight: 1.4, marginTop: 18 } }, "Open today's blessing"),
      h("div", { style: { width: 70, height: 2, background: "#b89a62", marginTop: 38, marginBottom: 24 } }),
      h("div", { style: { fontSize: 20, color: "#5e6c61" } }, "beyond-media.art/daily-blessing"))),
  { width: 1200, height: 630, fonts: [{ name: "Greeting", data: font, weight: 400, style: "normal" }] }
);
const destination = new URL("src/app/daily-blessing/opengraph-image.png", root);
await mkdir(new URL("src/app/daily-blessing/", root), { recursive: true });
await writeFile(destination, Buffer.from(await response.arrayBuffer()));
console.log(`Generated fixed invitation: ${fileURLToPath(destination)}`);
