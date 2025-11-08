import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED = ["zh-TW", "en"];
const DEFAULT_LANG = "zh-TW";

export function proxy(req: NextRequest) {
  // const accept = req.headers.get("accept-language") ?? "";
  // const preferred =
  //   accept
  //     .split(",")
  //     .map((token) => token.split(";")[0].trim())
  //     .find((lang) => SUPPORTED.includes(lang)) ?? DEFAULT_LANG;
  // const res = NextResponse.next();
  // res.headers.set("x-user-lang", preferred);
  // return res;
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};
