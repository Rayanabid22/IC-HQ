"use client";

import { ALLOWED_MOVES, STAGE_LABEL } from "@/components/pipeline/stages";
import { useApp } from "@/components/shell/app-context";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Lead, LeadActivity, LeadSource, LeadStage } from "@/lib/types";
import { formatDate, formatDateTime, formatUSD, todayPKT } from "@/lib/utils";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

/* ---------------- New lead ---------------- */

export function NewLeadDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { me, team } = useApp();
  const [form, setForm] = useState({
    name: "",
    company: "",
    source: "X" as LeadSource,
    country: "",
    icp_fit: false,
    estimated_value: "",
    owner: me.id,
    next_follow_up_date: "",
    notes: "",
    halal_gate: false,
    flagged: false,
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.halal_gate) {
      setError("The category gate must be checked before a lead can be saved.");
      return;
    }
    const { error } = await supabaseBrowser().from("leads").insert({
      name: form.name.trim(),
      company: form.company.trim() || null,
      source: form.source,
      country: form.country.trim() || null,
      icp_fit: form.icp_fit,
      estimated_value: Number(form.estimated_value) || 0,
      owner: form.owner,
      next_follow_up_date: form.next_follow_up_date || null,
      notes: form.notes.trim() || null,
      halal_gate: true,
      flagged: form.flagged,
    });
    if (error) {
      setError(error.message);
      return;
    }
    onCreated();
    onClose();
    setForm({ ...form, name: "", company: "", country: "", estimated_value: "", notes: "", halal_gate: false, flagged: false });
    setError(null);
  }

  return (
    <Dialog open={open} onClose={onClose} title="New lead">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input autoFocus required placeholder="Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          <Input placeholder="Company" value={form.company} onChange={(e) => set("company", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select value={form.source} onChange={(e) => set("source", e.target.value as LeadSource)}>
            <option value="X">X</option>
            <option value="referral">Referral</option>
            <option value="email">Email</option>
            <option value="other">Other</option>
          </Select>
          <Input placeholder="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min="0"
            placeholder="Estimated value (USD)"
            value={form.estimated_value}
            onChange={(e) => set("estimated_value", e.target.value)}
          />
          <Select value={form.owner} onChange={(e) => set("owner", e.target.value)}>
            {team.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs text-[#52525B] block mb-1">Next follow-up</label>
          <Input
            type="date"
            value={form.next_follow_up_date}
            onChange={(e) => set("next_follow_up_date", e.target.value)}
          />
        </div>
        <Textarea placeholder="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />

        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.icp_fit}
            onChange={(e) => set("icp_fit", e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--ic-blue)]"
          />
          ICP fit — funded SaaS?
        </label>

        {/* Halal gate — required */}
        <label className="flex items-start gap-2.5 text-sm cursor-pointer select-none rounded-xl bg-white/[0.03] hairline p-3">
          <input
            type="checkbox"
            checked={form.halal_gate}
            onChange={(e) => set("halal_gate", e.target.checked)}
            className="h-4 w-4 rounded accent-ic-green mt-0.5"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-ic-green" /> Passes category gate
            </span>
            <span className="text-xs text-[#71717A] block mt-0.5">
              No gambling/betting/prediction markets, no haram category.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.flagged}
            onChange={(e) => set("flagged", e.target.checked)}
            className="h-4 w-4 rounded accent-ic-amber"
          />
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-ic-amber" /> Flag as uncertain
          </span>
        </label>

        {error && <p className="text-[13px] text-ic-red">{error}</p>}
        <div className="flex justify-end pt-1">
          <Button variant="primary" type="submit" disabled={!form.halal_gate || !form.name.trim()}>
            Add lead
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Convert ---------------- */

export function ConvertDialog({
  lead,
  onClose,
  onConfirm,
}: {
  lead: Lead | null;
  onClose: () => void;
  onConfirm: (dealValue: number, closedAt: string) => void;
}) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayPKT());

  useEffect(() => {
    if (lead) {
      setValue(String(lead.estimated_value || ""));
      setDate(todayPKT());
    }
  }, [lead]);

  return (
    <Dialog open={!!lead} onClose={onClose} title={`Convert ${lead?.name ?? ""} 🎉`}>
      <p className="text-sm text-[#A1A1AA] mb-4">
        Final deal value counts toward this month&apos;s revenue goal automatically.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#52525B] block mb-1">Final deal value (USD)</label>
          <Input
            type="number"
            min="0"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[#52525B] block mb-1">Close date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!value || Number(value) <= 0}
            onClick={() => onConfirm(Number(value), date)}
          >
            Confirm — {formatUSD(Number(value) || 0)}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------------- Lead detail ---------------- */

export function LeadDetailDialog({
  lead,
  onClose,
  onMove,
  onUpdate,
}: {
  lead: Lead | null;
  onClose: () => void;
  onMove: (lead: Lead, to: LeadStage) => void;
  onUpdate: (id: string, patch: Partial<Lead>) => void;
}) {
  const { team } = useApp();
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!lead) return;
    setNotes(lead.notes ?? "");
    supabaseBrowser()
      .from("lead_activity")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setActivity((data ?? []) as LeadActivity[]));
  }, [lead]);

  if (!lead) return null;
  const moves = ALLOWED_MOVES[lead.stage];
  const owner = team.find((p) => p.id === lead.owner);

  return (
    <Dialog open={!!lead} onClose={onClose} title={lead.name} side>
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="blue">{STAGE_LABEL[lead.stage]}</Badge>
          <Badge tone="neutral">{lead.source}</Badge>
          {lead.icp_fit && <Badge tone="blue">ICP fit</Badge>}
          {lead.flagged && <Badge tone="amber">flagged</Badge>}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div>
            <dt className="text-xs text-[#52525B]">Company</dt>
            <dd>{lead.company ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#52525B]">Country</dt>
            <dd>{lead.country ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#52525B]">Owner</dt>
            <dd>{owner?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#52525B]">
              {lead.stage === "converted" ? "Closed value" : "Estimated value"}
            </dt>
            <dd className="tabular-nums">
              {formatUSD(lead.stage === "converted" ? lead.deal_value ?? 0 : lead.estimated_value)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#52525B]">Last touch</dt>
            <dd>{formatDate(lead.last_touch_date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#52525B]">Next follow-up</dt>
            <dd className="flex items-center gap-2">
              <input
                type="date"
                value={lead.next_follow_up_date ?? ""}
                onChange={(e) => onUpdate(lead.id, { next_follow_up_date: e.target.value || null })}
                className="bg-transparent text-sm outline-none"
              />
            </dd>
          </div>
        </dl>

        {moves.length > 0 && (
          <div>
            <p className="text-xs text-[#52525B] mb-2">Move to</p>
            <div className="flex flex-wrap gap-2">
              {moves.map((to) => (
                <Button key={to} size="sm" onClick={() => onMove(lead, to)}>
                  {STAGE_LABEL[to]}
                </Button>
              ))}
            </div>
            {lead.stage === "touch_2" && (
              <p className="text-[11px] text-ic-amber mt-2">
                Two touches max — no further outreach from here.
              </p>
            )}
          </div>
        )}

        <div>
          <p className="text-xs text-[#52525B] mb-1.5">Notes</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (lead.notes ?? "") && onUpdate(lead.id, { notes })}
          />
        </div>

        <div>
          <p className="text-xs text-[#52525B] mb-2">Activity</p>
          <div className="space-y-2">
            {activity.length === 0 && (
              <p className="text-[13px] text-[#52525B]">No stage changes yet.</p>
            )}
            {activity.map((a) => {
              const actor = team.find((p) => p.id === a.actor);
              return (
                <div key={a.id} className="flex items-baseline gap-2 text-[13px]">
                  <span className="text-[#52525B] tabular-nums shrink-0">
                    {formatDateTime(a.created_at)}
                  </span>
                  <span className="text-[#A1A1AA]">
                    {actor?.full_name ?? "Someone"} moved{" "}
                    {a.from_stage ? STAGE_LABEL[a.from_stage as LeadStage] : "—"} →{" "}
                    <span className="text-[#FAFAFA]">
                      {a.to_stage ? STAGE_LABEL[a.to_stage as LeadStage] : "—"}
                    </span>
                    {a.note ? ` · ${a.note}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
