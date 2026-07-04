import { AppShell } from "@/components/shell/app-shell";
import { supabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: me }, { data: team }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  if (!me) redirect("/login");

  return (
    <AppShell me={me as Profile} team={(team ?? []) as Profile[]}>
      {children}
    </AppShell>
  );
}
