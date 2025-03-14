import type { Artwork } from "@/types/artwork"

// Generate artworks with real placeholder images
const generateArtworks = () => {
  const baseArtworks: Artwork[] = [
    {
      id: "1",
      title: "Urban Reflections",
      description:
        "A study of urban architecture and its reflection in water, exploring the duality of modern city life.",
      year: "2023",
      medium: "Digital Photography",
      dimensions: "60 × 40 cm",
      location: "New York City",
      imageUrl: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
      customFields: {
        Technique: "Long Exposure",
        Edition: "Limited (1/10)",
      },
    },
    {
      id: "2",
      title: "Ethereal Dreams",
      description:
        "An abstract representation of dreams and subconscious thoughts, using fluid colors and soft transitions.",
      year: "2022",
      medium: "Mixed Media on Canvas",
      dimensions: "100 × 80 cm",
      imageUrl: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1000",
      customFields: {
        Materials: "Acrylic, Oil, Resin",
      },
    },
    {
      id: "3",
      title: "Digital Dystopia",
      description: "A commentary on our increasing dependence on technology and its impact on human connection.",
      year: "2023",
      medium: "Digital Art",
      dimensions: "4K Resolution",
      imageUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=1000",
      customFields: {
        Software: "Adobe Photoshop, Blender",
        "Prints Available": "Yes",
      },
    },
    {
      id: "4",
      title: "Serenity in Chaos",
      description: "Finding moments of peace and clarity amidst the chaos of modern life.",
      year: "2021",
      medium: "Oil on Canvas",
      dimensions: "120 × 90 cm",
      location: "Private Collection",
      imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000",
    },
    {
      id: "5",
      title: "Fragmented Identity",
      description: "An exploration of the fragmented nature of identity in the digital age.",
      year: "2022",
      medium: "Photography & Digital Manipulation",
      dimensions: "50 × 70 cm",
      imageUrl: "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=1000",
      customFields: {
        Technique: "Multiple Exposure",
        Edition: "Open",
      },
    },
    {
      id: "6",
      title: "Neon Nights",
      description: "A vibrant celebration of urban nightlife and the energy of city streets after dark.",
      year: "2023",
      medium: "Digital Photography",
      dimensions: "80 × 60 cm",
      location: "Tokyo, Japan",
      imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1000",
      customFields: {
        Technique: "Night Photography",
        Edition: "Limited (1/5)",
      },
    },
    {
      id: "7",
      title: "Organic Patterns",
      description: "Inspired by natural patterns and organic forms found in nature.",
      year: "2021",
      medium: "Watercolor on Paper",
      dimensions: "40 × 30 cm",
      imageUrl: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=1000",
    },
    {
      id: "8",
      title: "Virtual Reality",
      description: "Exploring the boundaries between physical and virtual worlds.",
      year: "2023",
      medium: "3D Rendering",
      dimensions: "8K Resolution",
      imageUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1000",
      customFields: {
        Software: "Cinema 4D, Octane Render",
        "Prints Available": "Yes",
      },
    },
  ]

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
  ]

  // Create additional artworks for testing pagination
  const additionalArtworks: Artwork[] = []

  for (let i = 9; i <= 24; i++) {
    const baseIndex = (i - 9) % 8
    const baseArtwork = baseArtworks[baseIndex]
    const imageIndex = (i - 9) % additionalImageUrls.length

    additionalArtworks.push({
      ...baseArtwork,
      id: i.toString(),
      title: `${baseArtwork.title} ${Math.ceil((i - 8) / 8)}`,
      year: (Number.parseInt(baseArtwork.year) - Math.ceil((i - 8) / 8)).toString(),
      imageUrl: additionalImageUrls[imageIndex],
    })
  }

  return [...baseArtworks, ...additionalArtworks]
}

export const artworks: Artwork[] = generateArtworks()

