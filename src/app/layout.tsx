"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SessionProvider } from "@/context/session-context";
import { CaseProvider } from "@/context/case-context";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <QueryClientProvider client={queryClient}>
          {/* TODO: Keep cross-app polling defaults centralized in this provider stack. */}
          <SessionProvider>
            <CaseProvider>{children}</CaseProvider>
          </SessionProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
