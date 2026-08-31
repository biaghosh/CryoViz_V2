"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

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

    try {
      // Attempt to sign in directly with email
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        redirect: false,
      });

      if (result?.error) {
        setMessage("User does not exist. Please contact inquiry@bioinvision.com or Sign up to request access.");
        setLoading(false);
        return;
      }

      if (result?.ok) {
        // Redirect to home page on successful login
        router.push("/home");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setMessage("An error occurred during login. Please try again.");
      setLoading(false);
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
              {loading ? "Logging in..." : "Login"}
            </Button>
          </div>
          {/* Logo Section */}
          <div className="flex justify-center -mb-2 mt-2">
            <Image 
              src="/images/biv-logo.png" 
              alt="BioInvision Logo" 
              width={120}
              height={120} 
              className="object-contain"
            />
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
