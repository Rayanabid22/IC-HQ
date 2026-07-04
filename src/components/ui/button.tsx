"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ic-blue)] text-white hover:brightness-110 rounded-full shadow-[0_0_20px_-6px_var(--ic-blue)]",
  secondary:
    "bg-white/[0.06] text-[#FAFAFA] hover:bg-white/[0.1] rounded-full hairline",
  ghost: "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.05] rounded-lg",
  danger: "bg-ic-red/15 text-ic-red hover:bg-ic-red/25 rounded-full",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
  icon: "h-8 w-8 p-0 justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-all duration-150 select-none",
        "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
