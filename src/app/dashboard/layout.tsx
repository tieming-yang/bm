import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="font-mono min-h-svh w-full">{children}</div>;
}
