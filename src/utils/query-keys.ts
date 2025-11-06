export const QueryKey = {
  // auth/session & profile
  authUser: ["auth", "user"] as const,
  profile: (id: string) => ["profile", id] as const,
};
