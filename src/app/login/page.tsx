"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message?.replace(/[{}\s]/g, "");
      setError(
        msg
          ? error.message
          : "Can't reach the database. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment settings, then redeploy."
      );
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <span className="h-3 w-3 rounded-full bg-[var(--ic-blue)] shadow-[0_0_16px_var(--ic-blue)]" />
          <h1 className="heading text-2xl">IC HQ</h1>
        </div>

        <div className="surface p-6">
          <h2 className="heading text-lg mb-1">Welcome back</h2>
          <p className="text-sm text-[#52525B] mb-6">
            Sign in with your Impact Creatives account.
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="email"
              required
              placeholder="you@impactcreatives.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error && <p className="text-[13px] text-ic-red">{error}</p>}
            <Button variant="primary" size="lg" className="w-full justify-center" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#52525B] mt-6">
          No public signup — ask an admin to invite you.
        </p>
        <p className="text-center text-[10px] text-[#3F3F46] mt-3 break-all">
          db: {process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "⚠ NEXT_PUBLIC_SUPABASE_URL is not set"} · key:{" "}
          {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().slice(0, 12)}… (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length} chars)`
            : "⚠ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"}
        </p>
      </motion.div>
    </div>
  );
}
