"use client";

import { todayPKT } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";

/** One-line quick-add input: type a title, press Enter. */
export function QuickAdd({
  placeholder = "Add a task…",
  onAdd,
  autoFocus,
}: {
  placeholder?: string;
  onAdd: (title: string, dueDate: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const title = value.trim();
    if (!title) return;
    onAdd(title, todayPKT());
    setValue("");
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] hairline border-dashed px-3 h-10 focus-within:border-[var(--ic-blue)]/40 transition-colors duration-150">
      <Plus size={15} className="text-[#52525B] shrink-0" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#52525B] min-w-0"
      />
    </div>
  );
}
