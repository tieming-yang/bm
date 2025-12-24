"use client";

import { useShoppingCart } from "@/providers/shopping-cart-provider";

export default function ClientCartPage() {
  const cart = useShoppingCart();

  return (
    <div className="container px-4 py-16 mx-auto space-y-16">
      <ul>
        {cart.length > 0 &&
          cart.map((product) => {
            const { name } = product;
            return <li>{name}</li>;
          })}
      </ul>
    </div>
  );
}
