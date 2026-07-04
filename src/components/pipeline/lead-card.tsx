"use client";

import { useApp } from "@/components/shell/app-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/types";
import { cn, formatUSD, todayPKT } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function followUpDue(lead: Lead): boolean {
  return (
    !!lead.next_follow_up_date &&
    lead.next_follow_up_date <= todayPKT() &&
    lead.stage !== "converted" &&
    lead.stage !== "dead"
  );
}

export function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const { team } = useApp();
  const owner = team.find((p) => p.id === lead.owner);
  const due = followUpDue(lead);
  const terminal = lead.stage === "converted" || lead.stage === "dead";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: lead.stage === "converted",
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 40 }
          : undefined
      }
      className={cn(
        "rounded-xl bg-card hairline p-3 cursor-grab active:cursor-grabbing transition-colors duration-150 hover:bg-[#1C1C1F] select-none",
        isDragging && "opacity-80 shadow-card relative",
        due && "border-ic-amber/40 bg-ic-amber/[0.04]",
        terminal && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{lead.name}</p>
          {lead.company && <p className="text-xs text-[#71717A] mt-0.5 truncate">{lead.company}</p>}
        </div>
        {owner && <Avatar name={owner.full_name} src={owner.avatar_url} size={20} />}
      </div>

      <div className="flex items-center flex-wrap gap-1 mt-2.5">
        <Badge tone="neutral">{lead.source}</Badge>
        {lead.icp_fit && (
          <Badge tone="blue">
            <CheckCircle2 size={10} /> ICP
          </Badge>
        )}
        {lead.flagged && (
          <Badge tone="amber">
            <AlertTriangle size={10} /> flagged
          </Badge>
        )}
        {due && <Badge tone="amber">follow-up due</Badge>}
      </div>

      <p className="text-[13px] tabular-nums text-[#A1A1AA] mt-2">
        {lead.stage === "converted" && lead.deal_value != null ? (
          <span className="text-ic-green font-medium">{formatUSD(lead.deal_value)} closed</span>
        ) : (
          <>~{formatUSD(lead.estimated_value)}</>
        )}
        {lead.country && <span className="text-[#52525B]"> · {lead.country}</span>}
      </p>
    </div>
  );
}
