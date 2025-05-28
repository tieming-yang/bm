"use client";

import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-6 text-lg">
        <span className="block">找不到您要的頁面。</span>
        <span className="block">The page you are looking for does not exist.</span>
        <span className="block">お探しのページは見つかりませんでした。</span>
      </p>
      <Button onClick={() => router.push("/")} className="px-8 rounded-3xl">
        返回首頁 / Back to Home / ホームに戻る
      </Button>
    </div>
  );
}
