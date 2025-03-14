export interface Artwork {
  id: string
  title: string
  description: string
  year: string
  medium: string
  dimensions: string
  location?: string
  imageUrl: string
  customFields?: Record<string, string>
}

