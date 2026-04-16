// Allow importing JSON files in TypeScript
declare module "*.json" {
  const value: any;
  export default value;
}

declare module "aframe";

declare module "mind-ar/dist/mindar-image-aframe.prod.js";
