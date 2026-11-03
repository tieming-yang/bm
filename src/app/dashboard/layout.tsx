import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="font-sans min-h-svh w-full">{children}</div>;
}
