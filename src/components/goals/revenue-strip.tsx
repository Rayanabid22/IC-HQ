"use client";

import { useRevenue } from "@/components/goals/use-revenue";
import { daysLeftInMonthPKT, formatUSD } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

/** Compact revenue progress strip for the Dashboard header. */
export function RevenueStrip() {
  const { current, target, loading } = useRevenue();
  if (loading) return <div className="skeleton h-14 rounded-2xl" />;

  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const hit = target > 0 && current >= target;
  const days = daysLeftInMonthPKT();

  return (
    <Link href="/goals" className="block group">
      <div className="surface px-5 py-3.5 transition-colors duration-150 group-hover:bg-[#1C1C1F]">
        <div className="flex items-baseline justify-between gap-4 mb-2">
          <p className="text-[11px] uppercase tracking-wide text-[#52525B] font-medium">
            Monthly revenue
          </p>
          <p className="text-[13px] tabular-nums text-[#A1A1AA]">
            <span className={hit ? "text-ic-green font-semibold" : "text-[#FAFAFA] font-semibold"}>
              {formatUSD(current)}
            </span>{" "}
            / {formatUSD(target)}
            <span className="text-[#52525B] ml-2 hidden sm:inline">
              {days} day{days === 1 ? "" : "s"} left
            </span>
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="h-full rounded-full"
            style={{ background: hit ? "#30D158" : "var(--ic-blue)" }}
          />
        </div>
      </div>
    </Link>
  );
}
