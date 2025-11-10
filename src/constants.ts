export const Currency = {
  USD: "usd",
  TWD: "twd",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];
