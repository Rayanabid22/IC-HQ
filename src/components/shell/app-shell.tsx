"use client";

import { AppProvider } from "@/components/shell/app-context";
import { CommandPalette } from "@/components/shell/command-palette";
import { MobileTabBar, Sidebar } from "@/components/shell/sidebar";
import type { Profile } from "@/lib/types";
import { useEffect, useState } from "react";

export function AppShell({
  me,
  team,
  children,
}: {
  me: Profile;
  team: Profile[];
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppProvider me={me} team={team}>
      <div className="flex min-h-screen">
        <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-6 sm:py-10">{children}</div>
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </AppProvider>
  );
}
