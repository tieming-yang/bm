import Config from "@/models/config";

export function getR2URL(path: string) {
  return Config.r2ARAssetsBaseURL + path;
}
