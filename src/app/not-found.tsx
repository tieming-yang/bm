"use client";

import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-lg mb-6">
        <span className="block">找不到您要的頁面。</span>
        <span className="block">The page you are looking for does not exist.</span>
        <span className="block">お探しのページは見つかりませんでした。</span>
      </p>
      <Button onClick={() => router.push("/")} className="rounded-3xl px-8">
        返回首頁 / Back to Home / ホームに戻る
      </Button>
    </div>
  );
}
