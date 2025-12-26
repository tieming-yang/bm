"use client";

import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { useShoppingCart, useShoppingCartSetter } from "@/providers/shopping-cart-provider";
import { Input } from "@/components/ui/input";

import Link from "next/link";
import { toast } from "sonner";
import useProfile from "@/hooks/use-profile";
import Loading from "@/app/loading";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import Auth from "@/models/auth";
import { Product } from "@/models/products";
import Cart, { type Cart as CartType } from "@/models/cart";

export default function ClientCartPage() {
  const cart = useShoppingCart();
  const setCart = useShoppingCartSetter();
  const cartItems = Cart.getItemsCount(cart);
  const router = useRouter();
  const currentPathname = usePathname();
  const { profile, isProfileLoading } = useProfile();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (canceled) {
      toast.warning("付款取消");
    }
  }, [canceled]);

  const payMutation = useMutation({
    mutationKey: ["cart"],
    mutationFn: async ({ uid, cart }: { uid: string; cart: CartType }) => {
      // Check Inventory

      // Get Coupon
      if (!Auth.user || !profile) {
        throw new Error("No user");
      }

      let couponId = null;
      if (profile.memberType !== "free") {
        const token = await Auth.user.getIdToken();
        const couponRawResponse = await fetch(`/api/coupons/${uid}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const couponResponse = await couponRawResponse.json().catch(() => ({}));
        if (!couponRawResponse.ok) {
          throw new Error(couponResponse?.error ?? "Faild to get coupon id");
        }

        if (!couponResponse.couponId) throw new Error("Missing ConponId");
        couponId = couponResponse.couponId;
      }
      console.log({ couponId });
      const payload = { uid: profile.uid, email: profile.email, couponId };
      return;
      // stripe checkout sessions
      const rawResponse = await fetch("/api/products/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = await rawResponse.json().catch(() => ({}));
      if (!rawResponse.ok) {
        console.log(response);
        throw new Error(response?.error ?? "Checkout session failed");
      }

      if (!response?.url) throw new Error("Missing checkout URL");
      return response.url as string;
    },
    onSuccess: (url) => {
      toast.success("付款成功，請妥善保管收據以便取貨");
      // window.location.href = url;
    },
    onError: (error) => {
      console.error(error);
      toast.error("付款失敗，請再試一次");
    },
  });

  if (isProfileLoading) {
    return <Loading />;
  }

  return (
    <div className="container min-h-svh max-w-3xl px-4 py-16 mx-auto space-y-16">
      <ul className="flex flex-col gap-5">
        {cartItems > 0 &&
          Object.entries(cart).map(([_priceId, item]) => {
            const { quantity, product } = item;

            const { name, imageURLs, priceId, inventory } = product;

            return (
              <Item key={priceId} variant="outline" className="bg-neutral-900">
                <ItemContent>
                  <div className="flex gap-5 items-center-safe justify-center-safe">
                    <img src={imageURLs.at(0)} className="h-13 w-13" alt="" />

                    <div>
                      <ItemTitle>{name}</ItemTitle>
                      <ItemDescription>A simple item with title and description.</ItemDescription>
                    </div>
                  </div>
                </ItemContent>
                <ItemActions className="justify-center w-full sm:w-fit">
                  <Input
                    type="number"
                    className="h-12 w-18 text-xl text-center font-mono"
                    value={quantity}
                    onChange={(e) => {
                      const newCount = e.target.valueAsNumber;
                      if (newCount > inventory) {
                        toast.warning("超過庫存數");
                        return;
                      }

                      setCart((prev) => {
                        if (!Number.isFinite(newCount) || newCount <= 0) {
                          const { [priceId]: _removed, ...rest } = prev;
                          return rest;
                        }

                        return {
                          ...prev,
                          [priceId]: { quantity: newCount, product },
                        };
                      });
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setCart((prev) => {
                        const { [priceId]: _removed, ...rest } = prev;
                        return rest;
                      });
                    }}
                  >
                    移除
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
      </ul>

      <div className="flex flex-col gap-5 justify-center-safe items-center-safe text-2xl">
        <p>
          <span>總額：</span>
          <span>{Cart.getTotalPrice(cart)}</span>
        </p>

        <div className="flex gap-5">
          <Button className="text-xl" variant={"secondary"} asChild>
            <Link href={"/bible-products"}>回到商品頁</Link>
          </Button>
          {cartItems > 0 && (
            <Button
              className="text-3xl"
              onClick={() => {
                if (!profile) {
                  toast.warning("請先登入再付款，謝謝！");
                  router.replace(`/signin?redirectTo=${currentPathname}`);
                  return;
                }

                //TODO: payMutation
                payMutation.mutate({ uid: profile.uid, cart });
              }}
            >
              付款
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
