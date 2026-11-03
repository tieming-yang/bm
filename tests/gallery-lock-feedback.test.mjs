import test from "node:test";
import assert from "node:assert/strict";
import { loadSourceModule } from "./helpers/source-module.mjs";

function all(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((child) => all(child, predicate));
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}

function renderGallery(memberType, ids = ["a", "b", "c", "d"]) {
  const states = [];
  let cursor = 0;
  const effects = [];
  const artworks = ids.map((id) => ({ id, book: "Genesis", title: id.toUpperCase(), section: id, imageUrl: `${id}.jpg`, scripture: "Text", videoUrl: null, voUrl: "" }));
  const { ImageGallery } = loadSourceModule("src/components/image-gallery.tsx", {
    react: { useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; }, useRef: () => ({ current: null }), useEffect: (effect) => effects.push(effect) },
    "next/navigation": { useRouter: () => ({ replace() { throw new Error("Rendering a gallery must not navigate"); } }), usePathname: () => "/bible-gallery", useSearchParams: () => new URLSearchParams("image=d") },
    "next/image": "Image", "next/link": "Link", "framer-motion": { motion: {} },
    "lucide-react": new Proxy({}, { get: (_, name) => name }),
    "./ui/button": { Button: "Button" }, "./ui/dialog": { Dialog: "Dialog", DialogContent: "DialogContent", DialogTitle: "DialogTitle" }, "./ui/content-state": { ContentState: "ContentState" },
    "@/components/ui/carousel": { Carousel: "Carousel", CarouselContent: "CarouselContent", CarouselItem: "CarouselItem" },
    "./donation-sheet": { DonationSheet: "DonationSheet" }, "./ui/aspect-ratio": { AspectRatio: "AspectRatio" },
    "../hooks/use-translation": () => ({ t: (key) => key, currentLanguage: "en" }),
    "@/models/config": { aspectRatio: 1.7 }, sonner: { toast: {} }, "../app/loading": "Loading",
    "@/hooks/use-profile": () => ({ profile: { memberType }, isProfileLoading: false }),
    "@/models/bible-artworks": { toLocaleScripture: (items) => items, toGrouped: (items) => ({ Genesis: items }), toSoredGroupsCanonical: (group) => Object.entries(group), order: ["Genesis"] },
    "./youtube-player": { YoutubePlayer: "YoutubePlayer" },
  });
  ImageGallery({ artworks, isGloryShareMember: memberType !== "free" });
  for (const effect of effects.splice(0)) effect();
  cursor = 0;
  return ImageGallery({ artworks, isGloryShareMember: memberType !== "free" });
}

test("a direct link to a locked artwork explains membership inside the lightbox without changing eligibility", () => {
  const tree = renderGallery("free");
  assert.equal(all(tree, (node) => node.type === "DialogTitle")[0].props.children, "D");
  assert.equal(all(tree, (node) => node.type === "p" && node.props.children === "controls.lockedDescription").length, 1);
  const link = all(tree, (node) => node.type === "Link" && node.props.href === "/glory-share")[0];
  assert.equal(link.props.children, "controls.membershipAction");
  assert.equal(link.props.onClick, undefined);
  assert.ok(all(tree, (node) => node.type === "Button" && node.props.onClick).length >= 3);
});

test("an eligible member sees the same artwork without the membership explanation", () => {
  const tree = renderGallery("lifeTime");
  assert.equal(all(tree, (node) => node.type === "DialogTitle")[0].props.children, "D");
  assert.equal(all(tree, (node) => node.type === "Link" && node.props.href === "/glory-share").length, 0);
});

test("only the selected artwork exposes its membership action to keyboard and assistive technology", () => {
  const slides = all(renderGallery("free", ["a", "b", "c", "d", "e", "f"]), (node) => node.type === "CarouselItem");
  const active = slides.filter((slide) => !slide.props["aria-hidden"]);
  assert.equal(active.length, 1);
  assert.equal(active[0].key, "d");
  assert.equal(all(active, (node) => node.type === "Link" && node.props.href === "/glory-share").length, 1);
  for (const slide of slides) assert.equal(slide.props.inert, slide.key !== "d");
});
