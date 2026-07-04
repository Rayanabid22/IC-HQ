"use client";

import { LeadCard, followUpDue } from "@/components/pipeline/lead-card";
import { ConvertDialog, LeadDetailDialog, NewLeadDialog } from "@/components/pipeline/lead-dialogs";
import { STAGES, canMove } from "@/components/pipeline/stages";
import { useLeads } from "@/components/pipeline/use-leads";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead, LeadStage } from "@/lib/types";
import { cn, formatDate, formatUSD } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { AlarmClock, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div className="surface px-4 py-3 flex-1 min-w-[130px]">
      <p className="text-[11px] uppercase tracking-wide text-[#52525B] font-medium">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums mt-0.5", tone === "green" && "text-ic-green")}>
        {value}
      </p>
    </div>
  );
}

function StageColumn({
  stage,
  caption,
  label,
  leads,
  activeLead,
  onOpen,
}: {
  stage: LeadStage;
  label: string;
  caption?: string;
  leads: Lead[];
  activeLead: Lead | null;
  onOpen: (l: Lead) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  const valid = !activeLead || canMove(activeLead.stage, stage);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[240px] shrink-0 rounded-2xl bg-elevated/70 hairline flex flex-col max-h-full snap-start transition-colors duration-150",
        isOver && valid && "border-[var(--ic-blue)]/50 bg-[color-mix(in_srgb,var(--ic-blue)_5%,transparent)]",
        activeLead && !valid && "opacity-40"
      )}
    >
      <div className="px-3.5 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">{label}</p>
          <span className="text-[11px] text-[#52525B] tabular-nums">{leads.length}</span>
        </div>
        {caption && <p className="text-[10.5px] text-ic-amber/80 mt-0.5 leading-tight">{caption}</p>}
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2 min-h-[80px]">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onOpen={() => onOpen(lead)} />
        ))}
      </div>
    </div>
  );
}

function PipelineInner() {
  const { leads, loading, moveLead, updateLead, stats, followUpsDue } = useLeads();
  const [newOpen, setNewOpen] = useState(false);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  useEffect(() => {
    if (searchParams.get("new") === "lead") {
      setNewOpen(true);
      router.replace("/pipeline");
    }
  }, [searchParams, router]);

  // keep the open detail dialog in sync with live data
  useEffect(() => {
    if (detail) {
      const fresh = leads.find((l) => l.id === detail.id);
      if (fresh && fresh !== detail) setDetail(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  function handleMove(lead: Lead, to: LeadStage) {
    if (!canMove(lead.stage, to)) return;
    if (to === "converted") {
      setConverting(lead);
      setDetail(null);
      return;
    }
    moveLead(lead, to);
    setDetail(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveLead(null);
    const lead = leads.find((l) => l.id === e.active.id);
    const to = e.over?.id as LeadStage | undefined;
    if (!lead || !to || to === lead.stage) return;
    handleMove(lead, to);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading text-[28px] sm:text-[32px]">Pipeline</h1>
          <p className="text-sm text-[#52525B] mt-1">Inbound leads — two touches max, then silence means Dead.</p>
        </div>
        <Button variant="primary" onClick={() => setNewOpen(true)}>
          <Plus size={15} /> New lead
        </Button>
      </header>

      <div className="flex gap-3 flex-wrap">
        <Stat label="Leads this month" value={String(stats.thisMonth)} />
        <Stat label="Conversion rate" value={`${stats.conversionRate}%`} />
        <Stat label="Revenue this month" value={formatUSD(stats.revenueThisMonth)} tone="green" />
      </div>

      {followUpsDue.length > 0 && (
        <section className="surface p-4 border-ic-amber/20">
          <p className="flex items-center gap-2 text-sm font-medium text-ic-amber mb-2.5">
            <AlarmClock size={15} /> Follow-ups due
          </p>
          <div className="space-y-1.5">
            {followUpsDue.map((l) => (
              <button
                key={l.id}
                onClick={() => setDetail(l)}
                className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
              >
                <span className="text-sm truncate">
                  {l.name}
                  {l.company && <span className="text-[#71717A]"> · {l.company}</span>}
                </span>
                <span className="text-xs text-ic-amber tabular-nums shrink-0">
                  due {formatDate(l.next_follow_up_date)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-[240px] shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveLead(leads.find((l) => l.id === e.active.id) ?? null)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveLead(null)}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 h-[calc(100vh-380px)] min-h-[420px]">
            {STAGES.map((s) => (
              <StageColumn
                key={s.key}
                stage={s.key}
                label={s.label}
                caption={s.caption}
                leads={leads.filter((l) => l.stage === s.key)}
                activeLead={activeLead}
                onOpen={(l) => setDetail(l)}
              />
            ))}
          </div>
        </DndContext>
      )}

      <NewLeadDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => undefined} />
      <ConvertDialog
        lead={converting}
        onClose={() => setConverting(null)}
        onConfirm={(dealValue, closedAt) => {
          if (converting) moveLead(converting, "converted", { deal_value: dealValue, closed_at: closedAt, note: `Closed at ${formatUSD(dealValue)}` });
          setConverting(null);
        }}
      />
      <LeadDetailDialog
        lead={detail}
        onClose={() => setDetail(null)}
        onMove={handleMove}
        onUpdate={updateLead}
      />
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <PipelineInner />
    </Suspense>
  );
}
