"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function SessionSync() {
  const { status, update } = useSession();
  const [isRecovering, setIsRecovering] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const attemptSessionRecovery = async () => {
      // Only attempt recovery if unauthenticated and haven't tried too many times
      if (status === "unauthenticated" && !isRecovering && attempts < 3) {
        setIsRecovering(true);
        setAttempts(prev => prev + 1);
        
        if (process.env.NODE_ENV === "development") {
          console.log(`🔄 SessionSync: Attempt ${attempts + 1} - Gentle session recovery...`);
        }
        
        try {
          // Strategy 1: Try session update first (gentle approach)
          await update();
          
          // Give it a moment to see if the update worked
          setTimeout(async () => {
            if (status === "unauthenticated") {
              // Strategy 2: Force a fresh session fetch
              await fetch("/api/auth/session", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" }
              });
              
              // Try update again
              await update();
              
              // If still not working after 3 attempts, do a gentle refresh
              if (attempts >= 2 && status === "unauthenticated") {
                if (process.env.NODE_ENV === "development") {
                  console.log("🔄 SessionSync: Gentle page refresh needed");
                }
                window.location.href = window.location.href;
              }
            }
            setIsRecovering(false);
          }, 1500);
          
        } catch (error) {
          console.error("SessionSync error:", error);
          setIsRecovering(false);
        }
      }
    };

    // Only run if status is not loading
    if (status !== "loading") {
      attemptSessionRecovery();
    }
  }, [status, update, isRecovering, attempts]);

  return null;
}

// Extend window type for the global flag
declare global {
  interface Window {
    __sessionSyncAttempted?: boolean;
    __sessionSyncInProgress?: boolean;
  }
}
