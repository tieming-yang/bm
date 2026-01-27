export const QueryKey = {
  //works
  artworks: ["artworks"] as const,
  songs: ["songs"] as const,
  products: ["products"] as const,
  coupon: (uid: string) => ["coupon", uid] as const,
  // auth/session & profile
  signUp: ["auth", "signup"] as const,
  authUser: ["auth", "user"] as const,
  profile: (id: string) => ["profile", id] as const,
};
