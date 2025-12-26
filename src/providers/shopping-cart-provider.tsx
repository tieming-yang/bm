"use client";

import { Timestamp } from "firebase/firestore";
import { createContext, Dispatch, PropsWithChildren, useContext, useState } from "react";
import type { Product } from "@/models/products";
import { Cart } from "@/models/cart";

const fakeProducts: Product[] = [
  {
    id: "cart_1",
    name: "Bible Bookmark Set",
    slug: "bible-bookmark-set",
    description: "Matte-finish scripture bookmarks printed on recycled cardstock.",
    price: 500,
    priceId: "price_fake_bms_1200",
    productId: "prod_fake_bms",
    isListed: true,
    inventory: 3,
    imageURLs: [
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1455885666521-88f7d2b39d21?auto=format&fit=crop&w=1200&q=80",
    ],
    category: ["stationery", "bookmark"],
    isFeatured: true,
    isShippingRequired: true,
    weight: 80,
    updatedAt: Timestamp.fromDate(new Date("2024-05-10T08:30:00Z")),
    createdAt: Timestamp.fromDate(new Date("2024-04-20T12:00:00Z")),
  },
  {
    id: "cart_2",
    name: "Scripture Journal",
    slug: "scripture-journal",
    description: "Lay-flat journal with dot-grid pages for notes and reflection.",
    price: 1000,
    priceId: "price_fake_sj_2800",
    productId: "prod_fake_sj",
    isListed: true,
    inventory: 5,
    imageURLs: [
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
    ],
    category: ["journal", "study"],
    isFeatured: false,
    isShippingRequired: true,
    weight: 420,
    updatedAt: Timestamp.fromDate(new Date("2024-05-04T16:10:00Z")),
    createdAt: Timestamp.fromDate(new Date("2024-03-28T09:15:00Z")),
  },
];

const fakeCart: Cart = {
  [fakeProducts[0].priceId]: { quantity: 1, product: fakeProducts[0] },
  [fakeProducts[1].priceId]: { quantity: 3, product: fakeProducts[1] },
};

const ShoppingCartContext = createContext<Cart>({});
const ShoppingCartSetterContext = createContext<Dispatch<React.SetStateAction<Cart>>>(() => {
  throw new Error("ShoppingCartSetterContext used outside ShoppingCartProvider");
});

export function useShoppingCart() {
  return useContext(ShoppingCartContext);
}

export function useShoppingCartSetter() {
  return useContext(ShoppingCartSetterContext);
}

function ShoppingCartProvider({ children }: PropsWithChildren) {
  const [shoppingCart, setShoppingCart] = useState<Cart>(fakeCart);

  return (
    <ShoppingCartContext value={shoppingCart}>
      <ShoppingCartSetterContext value={setShoppingCart}>{children}</ShoppingCartSetterContext>
    </ShoppingCartContext>
  );
}

export default ShoppingCartProvider;
