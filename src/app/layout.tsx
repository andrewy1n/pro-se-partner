"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { SessionProvider } from "@/context/session-context";
import { CaseProvider } from "@/context/case-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">
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
