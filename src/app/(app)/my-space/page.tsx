"use client";

import { useApp } from "@/components/shell/app-context";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskItem } from "@/components/tasks/task-item";
import { useTasks } from "@/components/tasks/use-tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const Whiteboard = dynamic(
  () => import("@/components/whiteboard/whiteboard").then((m) => m.Whiteboard),
  { ssr: false, loading: () => <div className="skeleton h-[480px] rounded-2xl" /> }
);

export default function MySpacePage() {
  const { me } = useApp();
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks({
    personal: true,
    userId: me.id,
  });

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0)
      ),
    [tasks]
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="heading text-[28px] sm:text-[32px]">My Space</h1>
        <p className="text-sm text-[#52525B] mt-1">
          Private to you — personal todos and your whiteboard.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <div className="surface p-4 sm:p-5">
          <h2 className="heading text-base mb-3.5">Personal tasks</h2>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {sorted.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    canEdit
                    onToggle={(done) => updateTask(task.id, { status: done ? "done" : "todo" })}
                    onDelete={() => deleteTask(task.id)}
                    showDue={false}
                  />
                ))}
              </AnimatePresence>
              <QuickAdd
                placeholder="Add a private todo…"
                onAdd={(title) =>
                  addTask({ title, is_personal: true, assignee: me.id, due_date: null })
                }
              />
            </div>
          )}
        </div>

        <div>
          <h2 className="heading text-base mb-3.5">Whiteboard</h2>
          <Whiteboard userId={me.id} />
        </div>
      </section>
    </div>
  );
}
