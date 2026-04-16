import Link from "next/link";
export default function SandBox() {
  return (
    <main className="container min-h-svh flex justify-center items-center-safe">
      <ul className="space-y-5">
        <li>
          <Link href="/sandbox/depth-3d">Depth 3D</Link>
        </li>
        <li>
          <Link href="/sandbox/ar">AR</Link>
        </li>
      </ul>
    </main>
  );
}
