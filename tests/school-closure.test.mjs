import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import i18next from "i18next";
import { loadSourceModule } from "./helpers/source-module.mjs";

const domainPath = new URL("../src/app/(works)/school/summer/2026/domain.ts", import.meta.url).pathname;
const domain = loadSourceModule(domainPath);
const routePath = (name) => new URL(`../src/app/api/school/events/[eventSlug]/${name}/route.ts`, import.meta.url).pathname;
const context = (eventSlug = domain.EVENT_SLUG) => ({ params: Promise.resolve({ eventSlug }) });

function route(name, { role = "staff" } = {}) {
  let registrationReads = 0;
  let authenticationCalls = 0;
  let profileReads = 0;
  const api = {
    getBearerToken: () => "fake-token",
    throwAPIError(status, message) { throw Object.assign(new Error(message), { status }); },
    getErrorInfo: (error) => ({ status: error.status ?? 500, message: error.message }),
  };
  const module = loadSourceModule(routePath(name), {
    "@/app/api/api": { __esModule: true, default: api },
    "@/app/(works)/school/summer/2026/domain": domain,
    "@/lib/firebase/firebase-admin": { __esModule: true, default: {
      auth: { verifyIdToken: async () => { authenticationCalls++; return { uid: "staff-member" }; } },
      db: {
        runTransaction() { throw new Error("Closed registration must not write"); },
        doc: () => ({ get: async () => { profileReads++; return { exists: true, data: () => ({ role }) }; } }),
        collection: () => ({ where: () => ({ get: async () => { registrationReads++; return { docs: [] }; } }) }),
      },
    } },
    "firebase-admin/firestore": { FieldValue: {} },
    "@/lib/policy": { Policy: { canViewSummerSchool: (value) => value === "staff" || value === "admin" } },
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  return { ...module, reads: () => registrationReads, effects: () => authenticationCalls + profileReads + registrationReads };
}

for (const [name, method] of [["registrations", "POST"], ["capacity", "GET"]]) {
  test(`closed ${name} returns 410 before parsing, authentication, or database access`, async () => {
    const handler = route(name);
    const response = await handler[method]({ json() { throw new Error("Must not parse stale form"); } }, context());
    assert.equal(response.status, 410);
    assert.deepEqual(await response.json(), { error: "REGISTRATION_CLOSED" });
    assert.equal(handler.reads(), 0);
    assert.equal(handler.effects(), 0);
  });

  test(`${name} preserves unknown-event 404`, async () => {
    const response = await route(name)[method]({}, context("unknown-event"));
    assert.equal(response.status, 404);
  });
}

test("staff can still read finished-camp records", async () => {
  const handler = route("registrations");
  const response = await handler.GET({}, context());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { rows: [] });
  assert.equal(handler.reads(), 1);
});

test("closing registration does not grant visitors staff access", async () => {
  const handler = route("registrations", { role: "user" });
  const response = await handler.GET({}, context());
  assert.equal(response.status, 404);
  assert.equal(handler.reads(), 0);
});

for (const language of ["en", "zh-TW"]) {
  test(`old registration URL renders a form-free closed notice in ${language}`, async () => {
    const messages = JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/school.json`, import.meta.url), "utf8"));
    const instance = i18next.createInstance();
    await instance.init({ lng: language, resources: { [language]: { school: messages } } });
    const Closed = loadSourceModule(new URL("../src/app/(works)/school/summer/2026/registration/registration-closed.tsx", import.meta.url).pathname, {
      "@/hooks/use-translation": { __esModule: true, default: () => ({ t: instance.getFixedT(language, "school") }) },
      "@/components/ui/button": { Button: ({ children }) => children },
      "next/link": { __esModule: true, default: ({ href, children }) => React.createElement("a", { href }, children) },
    }).default;
    const markup = renderToStaticMarkup(React.createElement(Closed));
    assert.ok(markup.includes(messages.school.registration.closedTitle));
    assert.match(markup, /href="\/school"/);
    assert.match(markup, /href="\/contact"/);
    assert.doesNotMatch(markup, /<form|<input/);
  });
}

test("finished registration is not advertised or indexed", () => {
  const metadata = loadSourceModule(new URL("../src/app/metadata.ts", import.meta.url).pathname, {
    "@/models/config": { __esModule: true, default: { baseUrl: "https://example.test", OGImage: "/og.png" } },
  });
  assert.equal(metadata.pageMetadata.schoolSummer2026Registration.robots.index, false);
  const school = readFileSync(new URL("../src/app/(works)/school/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(school, /href="\/school\/summer\/2026\/registration"/);
  const metadataSource = readFileSync(new URL("../src/app/metadata.ts", import.meta.url), "utf8");
  assert.doesNotMatch(metadataSource, /\{ path: "\/school\/summer\/2026\/registration", changeFrequency/);
});
