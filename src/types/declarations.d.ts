// Allow importing JSON files in TypeScript
declare module "*.json" {
  const value: any;
  export default value;
}
