import Link from "next/link";
const sandboxes = [
  {
    title: "Depth 3D",
    path: "/sandbox/depth-3d",
  },
  {
    title: "AR",
    path: "/sandbox/ar",
  },
];
export default function SandBox() {
  return (
    <main className="container flex justify-center min-h-svh items-center-safe">
      <ul className="space-y-5">
        {sandboxes.map((s) => {
          return (
            <li key={s.title}>
              <Link href={s.path}>{s.title}</Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
