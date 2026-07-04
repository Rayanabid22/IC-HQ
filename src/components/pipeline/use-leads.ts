"use client";

import { canMove } from "@/components/pipeline/stages";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Lead, LeadStage } from "@/lib/types";
import { addDays, currentMonthPKT, todayPKT } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at");
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("leads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  /** Move a lead between stages, enforcing the two-touch rule, logging activity. */
  const moveLead = useCallback(
    async (
      lead: Lead,
      to: LeadStage,
      extra?: { deal_value?: number; closed_at?: string; note?: string }
    ): Promise<boolean> => {
      if (!canMove(lead.stage, to)) return false;

      const patch: Partial<Lead> = { stage: to };
      // sending a touch stamps the touch date and schedules the follow-up
      if (to === "touch_1" || to === "touch_2") {
        patch.last_touch_date = todayPKT();
        patch.next_follow_up_date = addDays(todayPKT(), 3);
      }
      if (to === "converted") {
        patch.deal_value = extra?.deal_value ?? lead.estimated_value;
        patch.closed_at = extra?.closed_at ?? todayPKT();
        patch.next_follow_up_date = null;
      }
      if (to === "dead" || to === "call_booked") {
        patch.next_follow_up_date = to === "dead" ? null : lead.next_follow_up_date;
      }

      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, ...patch } : l)));

      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("leads").update(patch).eq("id", lead.id);
      if (error) {
        setLeads((ls) => ls.map((l) => (l.id === lead.id ? lead : l)));
        return false;
      }

      await supabase.from("lead_activity").insert({
        lead_id: lead.id,
        actor: auth.user?.id,
        from_stage: lead.stage,
        to_stage: to,
        note: extra?.note ?? null,
      });

      // converted deals count toward the month's revenue automatically
      if (to === "converted") {
        await supabase.from("revenue_entries").insert({
          source: "pipeline",
          amount: patch.deal_value,
          month: (patch.closed_at ?? todayPKT()).slice(0, 7),
          lead_id: lead.id,
          note: `${lead.name}${lead.company ? ` — ${lead.company}` : ""}`,
          created_by: auth.user?.id,
        });
      }
      return true;
    },
    [supabase]
  );

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      await supabase.from("leads").update(patch).eq("id", id);
    },
    [supabase]
  );

  const stats = {
    thisMonth: leads.filter((l) => l.created_at.slice(0, 7) === currentMonthPKT()).length,
    converted: leads.filter((l) => l.stage === "converted").length,
    conversionRate: (() => {
      const closed = leads.filter((l) => l.stage === "converted" || l.stage === "dead").length;
      const won = leads.filter((l) => l.stage === "converted").length;
      return closed === 0 ? 0 : Math.round((won / closed) * 100);
    })(),
    revenueThisMonth: leads
      .filter((l) => l.stage === "converted" && (l.closed_at ?? "").slice(0, 7) === currentMonthPKT())
      .reduce((s, l) => s + Number(l.deal_value ?? 0), 0),
  };

  const followUpsDue = leads.filter(
    (l) =>
      l.next_follow_up_date &&
      l.next_follow_up_date <= todayPKT() &&
      l.stage !== "converted" &&
      l.stage !== "dead"
  );

  return { leads, loading, moveLead, updateLead, stats, followUpsDue, reload: load };
}
