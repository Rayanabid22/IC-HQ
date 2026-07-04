"use client";

import { NAV_ITEMS } from "@/components/shell/sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CheckSquare, Filter, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(
    () => [
      ...NAV_ITEMS.map((n) => ({
        id: `nav-${n.href}`,
        label: `Go to ${n.label}`,
        hint: "Navigate",
        icon: n.icon,
        run: () => router.push(n.href),
      })),
      {
        id: "new-task",
        label: "New task",
        hint: "Create",
        icon: CheckSquare,
        run: () => router.push("/?new=task"),
      },
      {
        id: "new-lead",
        label: "New lead",
        hint: "Create",
        icon: Filter,
        run: () => router.push("/pipeline?new=lead"),
      },
      {
        id: "new-client",
        label: "New client",
        hint: "Create",
        icon: Building2,
        run: () => router.push("/clients?new=client"),
      },
    ],
    [router]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && filtered[active]) {
      filtered[active].run();
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[18vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-lg surface overflow-hidden"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2.5 px-4 h-12 border-b border-hairline">
              <Search size={16} className="text-[#52525B]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#52525B]"
              />
              <kbd className="text-[10px] font-medium bg-white/[0.06] rounded px-1.5 py-0.5 text-[#52525B]">
                esc
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <p className="text-sm text-[#52525B] text-center py-8">No matches</p>
              )}
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    c.run();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors duration-100 ${
                    i === active ? "bg-white/[0.07] text-[#FAFAFA]" : "text-[#A1A1AA]"
                  }`}
                >
                  <c.icon size={16} className={i === active ? "text-[var(--ic-blue)]" : "text-[#52525B]"} />
                  <span className="flex-1 text-left">{c.label}</span>
                  <span className="text-[11px] text-[#52525B]">{c.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
