import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSourceModule } from "./helpers/source-module.mjs";

const school = loadSourceModule("src/models/school.ts");
const slugs = loadSourceModule("src/utils/to-slug.ts");
const policy = loadSourceModule("src/lib/school/selection.ts", { "@/models/school": school, "@/utils/to-slug": slugs });
const en = JSON.parse(readFileSync("src/lib/i18n/locales/en/school.json", "utf8"));
const zh = JSON.parse(readFileSync("src/lib/i18n/locales/zh-TW/school.json", "utf8"));
const { createSchoolLessons, resolveSchoolSelection, adjacentSchoolLesson } = policy;
const lessons = createSchoolLessons(en.school.curriculums, en.school.curriculums);

function all(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((child) => all(child, predicate));
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}

test("unknown school parameters retain the first-lesson defaults without invalid curriculum indexing", () => {
  for (const course of [null, "unknown", "__proto__"]) {
    const selection = resolveSchoolSelection(lessons, { course, lesson: "missing" });
    assert.equal(selection.course, "genesis");
    assert.equal(selection.lesson.id, "01");
  }
  assert.equal(resolveSchoolSelection(lessons, { course: "characters", lesson: "missing" }).lesson.id, "adam");
});

test("school localization preserves canonical slugs by ID even when translated lesson order differs", () => {
  const reordered = { ...zh.school.curriculums, genesis: { ...zh.school.curriculums.genesis, lessons: [...zh.school.curriculums.genesis.lessons].reverse() } };
  const translated = createSchoolLessons(reordered, en.school.curriculums);
  const selected = resolveSchoolSelection(translated, { course: "genesis", lesson: "fish" });
  assert.equal(selected.lesson.id, "01");
  assert.equal(selected.lesson.title, "魚");
  assert.equal(selected.lesson.slug, "fish");
});

test("school adjacency wraps within its selected curriculum and rejects impossible selections", () => {
  assert.equal(adjacentSchoolLesson(lessons.genesis, "01", "previous").id, lessons.genesis.at(-1).id);
  assert.equal(adjacentSchoolLesson(lessons.genesis, lessons.genesis.at(-1).id, "next").id, "01");
  assert.throws(() => adjacentSchoolLesson(lessons.genesis, "missing", "next"), /belong/);
  assert.throws(() => resolveSchoolSelection({ ...lessons, genesis: [] }, { course: "genesis", lesson: null }), /no lessons/);
});

function pageHarness() {
  let search = "course=genesis&lesson=fish&source=shared";
  let language = "en";
  const navigation = [];
  const { default: Page } = loadSourceModule("src/app/(works)/school/page.tsx", {
    react: { useCallback: (callback) => callback, useEffect() {}, useRef: () => ({ current: null }) },
    "next/navigation": { usePathname: () => "/school", useSearchParams: () => new URLSearchParams(search), useRouter: () => ({ replace: (href) => { navigation.push(href); search = href.split("?")[1] ?? ""; } }) },
    "next/link": "Link", "./components/school-video-player": "Player", "framer-motion": { useReducedMotion: () => true },
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/card": Object.fromEntries(["Card", "CardHeader", "CardTitle", "CardDescription"].map((name) => [name, name])),
    "@/components/ui/tabs": Object.fromEntries(["Tabs", "TabsContent", "TabsList", "TabsTrigger"].map((name) => [name, name])),
    "lucide-react": { ChevronLeftIcon: "PreviousIcon", ChevronRightIcon: "NextIcon" },
    "@/models/school": school, "@/lib/school/selection": policy,
    "@/hooks/use-translation": (namespace, options) => ({ t: (key) => {
      if (namespace === "ui") return key;
      const resource = options?.lng === "en" || language === "en" ? en : zh;
      return key.split(".").reduce((value, part) => value[part], resource);
    } }),
  });
  return { render: () => Page(), navigation, changeLanguage: (value) => { language = value; }, changeQuery: (value) => { search = value; } };
}

test("school keyboard, pointer, next/previous, and completion update the same URL selection", () => {
  const harness = pageHarness();
  let tree = harness.render();
  all(tree, (node) => node.type === "Button" && node.props["aria-label"] === "actions.next")[0].props.onClick();
  assert.equal(harness.navigation.at(-1), "/school?course=genesis&lesson=job&source=shared");
  tree = harness.render();
  assert.ok(all(tree, (node) => node.type === "Player")[0].props.src.includes("afCWlscA5Io"));
  const cards = all(tree, (node) => node.type === "Card" && node.props.role === "button");
  cards[2].props.onKeyDown({ key: "Enter", preventDefault() {} });
  assert.equal(harness.navigation.at(-1), "/school?course=genesis&lesson=noah-s-ark&source=shared");
  all(harness.render(), (node) => node.type === "Card" && node.props.role === "button").at(-1).props.onClick();
  tree = harness.render();
  all(tree, (node) => node.type === "Player")[0].props.onEnded();
  assert.equal(harness.navigation.at(-1), "/school?course=genesis&lesson=fish&source=shared");
  all(harness.render(), (node) => node.type === "Card" && node.props.role === "button")[1].props.onClick();
  assert.equal(harness.navigation.at(-1), "/school?course=genesis&lesson=job&source=shared");
});

test("school query changes and language switches resolve immediately without mount-only state", () => {
  const harness = pageHarness();
  let tree = harness.render();
  all(tree, (node) => node.type === "Tabs")[0].props.onValueChange("characters");
  assert.equal(harness.navigation.at(-1), "/school?course=characters&lesson=create-adam&source=shared");
  harness.changeLanguage("zh-TW");
  tree = harness.render();
  assert.ok(all(tree, (node) => node.type === "CardTitle").some((node) => node.props.children === "創造亞當"));
  harness.changeQuery("course=genesis&lesson=job");
  tree = harness.render();
  assert.ok(all(tree, (node) => node.type === "Player")[0].props.src.includes("afCWlscA5Io"));
  assert.ok(all(tree, (node) => node.type === "CardTitle").some((node) => node.props.children === "約伯記"));
  assert.equal(all(tree, (node) => node.type === "Link" && node.props.href === "/school/summer/2026/registration").length, 0);
});
