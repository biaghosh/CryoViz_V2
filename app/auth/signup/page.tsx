"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


export default function SignupPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    institution: "",
    phone: "",
    reason: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
  
    try {
      const res = await fetch("/api/auth/request-access", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response (not JSON):", errorText);
        throw new Error("Submission failed. Please check form or try again.");
      }
  
      const result = await res.json();
  
      if (result.success) {
        setMessage("Request sent! We’ll be in touch.");
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          institution: "",
          phone: "",
          reason: "",
        });
      } else {
        setMessage(result.error || "Something went wrong.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-6 py-8 rounded-lg border border-border shadow-md bg-background text-foreground">
      <div className="text-center mb-6 space-y-1">
        <h1 className="text-xl font-bold">
          Request Access to{" "}
          <span className="font-trajan">CryoViz</span>
          <sup className="text-xs align-top">TM</sup> Web
        </h1>
        <p className="text-sm text-muted-foreground">
          Already have access? <a href="/auth/login" className="underline underline-offset-4">Login</a>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input name="firstName" value={form.firstName} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input name="lastName" value={form.lastName} onChange={handleChange} required />
          </div>
        </div>

        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="institution">Institution / Organization</Label>
          <Input name="institution" value={form.institution} onChange={handleChange} required />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="phone">Phone (with area code)</Label>
          <Input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            pattern="^\+?\d{10,15}$"
            title="Please include country code (e.g. +1XXXXXXXXXX)"
            required
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="reason">Reason for Access</Label>
          <Textarea name="reason" value={form.reason} onChange={handleChange}  />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Submitting..." : "Request Access"}
        </Button>
      </form>

      {message && <p className="text-center text-sm mt-4 text-muted-foreground">{message}</p>}

      <p className="mt-6 text-center text-xs text-muted-foreground text-center">
        A proud product of{" "}
        <a
          href="https://bioinvision.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-trajan text-base"
        >
          BioInvision
        </a>
        .
      </p>
    </div>
  );
}