export const Role = {
  Admin: "admin",
  Staff: "staff",
  User: "user",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Policy = {
  isAdmin(role: string | null | undefined): boolean {
    return role === Role.Admin;
  },
  isStaff(role: string | null | undefined): boolean {
    return role === Role.Staff;
  },
  isPrivileged(role: string | null | undefined): boolean {
    return role === Role.Admin || role === Role.Staff;
  },
  canViewSummerSchool(role: string | null | undefined): boolean {
    return role === Role.Admin || role === Role.Staff;
  },
  canViewAR(role: string | null | undefined): boolean {
    return role === Role.Admin;
  },
};
