import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red" | "purple" | "neutral";

const tones: Record<Tone, string> = {
  blue: "bg-[color-mix(in_srgb,var(--ic-blue)_14%,transparent)] text-[var(--ic-blue)]",
  green: "bg-ic-green/[0.12] text-ic-green",
  amber: "bg-ic-amber/[0.12] text-ic-amber",
  red: "bg-ic-red/[0.12] text-ic-red",
  purple: "bg-ic-purple/[0.12] text-ic-purple",
  neutral: "bg-white/[0.07] text-[#A1A1AA]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
