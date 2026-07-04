import type { LeadStage } from "@/lib/types";

export const STAGES: { key: LeadStage; label: string; caption?: string }[] = [
  { key: "new", label: "New" },
  { key: "replied", label: "Replied" },
  { key: "touch_1", label: "Touch 1 Sent" },
  {
    key: "touch_2",
    label: "Touch 2 Sent",
    caption: "Two touches max — silence means Dead.",
  },
  { key: "call_booked", label: "Call Booked" },
  { key: "converted", label: "Converted" },
  { key: "dead", label: "Dead" },
];

export const STAGE_LABEL: Record<LeadStage, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label])
) as Record<LeadStage, string>;

/**
 * The sales rules, hard-coded. After Touch 2 there are NO further touch
 * actions — the only exits are Replied, Call Booked, Converted or Dead.
 */
export const ALLOWED_MOVES: Record<LeadStage, LeadStage[]> = {
  new: ["replied", "touch_1", "dead"],
  replied: ["touch_1", "call_booked", "converted", "dead"],
  touch_1: ["replied", "touch_2", "call_booked", "converted", "dead"],
  touch_2: ["replied", "call_booked", "converted", "dead"],
  call_booked: ["replied", "converted", "dead"],
  converted: [],
  dead: ["replied"],
};

export function canMove(from: LeadStage, to: LeadStage): boolean {
  return ALLOWED_MOVES[from]?.includes(to) ?? false;
}
