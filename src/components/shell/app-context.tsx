"use client";

import type { Profile } from "@/lib/types";
import { createContext, useContext } from "react";

interface AppContextValue {
  me: Profile;
  team: Profile[];
  isAdmin: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  me,
  team,
  children,
}: {
  me: Profile;
  team: Profile[];
  children: React.ReactNode;
}) {
  return (
    <AppContext.Provider value={{ me, team, isAdmin: me.role === "admin" }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function useProfileName(team: Profile[], id: string | null | undefined): string {
  if (!id) return "Unassigned";
  return team.find((p) => p.id === id)?.full_name ?? "Unknown";
}
