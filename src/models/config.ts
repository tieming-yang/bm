const Config = {
  isProd: process.env.NODE_ENV === "production",
  aspectRatio: 1.74 / 1,
  baseUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
};

export default Config;
