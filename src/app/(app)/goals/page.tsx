"use client";

import { useRevenue } from "@/components/goals/use-revenue";
import { useApp } from "@/components/shell/app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Goal, GoalStatus } from "@/lib/types";
import { cn, currentMonthPKT, daysLeftInMonthPKT, formatDate, formatUSD, todayPKT } from "@/lib/utils";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Pencil, Plus, Target, Trash2, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ---------------- revenue gauge ---------------- */

function RevenueGauge({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  const hit = target > 0 && current >= target;
  const R = 84;
  const C = 2 * Math.PI * R;
  const days = daysLeftInMonthPKT();
  const color = hit ? "#30D158" : "var(--ic-blue)";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="relative h-[210px] w-[210px] shrink-0">
        <svg viewBox="0 0 210 210" className="h-full w-full -rotate-90">
          <circle cx="105" cy="105" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          <motion.circle
            cx="105"
            cy="105"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - pct) }}
            transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
            style={{ filter: `drop-shadow(0 0 10px ${hit ? "#30D15866" : "color-mix(in srgb, var(--ic-blue) 40%, transparent)"})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[26px] font-semibold tabular-nums leading-none" style={{ color: hit ? "#30D158" : undefined }}>
            {Math.round(pct * 100)}%
          </p>
          <p className="text-[11px] text-[#52525B] mt-1.5">of {formatUSD(target)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-10 gap-y-5 text-center sm:text-left">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#52525B] font-medium">Closed</p>
          <p className={cn("text-2xl font-semibold tabular-nums", hit && "text-ic-green")}>{formatUSD(current)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#52525B] font-medium">Target</p>
          <p className="text-2xl font-semibold tabular-nums">{formatUSD(target)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#52525B] font-medium">Remaining</p>
          <p className="text-2xl font-semibold tabular-nums">{formatUSD(Math.max(0, target - current))}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#52525B] font-medium">Days left</p>
          <p className="text-2xl font-semibold tabular-nums">{daysLeftInMonthPKT()}</p>
        </div>
        {hit && (
          <p className="col-span-2 text-sm text-ic-green font-medium">
            Target hit with {days} day{days === 1 ? "" : "s"} to spare. Raise the bar. 🎯
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- milestone dialog ---------------- */

function GoalDialog({
  open,
  onClose,
  goal,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", target_date: "", metric: "", status: "not_started" as GoalStatus });

  useEffect(() => {
    setForm({
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      target_date: goal?.target_date ?? "",
      metric: goal?.metric ?? "",
      status: goal?.status ?? "not_started",
    });
  }, [goal, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    const payload = {
      type: "milestone",
      title: form.title.trim(),
      description: form.description.trim() || null,
      target_date: form.target_date || null,
      metric: form.metric.trim() || null,
      status: form.status,
      achieved_at: form.status === "achieved" ? goal?.achieved_at ?? todayPKT() : null,
    };
    if (goal) await supabase.from("goals").update(payload).eq("id", goal.id);
    else await supabase.from("goals").insert(payload);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={goal ? "Edit goal" : "New milestone goal"}>
      <form onSubmit={submit} className="space-y-3">
        <Input autoFocus required placeholder="Goal title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Target date</label>
            <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Status</label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="achieved">Achieved</option>
            </Select>
          </div>
        </div>
        <Input placeholder="Metric (optional, e.g. “$10,000 closed”)" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} />
        <div className="flex justify-end pt-1">
          <Button variant="primary" type="submit">{goal ? "Save" : "Create goal"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- page ---------------- */

export default function GoalsPage() {
  const { isAdmin } = useApp();
  const { goal: revenueGoal, entries, current, target, loading: revLoading, reload: reloadRevenue } = useRevenue();
  const [milestones, setMilestones] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("type", "milestone")
      .order("target_date", { ascending: true, nullsFirst: false });
    setMilestones((data ?? []) as Goal[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAchieved(g: Goal) {
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#2E6BFF", "#30D158", "#FFD60A", "#BF5AF2"],
    });
    await supabase.from("goals").update({ status: "achieved", achieved_at: todayPKT() }).eq("id", g.id);
    load();
  }

  const active = milestones.filter((g) => g.status !== "achieved");
  const achieved = milestones.filter((g) => g.status === "achieved");

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading text-[28px] sm:text-[32px]">Goal Board</h1>
          <p className="text-sm text-[#52525B] mt-1">The scoreboard. Revenue first, milestones next.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setTargetOpen(true)}>Set target</Button>
            <Button size="sm" onClick={() => setManualOpen(true)}>Add revenue</Button>
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus size={14} /> New goal
            </Button>
          </div>
        )}
      </header>

      {/* revenue */}
      <section className="surface p-6 sm:p-8">
        {revLoading ? (
          <Skeleton className="h-[210px] rounded-2xl" />
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <h2 className="heading text-lg">Monthly revenue — {currentMonthPKT()}</h2>
              <span className="text-xs text-[#52525B]">
                Auto-synced from converted pipeline deals{isAdmin ? " + manual entries" : ""}
              </span>
            </div>
            <RevenueGauge current={current} target={target} />
            {entries.length > 0 && (
              <div className="mt-8 pt-5 border-t border-hairline">
                <p className="text-xs text-[#52525B] mb-2.5 font-medium uppercase tracking-wide">This month&apos;s entries</p>
                <div className="space-y-1.5">
                  {entries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#A1A1AA] truncate">
                        <Badge tone={e.source === "pipeline" ? "blue" : "neutral"} className="mr-2">
                          {e.source}
                        </Badge>
                        {e.note ?? "Revenue entry"}
                      </span>
                      <span className="tabular-nums font-medium text-ic-green shrink-0">
                        +{formatUSD(Number(e.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* milestones */}
      <section>
        <h2 className="heading text-lg mb-4">Milestones</h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : active.length === 0 ? (
          <EmptyState
            icon={Target}
            message="No active milestones. Set the next big one."
            actionLabel={isAdmin ? "New goal" : undefined}
            onAction={isAdmin ? () => { setEditing(null); setDialogOpen(true); } : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((g) => (
              <motion.div key={g.id} layout className="surface p-5 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{g.title}</p>
                    {g.description && <p className="text-[13px] text-[#71717A] mt-1 leading-relaxed">{g.description}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditing(g); setDialogOpen(true); }} className="p-1.5 rounded-md text-[#52525B] hover:text-[#FAFAFA] hover:bg-white/[0.06] transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleting(g)} className="p-1.5 rounded-md text-[#52525B] hover:text-ic-red hover:bg-ic-red/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                  <Badge tone={g.status === "in_progress" ? "blue" : "neutral"}>
                    {g.status === "in_progress" ? "In progress" : "Not started"}
                  </Badge>
                  {g.metric && <Badge tone="purple">{g.metric}</Badge>}
                  {g.target_date && <span className="text-xs text-[#52525B]">by {formatDate(g.target_date)}</span>}
                  {isAdmin && (
                    <button
                      onClick={() => markAchieved(g)}
                      className="ml-auto text-xs font-medium text-ic-green/80 hover:text-ic-green transition-colors flex items-center gap-1"
                    >
                      <Check size={13} /> Mark achieved
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* trophy wall */}
      {achieved.length > 0 && (
        <section>
          <h2 className="heading text-lg mb-4 flex items-center gap-2">
            <Trophy size={17} className="text-ic-amber" /> Achieved
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {achieved.map((g) => (
              <div key={g.id} className="surface p-5 border-ic-green/15">
                <div className="flex items-center gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-ic-green/15 flex items-center justify-center shrink-0">
                    <Check size={13} className="text-ic-green" strokeWidth={3} />
                  </span>
                  <p className="font-medium">{g.title}</p>
                </div>
                <p className="text-xs text-[#52525B] mt-2">Achieved {formatDate(g.achieved_at)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <GoalDialog open={dialogOpen} onClose={() => setDialogOpen(false)} goal={editing} onSaved={load} />
      <ManualRevenueDialog open={manualOpen} onClose={() => setManualOpen(false)} onSaved={reloadRevenue} />
      <TargetDialog open={targetOpen} onClose={() => setTargetOpen(false)} goal={revenueGoal} onSaved={reloadRevenue} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await supabase.from("goals").delete().eq("id", deleting.id);
          load();
        }}
        title="Delete goal?"
        message={`“${deleting?.title}” will be permanently deleted.`}
      />
    </div>
  );
}

/* ---------------- admin dialogs ---------------- */

function ManualRevenueDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("revenue_entries").insert({
      source: "manual",
      amount: Number(amount),
      month: currentMonthPKT(),
      note: note.trim() || null,
      created_by: auth.user?.id,
    });
    setAmount("");
    setNote("");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add manual revenue">
      <p className="text-sm text-[#A1A1AA] mb-4">For deals closed outside the pipeline. Counts toward this month.</p>
      <form onSubmit={submit} className="space-y-3">
        <Input type="number" min="1" required autoFocus placeholder="Amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="Note (e.g. “Retainer — Nimbus HR”)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end pt-1">
          <Button variant="primary" type="submit" disabled={!amount || Number(amount) <= 0}>Add {amount ? formatUSD(Number(amount)) : "revenue"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function TargetDialog({ open, onClose, goal, onSaved }: { open: boolean; onClose: () => void; goal: Goal | null; onSaved: () => void }) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setAmount(goal?.target_amount ? String(goal.target_amount) : "");
  }, [goal, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    if (goal) {
      await supabase.from("goals").update({ target_amount: Number(amount) }).eq("id", goal.id);
    } else {
      await supabase.from("goals").insert({
        type: "revenue",
        title: "Monthly revenue target",
        target_amount: Number(amount),
        month: currentMonthPKT(),
        status: "in_progress",
      });
    }
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Revenue target — ${currentMonthPKT()}`}>
      <form onSubmit={submit} className="space-y-3">
        <Input type="number" min="1" required autoFocus placeholder="Target (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="flex justify-end pt-1">
          <Button variant="primary" type="submit" disabled={!amount || Number(amount) <= 0}>Save target</Button>
        </div>
      </form>
    </Dialog>
  );
}
