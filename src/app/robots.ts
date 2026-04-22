import type { MetadataRoute } from "next";

import { createCanonicalUrl, noIndexRoutes, siteMetadata } from "./metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...noIndexRoutes],
    },
    sitemap: createCanonicalUrl("/sitemap.xml"),
    host: siteMetadata.url,
  };
}
