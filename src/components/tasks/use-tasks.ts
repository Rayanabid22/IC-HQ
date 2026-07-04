"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

interface Options {
  personal?: boolean; // only my personal tasks
  clientId?: string; // only tasks for a client
  team?: boolean; // team tasks (not personal)
  userId?: string; // needed for personal
}

export function useTasks(opts: Options) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    let q = supabase.from("tasks").select("*").order("created_at", { ascending: true });
    if (opts.personal && opts.userId) q = q.eq("is_personal", true).eq("assignee", opts.userId);
    else if (opts.clientId) q = q.eq("client_id", opts.clientId).eq("is_personal", false);
    else if (opts.team) q = q.eq("is_personal", false);
    const { data } = await q;
    setTasks((data ?? []) as Task[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.personal, opts.clientId, opts.team, opts.userId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`tasks-${opts.personal ? "personal" : opts.clientId ?? "team"}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const addTask = useCallback(
    async (input: Partial<Task> & { title: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const optimistic: Task = {
        id: `tmp-${Date.now()}`,
        title: input.title,
        description: input.description ?? null,
        assignee: input.assignee ?? auth.user?.id ?? null,
        due_date: input.due_date ?? null,
        priority: input.priority ?? "med",
        status: "todo",
        is_personal: input.is_personal ?? false,
        client_id: input.client_id ?? null,
        created_by: auth.user?.id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks((t) => [...t, optimistic]);
      const { error } = await supabase.from("tasks").insert({
        title: optimistic.title,
        description: optimistic.description,
        assignee: optimistic.assignee,
        due_date: optimistic.due_date,
        priority: optimistic.priority,
        is_personal: optimistic.is_personal,
        client_id: optimistic.client_id,
        created_by: auth.user?.id,
      });
      if (error) setTasks((t) => t.filter((x) => x.id !== optimistic.id));
      else load();
    },
    [supabase, load]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      await supabase.from("tasks").update(patch).eq("id", id);
    },
    [supabase]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((t) => t.filter((x) => x.id !== id));
      await supabase.from("tasks").delete().eq("id", id);
    },
    [supabase]
  );

  return { tasks, loading, addTask, updateTask, deleteTask, reload: load };
}
