export const Currency = {
  USD: "usd",
  TWD: "twd",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export const ADMIN_UID = "YqBaPnXiqBPzxokpPmBDM3TF7TQ2";
