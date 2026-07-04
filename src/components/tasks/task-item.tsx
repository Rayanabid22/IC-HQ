"use client";

import { ConfirmDialog } from "@/components/ui/dialog";
import type { Task } from "@/lib/types";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";

const priorityTone: Record<Task["priority"], string> = {
  low: "bg-white/[0.07] text-[#71717A]",
  med: "bg-ic-amber/[0.1] text-ic-amber/90",
  high: "bg-ic-red/[0.12] text-ic-red",
};

export function TaskItem({
  task,
  canEdit,
  onToggle,
  onDelete,
  showDue = true,
}: {
  task: Task;
  canEdit: boolean;
  onToggle: (done: boolean) => void;
  onDelete?: () => void;
  showDue?: boolean;
}) {
  const done = task.status === "done";
  const overdue = isOverdue(task.due_date, task.status);
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group flex items-start gap-2.5 rounded-xl px-3 py-2.5 hairline transition-colors duration-150",
        done ? "bg-white/[0.02] opacity-55" : "bg-white/[0.03] hover:bg-white/[0.05]",
        overdue && !done && "bg-ic-red/[0.05] border-ic-red/20"
      )}
    >
      <button
        disabled={!canEdit}
        onClick={() => onToggle(!done)}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "mt-0.5 h-[18px] w-[18px] rounded-md border shrink-0 flex items-center justify-center transition-all duration-150",
          done
            ? "bg-ic-green border-ic-green"
            : "border-white/20 hover:border-[var(--ic-blue)]",
          !canEdit && "cursor-default opacity-50"
        )}
      >
        <AnimatePresence>
          {done && (
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
            >
              <Check size={12} strokeWidth={3.5} className="text-black" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", done && "line-through text-[#71717A]")}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-[#71717A] mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium", priorityTone[task.priority])}>
            {task.priority}
          </span>
          {showDue && task.due_date && (
            <span className={cn("text-[11px]", overdue && !done ? "text-ic-red font-medium" : "text-[#52525B]")}>
              {overdue && !done ? "Overdue · " : ""}
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      {onDelete && canEdit && (
        <button
          onClick={() => setConfirming(true)}
          className="opacity-0 group-hover:opacity-100 text-[#52525B] hover:text-ic-red transition-all p-1 -m-1 rounded-md shrink-0"
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      )}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => onDelete?.()}
        title="Delete task?"
        message={`“${task.title}” will be permanently deleted.`}
      />
    </motion.div>
  );
}
