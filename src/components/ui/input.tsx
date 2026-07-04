"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg bg-white/[0.04] hairline px-3 text-sm text-[#FAFAFA]",
        "placeholder:text-[#52525B] transition-colors duration-150",
        "focus:bg-white/[0.06] focus:outline-none focus-visible:outline-2",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg bg-white/[0.04] hairline px-3 py-2 text-sm text-[#FAFAFA] leading-relaxed",
      "placeholder:text-[#52525B] transition-colors duration-150 min-h-[72px] resize-y",
      "focus:bg-white/[0.06] focus:outline-none",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg bg-white/[0.04] hairline px-2.5 text-sm text-[#FAFAFA]",
      "transition-colors duration-150 focus:bg-white/[0.06] focus:outline-none",
      "[&>option]:bg-elevated",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";
