"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

// ---- inner component (uses useSearchParams) ----
function OTPVerifyInner() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams(); // must be within Suspense
  const email = searchParams.get("email") ?? "";
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  const res = await signIn("credentials", {
    email,
    otp,
    redirect: false, // <--- Add this to stop the "hard" reload
  });

  if (res?.ok && !res?.error) {
    // Manually push the route. This allows the NextAuth 
    // client-side provider to update its internal state first.
    router.push("/users_datasets");
    router.refresh(); 
  } else {
    setLoading(false);
    setError(res?.error || "Invalid OTP");
  }
};

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto mt-20">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 font-medium">
          <h1 className="text-xl font-bold text-center">
            Enter OTP for <span className="font-trajan">CryoViz</span>
            <span className="align-baseline text-xs">™</span> Web
          </h1>
          <p className="text-sm text-muted-foreground">
            Sent to <span className="font-medium">{email || "(missing email)"}</span>
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </Button>

        {error && <p className="text-sm text-red-500 text-center -mt-3">{error}</p>}
      </form>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        <p>
          A proud product of{" "}
          <a
            href="https://bioinvision.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-trajan text-sm"
          >
            BioInvision
          </a>
          .
        </p>
      </div>
    </div>
  );
}

// ---- page export (wrap in Suspense) ----
export default function OTPVerifyPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-20">Loading…</div>}>
      <OTPVerifyInner />
    </Suspense>
  );
}
