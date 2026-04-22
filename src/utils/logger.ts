import Config from "@/models/config";

export default function logger(value: unknown) {
  if (Config.isProd) return;
  return console.debug("🔎", value);
}
