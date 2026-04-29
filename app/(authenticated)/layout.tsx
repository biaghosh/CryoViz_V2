"use client";

import { SessionSync } from "@/components/SessionSync";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SessionSync />
      {children}
    </>
  );
}