"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** slide-over from the right instead of centered modal */
  side?: boolean;
}

export function Dialog({ open, onClose, title, children, className, side }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn("fixed inset-0 z-50 flex", side ? "justify-end" : "items-center justify-center p-4")}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={side ? { x: 40, opacity: 0 } : { y: 12, scale: 0.97, opacity: 0 }}
            animate={side ? { x: 0, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
            exit={side ? { x: 40, opacity: 0 } : { y: 12, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "relative bg-elevated hairline shadow-card flex flex-col",
              side
                ? "h-full w-full max-w-xl rounded-l-2xl"
                : "w-full max-w-lg rounded-2xl max-h-[85vh]",
              className
            )}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-1 shrink-0">
              {title ? <h2 className="heading text-lg">{title}</h2> : <span />}
              <button
                onClick={onClose}
                className="text-[#52525B] hover:text-[#FAFAFA] transition-colors p-1 -m-1 rounded-md"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-3 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-sm">
      <p className="text-sm text-[#A1A1AA] leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-full text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="h-9 px-4 rounded-full text-sm font-medium bg-ic-red/15 text-ic-red hover:bg-ic-red/25 transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
