import type { Artwork } from "@/types/bible-artwork";

// Generate artworks with real placeholder images
const generateArtworks = () => {
  const baseArtworks: Artwork[] = [
    {
      id: "1",
      title: "城市倒影",
      description: "研究城市建築及其在水中的倒影，探索現代城市生活的二元性。",
      year: "2023",
      medium: "數位攝影",
      dimensions: "60 × 40 公分",
      location: "紐約市",
      imageUrl:
        "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
      customFields: {
        Technique: "長時間曝光",
        Edition: "限量版 (1/10)",
      },
    },
    {
      id: "2",
      title: "夢幻之境",
      description: "以流動的色彩和柔和的過渡，抽象地表現夢境和潛意識的想法。",
      year: "2022",
      medium: "混合媒材畫布",
      dimensions: "100 × 80 公分",
      imageUrl:
        "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1000",
      customFields: {
        Materials: "Acrylic, Oil, Resin",
      },
    },
    {
      id: "3",
      title: "數位反烏托邦",
      description: "對我們日益依賴技術及其對人類聯繫的影響的評論。",
      year: "2023",
      medium: "數位藝術",
      dimensions: "4K Resolution",
      imageUrl:
        "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=1000",
      customFields: {
        Software: "Adobe Photoshop, Blender",
        "Prints Available": "Yes",
      },
    },
    {
      id: "4",
      title: "混亂中的寧靜",
      description: "在現代生活的混亂中尋找片刻的平靜和清晰。",
      year: "2021",
      medium: "油畫畫布",
      dimensions: "120 × 90 公分",
      location: "私人收藏",
      imageUrl:
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000",
    },
    {
      id: "5",
      title: "碎片化的身份",
      description: "探索數位時代中身份的碎片化特性。",
      year: "2022",
      medium: "攝影與數位操控",
      dimensions: "50 × 70 公分",
      imageUrl:
        "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=1000",
      customFields: {
        Technique: "多重曝光",
        Edition: "開放版",
      },
    },
    {
      id: "6",
      title: "霓虹夜晚",
      description: "對城市夜生活和夜晚街道能量的充滿活力的慶祝。",
      year: "2023",
      medium: "數位攝影",
      dimensions: "80 × 60 公分",
      location: "東京，日本",
      imageUrl:
        "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1000",
      customFields: {
        Technique: "夜間攝影",
        Edition: "限量版 (1/5)",
      },
    },
    {
      id: "7",
      title: "有機圖案",
      description: "靈感來自自然界中發現的自然圖案和有機形式。",
      year: "2021",
      medium: "水彩紙",
      dimensions: "40 × 30 公分",
      imageUrl:
        "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=1000",
    },
    {
      id: "8",
      title: "虛擬現實",
      description: "探索物理世界和虛擬世界之間的界限。",
      year: "2023",
      medium: "3D 渲染",
      dimensions: "8K Resolution",
      imageUrl:
        "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1000",
      customFields: {
        Software: "Cinema 4D, Octane Render",
        "Prints Available": "Yes",
      },
    },
  ];

  // Additional image URLs for pagination examples
  const additionalImageUrls = [
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000",
    "https://images.unsplash.com/photo-1549490349-b73e5280ecdf?q=80&w=1000",
    "https://images.unsplash.com/photo-1573096108468-702f6014ef28?q=80&w=1000",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000",
    "https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?q=80&w=1000",
    "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=1000",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?q=80&w=1000",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?q=80&w=1000",
    "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=1000",
    "https://images.unsplash.com/photo-1552083375-1447ce886485?q=80&w=1000",
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1000",
    "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?q=80&w=1000",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000",
    "https://images.unsplash.com/photo-1501472312651-726afe119ff1?q=80&w=1000",
    "https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=1000",
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1000",
  ];

  // Create additional artworks for testing pagination
  const additionalArtworks: Artwork[] = [];

  for (let i = 9; i <= 24; i++) {
    const baseIndex = (i - 9) % 8;
    const baseArtwork = baseArtworks[baseIndex];
    const imageIndex = (i - 9) % additionalImageUrls.length;

    additionalArtworks.push({
      ...baseArtwork,
      id: i.toString(),
      title: `${baseArtwork.title} ${Math.ceil((i - 8) / 8)}`,
      year: (Number.parseInt(baseArtwork.year) - Math.ceil((i - 8) / 8))
        .toString(),
      imageUrl: additionalImageUrls[imageIndex],
    });
  }

  return [...baseArtworks, ...additionalArtworks];
};

export const artworks: Artwork[] = generateArtworks();
