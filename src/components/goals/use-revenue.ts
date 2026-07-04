"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Goal, RevenueEntry } from "@/lib/types";
import { currentMonthPKT } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

export function useRevenue() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();
  const month = currentMonthPKT();

  const load = useCallback(async () => {
    const [{ data: goals }, { data: revenue }] = await Promise.all([
      supabase.from("goals").select("*").eq("type", "revenue").eq("month", month).limit(1),
      supabase.from("revenue_entries").select("*").eq("month", month).order("created_at", { ascending: false }),
    ]);
    setGoal((goals?.[0] as Goal) ?? null);
    setEntries((revenue ?? []) as RevenueEntry[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const current = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const target = Number(goal?.target_amount ?? 0);

  return { goal, entries, current, target, month, loading, reload: load };
}
