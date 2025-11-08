export const QueryKey = {
  // auth/session & profile
  signUp: ["auth", "signup"] as const,
  authUser: ["auth", "user"] as const,
  profile: (id: string) => ["profile", id] as const,
};
