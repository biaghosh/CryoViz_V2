"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import type { Session } from "next-auth";
import { PostHogProvider } from "@/app/posthog-provider";
import PostHogPageView from "@/app/PostHogPageView";

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

export function Providers({ children, session }: { children: React.ReactNode, session: Session | null }) {
  return (
    <SessionProvider 
      session={session} 
      refetchInterval={0} // Disable automatic refetching to prevent session loss
      refetchOnWindowFocus={false} // Disable focus refresh to prevent session interruption
      refetchWhenOffline={false}
      basePath="/api/auth" // Explicitly set the auth base path
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            <PostHogPageView />
            {children}
          </PostHogProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}