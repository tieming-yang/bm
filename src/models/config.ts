const Config = {
  isProd: process.env.NODE_ENV === "production",
  aspectRatio: 1.74 / 1,
  baseUrl:
    process.env.NODE_ENV === "production" ? "https://beyond-media.art/" : "http://localhost:3000",
};

export default Config;
