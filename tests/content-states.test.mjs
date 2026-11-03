import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import i18next from "i18next";
import { loadSourceModule } from "./helpers/source-module.mjs";

const musicPath = new URL("../src/app/(works)/beyond-music/client-page.tsx", import.meta.url).pathname;
const playerPath = new URL("../src/app/(works)/beyond-music/[title]/client-page.tsx", import.meta.url).pathname;
const shopPath = new URL("../src/app/(shop)/components/shopify-handoff.tsx", import.meta.url).pathname;

async function translations(language) {
  const instance = i18next.createInstance();
  const resources = {};
  for (const namespace of ["beyond-music", "bible-products", "ui"]) {
    resources[namespace] = JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/${namespace}.json`, import.meta.url), "utf8"));
  }
  await instance.init({ lng: language, resources: { [language]: resources }, defaultNS: "ui" });
  return { t: (namespace) => ({ t: instance.getFixedT(language, namespace) }), resources };
}

for (const language of ["en", "zh-TW"]) {
  const { t, resources } = await translations(language);

  function musicPage(path, result) {
    const states = [];
    let retries = 0;
    const imports = {
      "@/hooks/use-translation": { __esModule: true, default: t },
      "@tanstack/react-query": { useQuery: () => ({ ...result, refetch: () => { retries += 1; return Promise.resolve(); } }) },
      "@/utils/query-keys": { QueryKey: { songs: "songs" } },
      "@/models/song": { __esModule: true, default: {} },
      "next/link": { __esModule: true, default: ({ href, children }) => React.createElement("a", { href }, children) },
      "@/app/loading": { __esModule: true, default: () => React.createElement("p", { role: "status" }, "loading") },
      "@/components/ui/content-state": { ContentState: (props) => { states.push(props); return React.createElement("p", { role: props.kind === "error" ? "alert" : "status" }, props.title); } },
      "@next/third-parties/google": { sendGAEvent: () => {} },
      "@/components/intro": { __esModule: true, default: () => null },
      "@/components/protected-route": { __esModule: true, default: ({ children }) => children },
      "../components/audio-player": { __esModule: true, default: ({ song }) => React.createElement("p", null, song.title) },
    };
    const Page = loadSourceModule(path, imports).default;
    const markup = renderToStaticMarkup(React.createElement(Page, { title: "Selected%20song" }));
    return { markup, states, retries: () => retries };
  }

  for (const path of [musicPath, playerPath]) {
    test(`music shows localized retryable failure instead of empty content in ${language}: ${path === musicPath ? "list" : "detail"}`, () => {
      const page = musicPage(path, { error: new Error("network"), isLoading: false });
      assert.equal(page.states.length, 1);
      assert.equal(page.states[0].kind, "error");
      assert.equal(page.states[0].title, resources.ui.loading.error.title);
      assert.equal(page.retries(), 0);
      page.states[0].onRetry();
      assert.equal(page.retries(), 1);
    });

    test(`music distinguishes loading from missing content in ${language}: ${path === musicPath ? "list" : "detail"}`, () => {
      const loading = musicPage(path, { isLoading: true });
      assert.match(loading.markup, /role="status"/);
      assert.equal(loading.states.length, 0);
      const empty = musicPage(path, { isLoading: false, data: [] });
      assert.equal(empty.states[0].kind, "empty");
      assert.equal(empty.states[0].title, path === musicPath ? resources["beyond-music"].beyondMusic.empty : resources["beyond-music"].beyondMusic.notFound);
    });
  }

  test(`music detail renders the requested song after data resolves in ${language}`, () => {
    const page = musicPage(playerPath, { isLoading: false, data: [{ title: "Selected song" }] });
    assert.equal(page.states.length, 0);
    assert.match(page.markup, /Selected song/);
  });

  for (const purpose of ["catalog", "cart", "orders"]) {
    test(`legacy ${purpose} offers a fixed Shopify handoff and localized help in ${language}`, () => {
      const Handoff = loadSourceModule(shopPath, {
        "@/hooks/use-translation": { __esModule: true, default: t },
        "@/components/ui/button": { Button: ({ children }) => children },
        "next/link": { __esModule: true, default: ({ href, children }) => React.createElement("a", { href }, children) },
      }).default;
      const html = renderToStaticMarkup(React.createElement(Handoff, { purpose }));
      assert.ok(html.includes(resources["bible-products"].handoff[purpose].title));
      assert.match(html, /href="https:\/\/shop\.beyond-media\.art\/"/);
      assert.match(html, /href="mailto:beyonddigitalmedia\.art@gmail\.com"/);
      assert.doesNotMatch(html, /session_id|checkout_sessions|cs_test|cs_live/);
      if (purpose === "cart") assert.ok(html.includes(resources["bible-products"].handoff.cart.cartNotice));
      if (purpose === "orders") assert.ok(html.includes(resources["bible-products"].handoff.orders.description));
    });
  }
}

for (const language of ["en", "zh-TW"]) {
  test(`membership checkout prevents additional actions while a selected plan is pending in ${language}`, async () => {
    const messages = JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/glory-share.json`, import.meta.url), "utf8"));
    const instance = i18next.createInstance();
    await instance.init({ lng: language, resources: { [language]: { "glory-share": messages } } });
    const buttons = [];
    let checkoutAttempts = 0;
    const prices = {
      MONTHLY_PRICE: "7.7", YEARLY_PRICE: "77", LIFE_TIME_PRICE: "777", ORG_LIFE_TIME_PRICE: "7777",
      getMonthlyPriceId: () => "monthly", getYearlyPriceId: () => "yearly",
      getLiftTimePriceId: () => "lifetime", getORGLieftTimePriceId: () => "organization",
      getORGLifeTimeCouponId: () => "discount", ORG_LIFE_TIME_COUPON_CODE: "CHURCH50OFF",
    };
    const Page = loadSourceModule(new URL("../src/app/(support)/components/pricing-section.tsx", import.meta.url).pathname, {
      "@/app/loading": { __esModule: true, default: () => null, ActionSpinner: () => React.createElement("span", { role: "status" }, "pending") },
      "@/components/ui/button": { Button: (props) => { buttons.push(props); return React.createElement("button", { disabled: props.disabled }, props.children); } },
      "@/hooks/use-profile": { __esModule: true, default: () => ({ profile: { uid: "member", email: "member@example.test" }, isProfileLoading: false }) },
      "@/lib/utils": { cn: (...parts) => parts.filter(Boolean).join(" ") },
      "@/models/prices": { __esModule: true, default: prices },
      "@/models/profiles": { __esModule: true, default: { isGloryShareMember: () => false } },
      "@tanstack/react-query": { useMutation: () => ({ isPending: true, variables: { priceId: "yearly" }, mutate: () => { checkoutAttempts += 1; } }) },
      "next/navigation": { usePathname: () => "/glory-share/join", useRouter: () => ({ push: () => {} }), useSearchParams: () => new URLSearchParams() },
      "@/hooks/use-translation": { __esModule: true, default: () => ({ t: instance.getFixedT(language, "glory-share"), currentLanguage: language }) },
      "sonner": { toast: {} },
    }).default;
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.equal(buttons.length, 4);
    assert.ok(buttons.every((button) => button.disabled));
    assert.deepEqual(buttons.map((button) => button["aria-busy"]), [false, true, false, false]);
    for (const button of buttons) button.onClick();
    assert.equal(checkoutAttempts, 0);
    assert.ok(html.includes(new Intl.NumberFormat(language, { style: "currency", currency: "USD", currencyDisplay: "code" }).format(7.7)));
    assert.ok(html.includes(new Intl.NumberFormat(language, { style: "currency", currency: "USD", currencyDisplay: "code" }).format(Math.floor(7777 * 0.5))));
  });
}
