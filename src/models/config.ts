const isProd = process.env.NODE_ENV === "production";
const aspectRatio = 1.74 / 1;
const baseUrl = isProd ? "https://beyond-media.art/" : "http://localhost:3000";
const OGImage = "https://beyond-media.art/opengraph-image.png"
const Config = {
  isProd,
  aspectRatio,
  baseUrl,
  OGImage
};

export default Config;
