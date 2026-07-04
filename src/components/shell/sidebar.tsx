"use client";

import { useApp } from "@/components/shell/app-context";
import { Avatar } from "@/components/ui/avatar";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Building2,
  Filter,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquareKanban,
  Target,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/my-space", label: "My Space", icon: User },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: Filter },
  { href: "/goals", label: "Goal Board", icon: Target },
  { href: "/boards", label: "Boards", icon: SquareKanban },
  { href: "/files", label: "Files", icon: FolderOpen },
];

export function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-hairline bg-elevated/50",
        "transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* brand */}
      <div className={cn("flex items-center gap-2.5 h-16 px-5", collapsed && "px-0 justify-center")}>
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ic-blue)] shadow-[0_0_12px_var(--ic-blue)] shrink-0" />
        {!collapsed && <span className="heading text-[17px]">IC HQ</span>}
      </div>

      {/* search / palette trigger */}
      <button
        onClick={onOpenPalette}
        className={cn(
          "mx-3 mb-3 flex items-center gap-2 h-9 rounded-lg bg-white/[0.04] hairline text-[#52525B]",
          "hover:bg-white/[0.06] hover:text-[#A1A1AA] transition-colors duration-150 text-sm",
          collapsed ? "justify-center px-0" : "px-3"
        )}
      >
        <Search size={15} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[10px] font-medium bg-white/[0.06] rounded px-1.5 py-0.5">⌘K</kbd>
          </>
        )}
      </button>

      {/* nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 h-9 rounded-lg text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-[color-mix(in_srgb,var(--ic-blue)_13%,transparent)] text-[var(--ic-blue)]"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.05]"
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div className="p-3 space-y-1 border-t border-hairline">
        <div className={cn("flex items-center gap-2.5 px-2 py-1.5", collapsed && "justify-center px-0")}>
          <Avatar name={me.full_name} src={me.avatar_url} size={28} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">{me.full_name}</p>
              <p className="text-[11px] text-[#52525B] capitalize">{me.role}</p>
            </div>
          )}
        </div>
        <div className={cn("flex", collapsed ? "flex-col items-center gap-1" : "justify-between px-1")}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/[0.05] transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button
            onClick={signOut}
            className="p-1.5 rounded-md text-[#52525B] hover:text-ic-red hover:bg-ic-red/10 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  // 5 key tabs on mobile
  const items = NAV_ITEMS.filter((i) =>
    ["/", "/my-space", "/pipeline", "/boards", "/clients"].includes(i.href)
  );
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-elevated/90 backdrop-blur-xl border-t border-hairline flex pb-[env(safe-area-inset-bottom)]">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-[var(--ic-blue)]" : "text-[#52525B]"
            )}
          >
            <Icon size={19} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
