"use client";

import { RevenueStrip } from "@/components/goals/revenue-strip";
import { useApp } from "@/components/shell/app-context";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskItem } from "@/components/tasks/task-item";
import { useTasks } from "@/components/tasks/use-tasks";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Lead, Task } from "@/lib/types";
import { cn, formatDate, fullDatePKT, greetingPKT, isThisWeekPKT, todayPKT } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { AlarmClock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Filter = "today" | "week" | "open";

function firstName(full: string) {
  return full.split(/\s+/)[0] || full;
}

function matchesFilter(task: Task, filter: Filter): boolean {
  if (task.status === "done") return filter === "today" && task.due_date === todayPKT();
  if (filter === "open") return true;
  if (!task.due_date) return false;
  if (filter === "today") return task.due_date <= todayPKT();
  return task.due_date <= todayPKT() || isThisWeekPKT(task.due_date);
}

function FollowUpsDue() {
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => {
    supabaseBrowser()
      .from("leads")
      .select("*")
      .lte("next_follow_up_date", todayPKT())
      .not("stage", "in", '("converted","dead")')
      .then(({ data }) => setLeads((data ?? []) as Lead[]));
  }, []);

  if (leads.length === 0) return null;
  return (
    <Link href="/pipeline" className="block">
      <div className="surface px-5 py-3.5 border-ic-amber/20 bg-ic-amber/[0.04] hover:bg-ic-amber/[0.07] transition-colors">
        <div className="flex items-center gap-2.5">
          <AlarmClock size={16} className="text-ic-amber shrink-0" />
          <p className="text-sm">
            <span className="font-medium text-ic-amber">
              {leads.length} follow-up{leads.length === 1 ? "" : "s"} due
            </span>
            <span className="text-[#A1A1AA]">
              {" "}
              — {leads.slice(0, 3).map((l) => l.name).join(", ")}
              {leads.length > 3 ? "…" : ""}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function NewTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, team, isAdmin } = useApp();
  const { addTask } = useTasks({ team: true });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState(me.id);
  const [due, setDue] = useState(todayPKT());
  const [priority, setPriority] = useState<Task["priority"]>("med");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      description: description.trim() || null,
      assignee,
      due_date: due || null,
      priority,
    });
    setTitle("");
    setDescription("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="New task">
      <form onSubmit={submit} className="space-y-3">
        <Input autoFocus placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Assignee</label>
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={!isAdmin}>
              {(isAdmin ? team : team.filter((p) => p.id === me.id)).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Priority</label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs text-[#52525B] block mb-1">Due date</label>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="primary" type="submit">
            Create task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DashboardInner() {
  const { me, team, isAdmin } = useApp();
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks({ team: true });
  const [filter, setFilter] = useState<Filter>("today");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "task") {
      setNewTaskOpen(true);
      router.replace("/");
    }
  }, [searchParams, router]);

  const byPerson = useMemo(() => {
    const visible = tasks.filter((t) => matchesFilter(t, filter));
    return team.map((p) => ({
      person: p,
      tasks: visible
        .filter((t) => t.assignee === p.id)
        .sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0)),
    }));
  }, [tasks, team, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "open", label: "All open" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <p className="text-[13px] text-[#52525B] font-medium">{fullDatePKT()}</p>
          <h1 className="heading text-[28px] sm:text-[32px] mt-0.5">
            {greetingPKT()}, {firstName(me.full_name)}
          </h1>
        </div>
        <RevenueStrip />
        <FollowUpsDue />
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white/[0.04] hairline rounded-full p-0.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-7 px-3.5 rounded-full text-[13px] font-medium transition-all duration-150",
                filter === f.key
                  ? "bg-[var(--ic-blue)] text-white"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setNewTaskOpen(true)}>
          New task
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {byPerson.map(({ person, tasks: personTasks }) => {
            const doneCount = personTasks.filter((t) => t.status === "done").length;
            const canAdd = isAdmin || person.id === me.id;
            return (
              <section key={person.id} className="surface p-4 sm:p-5">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <Avatar name={person.full_name} src={person.avatar_url} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{person.full_name}</p>
                  </div>
                  {personTasks.length > 0 && (
                    <Badge tone={doneCount === personTasks.length ? "green" : "neutral"}>
                      {doneCount}/{personTasks.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {personTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        canEdit={isAdmin || task.assignee === me.id || task.created_by === me.id}
                        onToggle={(done) =>
                          updateTask(task.id, { status: done ? "done" : "todo" })
                        }
                        onDelete={
                          isAdmin || task.created_by === me.id
                            ? () => deleteTask(task.id)
                            : undefined
                        }
                      />
                    ))}
                  </AnimatePresence>
                  {personTasks.length === 0 && (
                    <div className="flex items-center gap-2 text-[13px] text-[#52525B] px-1 py-2">
                      <CheckCircle2 size={14} className="text-ic-green/60" />
                      All clear for {filter === "today" ? "today" : "now"}
                    </div>
                  )}
                  {canAdd && (
                    <QuickAdd
                      placeholder={`Add for ${firstName(person.full_name)}…`}
                      onAdd={(title, due) =>
                        addTask({ title, assignee: person.id, due_date: due })
                      }
                    />
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <NewTaskDialog open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
      <p className="text-xs text-[#3F3F46] text-center pt-2">
        Tasks shown due {filter === "today" ? `today (${formatDate(todayPKT())})` : filter === "week" ? "this week" : "any time"} · Asia/Karachi
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <DashboardInner />
    </Suspense>
  );
}
