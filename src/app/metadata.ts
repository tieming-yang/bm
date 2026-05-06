import type { Metadata, MetadataRoute } from "next";

import Config from "@/models/config";

type MetadataOpenGraph = NonNullable<Metadata["openGraph"]>;
type MetadataTwitter = NonNullable<Metadata["twitter"]>;
type OpenGraphType =
  | "website"
  | "article"
  | "book"
  | "profile"
  | "music.song"
  | "music.album"
  | "music.playlist"
  | "music.radio_station"
  | "video.movie"
  | "video.episode"
  | "video.tv_show"
  | "video.other";

export type MetadataRouteKey = string;
export type MetadataImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};
export type PageMetadataConfig = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  image?: MetadataImage;
  robots?: Metadata["robots"];
  openGraphType?: OpenGraphType;
};
export type DynamicMetadataConfig = PageMetadataConfig & {
  openGraph?: Partial<MetadataOpenGraph>;
  twitter?: Partial<MetadataTwitter>;
};
export type SitemapRouteConfig = {
  path: string;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
};

const siteUrl = new URL(Config.baseUrl).origin;

export const siteMetadata = {
  name: "彼岸數位媒體 | Beyond Digital Media",
  shortName: "Beyond Media",
  title: {
    default: "彼岸數位媒體 | Beyond Digital Media",
    template: "%s | 彼岸數位媒體",
  },
  description:
    "彼岸數位媒體 | Beyond Digital Media 是一個致力於推廣基督教藝術和文化的多媒體工作室，旨在透過藝術作品傳遞福音信息。",
  keywords: [
    "彼岸數位媒體",
    "Beyond Digital Media",
    "基督教藝術",
    "聖經畫作",
    "數位福音",
    "基督教文化",
    "Christian art",
    "Bible media",
    "Gospel through art",
    "Christian culture",
    "Digital evangelism",
    "Christian digital media",
    "基督教數位媒體",
    "基督教藝術平台",
    "基督教藝術作品",
    "基督教藝術推廣",
    "基督教藝術展覽",
    "基督教藝術收藏",
    "基督教藝術教育",
    "基督教藝術社群",
    "基督教藝術創作",
    "基督教藝術家",
    "基督教藝術歷史",
    "基督教藝術靈感",
    "基督教藝術與文化",
    "基督教藝術與信仰",
    "基督教藝術與社會",
    "基督教藝術與美學",
    "基督教藝術與創意",
    "基督教藝術與科技",
    "基督教藝術與媒體",
    "基督教藝術與設計",
    "基督教藝術與視覺傳達",
  ],
  url: siteUrl,
  creator: "彼岸數位媒體",
  publisher: "彼岸數位媒體",
  twitterSite: "@beyonddigitalmedia",
  locale: "zh_TW",
  themeColor: "#020617",
  image: {
    url: Config.OGImage,
    width: 1200,
    height: 630,
    alt: "彼岸數位媒體主視覺",
  },
};

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
};

export const pageMetadata = {
  home: {
    path: "/",
    title: siteMetadata.title.default,
    description: siteMetadata.description,
    keywords: siteMetadata.keywords,
  },
  about: {
    path: "/about",
    title: "About | Beyond Digital Media 彼岸數位媒體",
    description:
      "Meet Beyond Digital Media, a Christian multimedia studio creating worship, art, stories, and interactive experiences. 認識彼岸數位媒體，透過敬拜、藝術、故事與互動體驗傳遞福音。",
  },
  contact: {
    path: "/contact",
    title: "Contact | Beyond Digital Media 聯絡彼岸",
    description:
      "Contact Beyond Digital Media for ministry collaboration, creative projects, support, and media inquiries. 歡迎聯絡彼岸數位媒體，洽談事工合作、創作專案、支持與媒體詢問。",
  },
  donate: {
    path: "/donate",
    title: "Donate | Beyond Digital Media 奉獻支持",
    description:
      "Your donation helps us continue creating innovative art and media experiences. 你的奉獻支持彼岸持續創作福音藝術與媒體體驗。",
  },
  signIn: {
    path: "/signin",
    title: "Sign In | Beyond Digital Media",
    description: "Sign in to your Beyond Digital Media account to access your profile.",
    robots: noIndexRobots,
  },
  signUp: {
    path: "/signup",
    title: "Sign Up | Beyond Digital Media",
    description: "Create a Beyond Digital Media account to access your profile and features.",
    robots: noIndexRobots,
  },
  gloryShare: {
    path: "/glory-share",
    title: "Glory Share | Beyond Digital Media 榮耀份額",
    description:
      "Partner with Beyond Digital Media through Glory Share and help faith-based media reach homes, churches, and communities. 加入榮耀份額，一同支持福音媒體進入家庭、教會與社群。",
  },
  gloryShareJoin: {
    path: "/glory-share/join",
    title: "Join Glory Share | Beyond Digital Media",
    description:
      "Choose a Glory Share plan and support Beyond Digital Media's Christian creative work.",
  },
  gloryShareSuccess: {
    path: "/glory-share/join/success",
    title: "Glory Share Confirmation | Beyond Digital Media",
    description: "Confirm your Glory Share support and next steps with Beyond Digital Media.",
    robots: noIndexRobots,
  },
  beyondArt: {
    path: "/beyond-art",
    title: "Beyond Art | Beyond Digital Media 彼岸藝術",
    description:
      "Explore visual art services and faith-centered creative work from Beyond Digital Media. 探索彼岸數位媒體以信仰為核心的視覺藝術與創作服務。",
  },
  beyondMusic: {
    path: "/beyond-music",
    title: "Beyond Music | Beyond Digital Media 彼岸音樂",
    description:
      "Listen to worship, gospel storytelling, and multilingual music from Beyond Digital Media. 聆聽彼岸數位媒體的敬拜、福音故事與多語音樂創作。",
  },
  bibleGallery: {
    path: "/bible-gallery",
    title: "Bible Gallery | Beyond Digital Media 聖經畫廊",
    description:
      "Explore limited Bible-inspired artworks crafted for collectors, churches, and families, celebrating redemption through immersive visuals. 探索為藏家、教會與家庭打造的聖經靈感限量藝術，透過沉浸式視覺呈現救贖故事。",
    keywords: [
      "Bible art",
      "scripture gallery",
      "faith-based exhibition",
      "sacred collectibles",
      "immersive Christian art",
      "聖經藝術",
      "經文畫廊",
      "信仰展覽",
      "聖潔收藏",
      "沉浸式基督教藝術",
    ],
  },
  dailyGraceSnacks: {
    path: "/daily-grace-snacks",
    title: "Daily Grace Snacks | Beyond Digital Media 每日恩典小點心",
    description:
      "Watch bite-sized gospel stories and Bible animations for children and families. 觀看為兒童與家庭製作的福音故事與聖經動畫短片。",
  },
  school: {
    path: "/school",
    title: "Bible School | Beyond Digital Media 聖經學校",
    description:
      "Study Bible stories, characters, and gospel lessons through Beyond Digital Media's learning resources. 透過彼岸的學習資源認識聖經故事、人物與福音課程。",
  },
  schoolSummer2026Registration: {
    path: "/school/summer/2026/registration",
    title: "2026 Ekklesia Beyond Summer Camp Registration | Beyond Digital Media",
    description:
      "Register children for the 2026 Ekklesia Beyond Summer Camp and manage family details for this year's event.",
  },
  dashboard: {
    path: "/dashboard",
    title: "Dashboard | Beyond Digital Media",
    description: "Staff dashboard for reviewing 2026 Ekklesia Beyond Summer Camp registrations.",
    robots: noIndexRobots,
  },
  ar: {
    path: "/ar",
    title: "Bible AR | Beyond Digital Media 聖經 AR",
    description:
      "Step into Scripture through image recognition and 3D Bible character interaction. 透過影像辨識與 3D 互動走進聖經人物的故事。",
  },
  bibleProducts: {
    path: "/bible-products",
    title: "Bible Products | Beyond Digital Media 聖經商品",
    description:
      "Browse Bible-inspired creative products and faith-based resources from Beyond Digital Media. 瀏覽彼岸數位媒體的聖經靈感商品與信仰資源。",
  },
  privacyPolicy: {
    path: "/privacy-policy",
    title: "Privacy Policy | Beyond Digital Media 隱私政策",
    description:
      "Read how Beyond Digital Media collects, uses, stores, and protects personal information. 閱讀彼岸數位媒體如何蒐集、使用、保存與保護個人資料。",
  },
  termsOfService: {
    path: "/terms-of-service",
    title: "Terms of Service | Beyond Digital Media 服務條款",
    description:
      "Read the terms that govern Beyond Digital Media services, support plans, and creative content. 閱讀彼岸數位媒體服務、支持方案與創作內容的使用條款。",
  },
} satisfies Record<MetadataRouteKey, PageMetadataConfig>;

export const publicSitemapRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/donate", changeFrequency: "monthly", priority: 0.7 },
  { path: "/glory-share", changeFrequency: "weekly", priority: 0.8 },
  { path: "/glory-share/join", changeFrequency: "monthly", priority: 0.7 },
  { path: "/beyond-art", changeFrequency: "monthly", priority: 0.7 },
  { path: "/beyond-music", changeFrequency: "weekly", priority: 0.8 },
  { path: "/bible-gallery", changeFrequency: "weekly", priority: 0.8 },
  { path: "/daily-grace-snacks", changeFrequency: "weekly", priority: 0.8 },
  { path: "/school", changeFrequency: "weekly", priority: 0.8 },
  { path: "/school/summer/2026/registration", changeFrequency: "weekly", priority: 0.6 },
  { path: "/ar", changeFrequency: "weekly", priority: 0.7 },
  { path: "/bible-products", changeFrequency: "weekly", priority: 0.7 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.2 },
] satisfies SitemapRouteConfig[];

export const noIndexRoutes = [
  "/signin",
  "/signup",
  "/signout",
  "/glory-share/join/success",
  "/profile",
  "/profile/*",
  "/cart",
  "/orders",
  "/orders/*",
  "/dashboard",
  "/sandbox",
  "/sandbox/*",
] as const;

export function createCanonicalUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteMetadata.url).href;
}

function createImage(image: MetadataImage = siteMetadata.image) {
  return {
    url: image.url,
    width: image.width,
    height: image.height,
    alt: image.alt,
  };
}

export function createPageMetadata(config: PageMetadataConfig): Metadata {
  const canonicalUrl = createCanonicalUrl(config.path);
  const image = createImage(config.image);

  return {
    title: { absolute: config.title },
    description: config.description,
    keywords: config.keywords ?? siteMetadata.keywords,
    authors: [{ name: siteMetadata.creator, url: siteMetadata.url }],
    creator: siteMetadata.creator,
    publisher: siteMetadata.publisher,
    metadataBase: new URL(siteMetadata.url),
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonicalUrl,
      siteName: siteMetadata.name,
      images: [image],
      locale: siteMetadata.locale,
      type: config.openGraphType ?? "website",
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      site: siteMetadata.twitterSite,
      images: [image.url],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: config.robots,
  };
}

export function createDynamicMetadata(config: DynamicMetadataConfig): Metadata {
  const metadata = createPageMetadata(config);
  const openGraph = metadata.openGraph as MetadataOpenGraph;
  const twitter = metadata.twitter as MetadataTwitter;

  return {
    ...metadata,
    openGraph: {
      ...openGraph,
      ...config.openGraph,
    },
    twitter: {
      ...twitter,
      ...config.twitter,
    },
  };
}

const rootMetadata: Metadata = {
  ...createPageMetadata(pageMetadata.home),
  title: siteMetadata.title,
  applicationName: siteMetadata.name,
  generator: "Next.js",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: siteMetadata.shortName,
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "/web-app-manifest-192x192.png",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/web-app-manifest-192x192.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
};

export default rootMetadata;
