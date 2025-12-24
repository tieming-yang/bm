"use client";

import { createContext, Dispatch, PropsWithChildren, useContext, useState } from "react";
import Product from "@/models/products";

const fakeCart = [
  { id: "prod_1", name: "Bible Bookmark Set", price: 1200, qty: 1 },
  { id: "prod_2", name: "Scripture Journal", price: 2800, qty: 2 },
];

const ShoppingCartContext = createContext<Product[]>([]);
const ShoppingCartSetterContext = createContext<Dispatch<React.SetStateAction<Product[]>>>(() => {
  throw new Error("ShoppingCartSetterContext used outside ShoppingCartProvider");
});

export function useShoppingCart() {
  return useContext(ShoppingCartContext);
}

export function useShoppingCartSetter() {
  return useContext(ShoppingCartSetterContext);
}

function ShoppingCartProvider({ children }: PropsWithChildren) {
  const [shoppingCart, setShoppingCart] = useState<Product[]>(fakeCart);

  return (
    <ShoppingCartContext value={shoppingCart}>
      <ShoppingCartSetterContext value={setShoppingCart}>{children}</ShoppingCartSetterContext>
    </ShoppingCartContext>
  );
}

export default ShoppingCartProvider;
