"use client";

import React, { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize in the browser, and only once
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (key && !posthog.has_opted_out_capturing()) {
      posthog.init(key, {
        api_host: "https://us.i.posthog.com", // Direct connection instead of /ingest rewrite for Azure reliability
        ui_host: host || "https://us.i.posthog.com",
        person_profiles: "identified_only", 
        capture_pageview: false, // Disable automatic pageview capture, as we capture manually in PostHogPageView
        disable_session_recording: false, // Enable session recordings
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
