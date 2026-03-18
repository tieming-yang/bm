import enSchoolLocal from "@/lib/i18n/locales/en/school.json";
import { toSlug } from "../page";
import { exec } from "node:child_process";

/**
 * @example https://beyond-media.art/school?lesson=god-makes-the-world
 * @see https://github.com/mrinfinidy/qrcode-pretty?tab=readme-ov-file#qr-code-afkdev8-my-homepage
 */
const PATH = "https://beyond-media.art/school?lesson=";
async function main() {
  const lessons = enSchoolLocal.school.lessons;

  console.debug("🔎", "Start QR Code Generation");

  // qrcode-pretty --data "https://www.afkdev8.com/" --image "~/Pictures/afkdev8-logo.png" --style vertical-bars --style-inner round --style-outer round --base "#000000" --color-inner "#000000" --color-outer "#000000" --output "~/Pictures/"
  let count = 0;
  for await (const lesson of lessons) {
    const url = `${PATH}${toSlug(lesson.title)}`;
    exec(
      `qrcode-pretty --data ${url} --image "public/logos/logo.webp" --style vertical-bars --style-inner round --style-outer round --base "#000000" --color-inner "#000000" --color-outer "#000000" --output "src/app/(works)/school/scripts/data/${lesson.id}.png"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(error);
          return;
        }
        console.log(stdout);
        console.error(stderr);
      }
    );
    count += 1;
  }
}

await main().catch((error) => console.error("❌", error));
