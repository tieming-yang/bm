"use client"

import { motion } from "framer-motion"
import { ImageGallery } from "../components/image-gallery"
import { artworks } from "../data/artworks"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent mb-6">
          彼岸媒體
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Exploring the boundaries of art and media through the visionary work of Yi Yang
        </p>
      </motion.div>

      <ImageGallery artworks={artworks} initialLimit={4} />
    </div>
  )
}
