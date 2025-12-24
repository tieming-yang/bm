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
              <Card className="h-full flex flex-col justify-around">
                <CardContent className="p-0">
                  <AspectRatio className="flex snap-x snap-mandatory overflow-x-auto rounded-t-2xl">
                    {imageURLs.map((url) => {
                      return <img key={url} src={url} alt={name} className="snap-center" />;
                    })}
                  </AspectRatio>
                </CardContent>
                <CardHeader>
                  <CardTitle className="text-md">{name}</CardTitle>
                  <CardDescription className="min-h-24 overflow-y-scroll">
                    {description}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col gap-5 justify-between">
                  <p className="text-2xl">
                    <span>$</span> <span className="text-3xl">{Price.toDollars(price)}</span>
                  </p>
                  <Button
                    onClick={() => {
                      setShoppingCart((prev) => [...prev, product]);
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
