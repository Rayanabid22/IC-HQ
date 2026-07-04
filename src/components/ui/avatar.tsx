"use client";

import { cn, initials } from "@/lib/utils";

const palette = ["#2E6BFF", "#BF5AF2", "#30D158", "#FF9F0A", "#64D2FF", "#FF6482"];

function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return palette[h % palette.length];
}

export function Avatar({
  name,
  src,
  size = 28,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const bg = colorFor(name || "?");
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn("rounded-full object-cover shrink-0", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={cn("rounded-full flex items-center justify-center font-semibold shrink-0 select-none", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `color-mix(in srgb, ${bg} 22%, transparent)`,
        color: bg,
      }}
      title={name}
    >
      {initials(name || "?")}
    </div>
  );
}

export function AvatarStack({
  people,
  size = 24,
  max = 4,
}: {
  people: { full_name: string; avatar_url?: string | null }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.full_name} src={p.avatar_url} size={size} className="ring-2 ring-card" />
      ))}
      {extra > 0 && (
        <div
          className="rounded-full bg-white/[0.08] text-[#A1A1AA] flex items-center justify-center ring-2 ring-card font-medium"
          style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
