const isProd = process.env.NODE_ENV === "production";
const aspectRatio = 1.74 / 1;
const domain = "https://beyond-media.art/";
const baseUrl = isProd ? domain : "http://localhost:3000";
const OGImage = "https://beyond-media.art/opengraph-image.png";
const r2ARAssetsBaseURL = isProd ? domain : "https://pub-a014564a88a84d6ba93d7ad81beeb68f.r2.dev";

const Config = {
  isProd,
  aspectRatio,
  baseUrl,
  OGImage,
  r2ARAssetsBaseURL,
};

export default Config;
