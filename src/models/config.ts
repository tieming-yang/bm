const isProd = process.env.NODE_ENV === "production";
const aspectRatio = 1.74 / 1;
const baseUrl = isProd ? "https://beyond-media.art/" : "http://localhost:3000";

const Config = {
  isProd,
  aspectRatio,
  baseUrl,
};

export default Config;
