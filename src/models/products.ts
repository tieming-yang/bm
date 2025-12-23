import firebase from "@/lib/firebase/firebase";
import { doc, DocumentReference, DocumentSnapshot, getDoc, Timestamp } from "firebase/firestore";
import Config from "./config";

export const ProductStatus = {
  Active: "active",
  Archived: "archived"
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus]

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  priceId: string;
  productId: string;
  isListed: boolean;
  inventory: number;
  imageURLs: string[];
  category: string[];
  isFeatured: boolean;
  isShippingRequired: boolean;
  weight: number;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

const Product = {
  getAll: async (): Promise<Product[]> => {
    const res = await fetch(`${Config.baseUrl}/api/products`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch products from API");
    }

    return res.json();
  }
}

export default Product
