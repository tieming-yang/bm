// @ts-nocheck

import { NextResponse } from "next/server";
import { assertIsDefined } from "@/lib/utils";
import { Client, PageObjectResponse } from "@notionhq/client";
import { ApiError } from "../api";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

const notion = new Client({ auth: process.env.NOTION_PRODUCTS_INTEGRATION_TOKEN });
const dbID = process.env.PRODUCTS_DB_ID;

export async function GET() {
  try {
    if (!process.env.NOTION_PRODUCTS_INTEGRATION_TOKEN || !dbID) {
      throw new ApiError(500);
    }

    const { results } = await notion.databases.query({
      database_id: dbID,
      sorts: [{ property: "created_at", direction: "ascending" }],
      page_size: 100,
      filter: {
        property: "is_listed",
        checkbox: {
          equals: true,
        },
      },
    });

    const entries = results.map((page: PageObjectResponse) => {
      const id = page.properties.id?.rich_text?.[0]?.plain_text ?? "";
      const name = page.properties.name?.title?.[0]?.plain_text ?? "";
      const slug = page.properties.slug?.rich_text?.[0].plain_text ?? "";
      const category = page.properties.category.multi_select.map((select) => ({
        id: select.id,
        name: select.name,
      }));
      const imageURLs = page.properties.images?.files
        .map((image) => image?.file?.url)
        .filter(Boolean);
      const inventory = page.properties.inventory?.number ?? "";
      const isListed = page.properties.is_listed?.checkbox ?? false;
      const isFeatured = page.properties.is_featured?.checkbox ?? false;
      const isShippingRequired = page.properties.is_shipping_required?.checkbox ?? false;
      const description = page.properties.description?.rich_text?.[0]?.plain_text ?? "";
      const weight = page.properties.weight?.number ?? "";
      const productId = page.properties.product_id?.rich_text?.[0]?.plain_text ?? "";
      const priceId = page.properties.price_id?.rich_text?.[0]?.plain_text ?? "";
      const createdAt = page.properties.created_at?.date?.start ?? page.created_time;
      const updatedAt = page.properties.updated_at?.date?.start ?? page.created_time;

      return {
        category,
        createdAt,
        description,
        id,
        imageURLs,
        inventory,
        isFeatured,
        isListed,
        isShippingRequired,
        name,
        priceId,
        productId,
        slug,
        updatedAt,
        weight,
      };
    });

    const withPrice = await Promise.all(
      entries.map(async (entry) => {
        const price = await stripe.prices.retrieve(entry.priceId) as Stripe.Price
        return { ...entry, price: price.unit_amount }
      })
    )

    return NextResponse.json(withPrice);
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}
