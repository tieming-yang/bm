import Price from "./prices";
import { Product } from "./products";

export type Cart = Record<string, { quantity: number; product: Product }>;

const Cart = {
  getItemsCount: (cart: Cart) => {
    return Object.values(cart).reduce<number>((acc, item) => {
      return (acc += item.quantity);
    }, 0);
  },

  getTotalPrice: (cart: Cart) => {
    const cents = Object.values(cart).reduce<number>((acc, item) => {
      return (acc += (item.product.price * item.quantity))
    }, 0)

    return Price.toDollars(cents)
  }
}

export default Cart
