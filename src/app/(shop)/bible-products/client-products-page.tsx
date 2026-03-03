"use client";

import Loading from "@/app/loading";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Product from "@/models/products";
import { QueryKey } from "@/utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Price from "@/models/prices";
import { useShoppingCart, useShoppingCartSetter } from "@/providers/shopping-cart-provider";

export default function ClientProductsPage() {
  const shoppingCart = useShoppingCart();
  const setShoppingCart = useShoppingCartSetter();
  console.log({ shoppingCart });
  const {
    data: products,
    isPending,
    error,
  } = useQuery({
    queryKey: [QueryKey.products],
    queryFn: () => Product.getAll(),
  });

  if (isPending) {
    return <Loading />;
  }
  if (error || !products) notFound();

  return (
    <div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {products.map((product) => {
          const { id, name, imageURLs, description, priceId, price } = product;

          return (
            <li key={id}>
              <Card className="flex flex-col justify-around h-full">
                <CardContent className="p-0">
                  <AspectRatio className="flex overflow-x-auto snap-x snap-mandatory rounded-t-2xl">
                    {imageURLs.map((url) => {
                      return <img key={url} src={url} alt={name} className="snap-center" />;
                    })}
                  </AspectRatio>
                </CardContent>
                <CardHeader>
                  <CardTitle className="text-md">{name}</CardTitle>
                  <CardDescription className="overflow-y-scroll min-h-24">
                    {description}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col justify-between gap-5">
                  <p className="text-2xl">
                    <span>$</span> <span className="text-3xl">{Price.toDollars(price)}</span>
                  </p>
                  <Button
                    onClick={() => {
                      setShoppingCart((prev) => {
                        const nextQuantity = (prev[priceId]?.quantity ?? 0) + 1;
                        return {
                          ...prev,
                          [priceId]: { quantity: nextQuantity, product },
                        };
                      });
                    }}
                  >
                    加入購物車
                  </Button>
                </CardFooter>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
