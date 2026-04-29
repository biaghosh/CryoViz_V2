"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Step 1: Check if user exists
    const resCheck = await fetch("/api/auth/check-user", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });

    let check;
    try {
      check = await resCheck.json();
    } catch {
      setLoading(false);
      setMessage("Server connection failed during user check.");
      return;
    }

    if (!resCheck.ok || !check.exists) {
      setLoading(false);
      setMessage(
        check?.error || "User does not exist. Please contact inquiry@bioinvision.com. or Signup to send request for Access."
      );
      return;
    }

    // Step 2: Request OTP using direct API (no NextAuth involvement)
    try {
      const otpRes = await fetch("/api/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });

      setLoading(false);

      if (otpRes.ok) {
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      } else {
        let errorMsg = "Error sending OTP. Try again.";
        try {
          const errorData = await otpRes.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch { /* ignore JSON parse error */ }
        setMessage(errorMsg);
      }
    } catch (err: unknown) {
      console.error("LoginForm error:", err);
      setLoading(false);
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-2 font-medium">
              <h1 className="text-xl font-bold text-center">
                Welcome to <span className="font-trajan">CryoViz</span>
                <span className="align-baseline text-xs">™</span> Web
              </h1>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="/auth/signup" className="underline underline-offset-4">
                  Sign up
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending OTP..." : "Login via Email OTP"}
            </Button>
          </div>

          {message && (
            <p className="text-sm text-red-500 text-center -mt-3">{message}</p>
          )}

          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              
              <p className="text-sm text-muted-foreground text-center">
                <br/>
                A proud product of{" "}
                <a
                  href="https://bioinvision.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-trajan text-base "
                >
                  BioInvision
                </a>
                .
              </p>
            </span>
          </div>
        </div>
      </form>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
