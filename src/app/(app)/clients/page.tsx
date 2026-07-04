"use client";

import { CommentThread } from "@/components/comments/comment-thread";
import { useApp } from "@/components/shell/app-context";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskItem } from "@/components/tasks/task-item";
import { useTasks } from "@/components/tasks/use-tasks";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Client, ClientStatus, PackageTier, Profile } from "@/lib/types";
import { cn, formatDate, formatUSD } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { Archive, Building2, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const STATUS_TONE: Record<ClientStatus, "blue" | "amber" | "green" | "purple" | "neutral"> = {
  onboarding: "purple",
  "in production": "blue",
  review: "amber",
  delivered: "green",
  retainer: "green",
};

const TIERS: PackageTier[] = ["Launch Spark", "Launch Engine", "Custom"];
const STATUSES: ClientStatus[] = ["onboarding", "in production", "review", "delivered", "retainer"];

interface ClientWithMembers extends Client {
  memberIds: string[];
}

function useClients() {
  const [clients, setClients] = useState<ClientWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const [{ data: cs }, { data: cms }] = await Promise.all([
      supabase.from("clients").select("*").eq("archived", false).order("created_at"),
      supabase.from("client_members").select("*"),
    ]);
    const members = (cms ?? []) as { client_id: string; user_id: string }[];
    setClients(
      ((cs ?? []) as Client[]).map((c) => ({
        ...c,
        memberIds: members.filter((m) => m.client_id === c.id).map((m) => m.user_id),
      }))
    );
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { clients, loading, reload: load };
}

/* ---------------- create / edit dialog ---------------- */

function ClientDialog({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onSaved: () => void;
}) {
  const empty = {
    company_name: "",
    logo_url: "",
    contact_name: "",
    contact_handle: "",
    package_tier: "Launch Spark" as PackageTier,
    deal_value: "",
    status: "onboarding" as ClientStatus,
    start_date: "",
    notes: "",
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setForm(
      client
        ? {
            company_name: client.company_name,
            logo_url: client.logo_url ?? "",
            contact_name: client.contact_name ?? "",
            contact_handle: client.contact_handle ?? "",
            package_tier: client.package_tier,
            deal_value: String(client.deal_value ?? ""),
            status: client.status,
            start_date: client.start_date ?? "",
            notes: client.notes ?? "",
          }
        : empty
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    const payload = {
      company_name: form.company_name.trim(),
      logo_url: form.logo_url.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_handle: form.contact_handle.trim() || null,
      package_tier: form.package_tier,
      deal_value: Number(form.deal_value) || 0,
      status: form.status,
      start_date: form.start_date || null,
      notes: form.notes.trim() || null,
    };
    if (client) await supabase.from("clients").update(payload).eq("id", client.id);
    else await supabase.from("clients").insert(payload);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={client ? "Edit client" : "New client"}>
      <form onSubmit={submit} className="space-y-3">
        <Input autoFocus required placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Contact name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          <Input placeholder="Handle / email" value={form.contact_handle} onChange={(e) => setForm({ ...form, contact_handle: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Package</label>
            <Select value={form.package_tier} onChange={(e) => setForm({ ...form, package_tier: e.target.value as PackageTier })}>
              {TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Status</label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Deal value (USD)</label>
            <Input type="number" min="0" value={form.deal_value} onChange={(e) => setForm({ ...form, deal_value: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#52525B] block mb-1">Start date</label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
        </div>
        <Input placeholder="Logo URL (optional)" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
        <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="flex justify-end pt-1">
          <Button variant="primary" type="submit">{client ? "Save" : "Create client"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- detail slide-over ---------------- */

function ClientDetail({
  client,
  onClose,
  onEdit,
  onArchived,
  reload,
}: {
  client: ClientWithMembers | null;
  onClose: () => void;
  onEdit: () => void;
  onArchived: () => void;
  reload: () => void;
}) {
  const { me, team, isAdmin } = useApp();
  const { tasks, addTask, updateTask, deleteTask } = useTasks({ clientId: client?.id ?? "none" });
  const [archiving, setArchiving] = useState(false);
  const supabase = supabaseBrowser();

  if (!client) return null;

  const assigned = team.filter((p) => client.memberIds.includes(p.id));
  const unassigned = team.filter((p) => !client.memberIds.includes(p.id));
  const canEditTasks = isAdmin || client.memberIds.includes(me.id);

  async function addMember(userId: string) {
    await supabase.from("client_members").insert({ client_id: client!.id, user_id: userId });
    reload();
  }
  async function removeMember(userId: string) {
    await supabase.from("client_members").delete().eq("client_id", client!.id).eq("user_id", userId);
    reload();
  }

  return (
    <Dialog open={!!client} onClose={onClose} title={client.company_name} side>
      <div className="space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={STATUS_TONE[client.status]}>{client.status}</Badge>
          <Badge tone="neutral">{client.package_tier}</Badge>
          <span className="text-sm tabular-nums text-ic-green font-medium ml-1">
            {formatUSD(client.deal_value)}
          </span>
          {isAdmin && (
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={onEdit}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => setArchiving(true)}>
                <Archive size={13} /> Archive
              </Button>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div>
            <dt className="text-xs text-[#52525B]">Contact</dt>
            <dd>{client.contact_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#52525B]">Handle / email</dt>
            <dd className="truncate">{client.contact_handle ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#52525B]">Started</dt>
            <dd>{formatDate(client.start_date)}</dd>
          </div>
        </dl>

        {client.notes && (
          <p className="text-sm text-[#A1A1AA] leading-relaxed bg-white/[0.03] rounded-xl p-3.5 hairline">
            {client.notes}
          </p>
        )}

        <section>
          <p className="text-xs text-[#52525B] font-medium uppercase tracking-wide mb-2.5">Team</p>
          <div className="flex flex-wrap gap-2">
            {assigned.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] hairline pl-1 pr-2 py-1 text-[13px]">
                <Avatar name={p.full_name} src={p.avatar_url} size={20} />
                {p.full_name}
                {isAdmin && (
                  <button onClick={() => removeMember(p.id)} className="text-[#52525B] hover:text-ic-red transition-colors" aria-label={`Remove ${p.full_name}`}>
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {isAdmin && unassigned.length > 0 && (
              <Select
                className="w-auto h-8 text-[13px]"
                value=""
                onChange={(e) => e.target.value && addMember(e.target.value)}
              >
                <option value="">+ Add member</option>
                {unassigned.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </Select>
            )}
          </div>
        </section>

        <section>
          <p className="text-xs text-[#52525B] font-medium uppercase tracking-wide mb-2.5">Tasks</p>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {tasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  canEdit={canEditTasks}
                  onToggle={(done) => updateTask(t.id, { status: done ? "done" : "todo" })}
                  onDelete={isAdmin || t.created_by === me.id ? () => deleteTask(t.id) : undefined}
                />
              ))}
            </AnimatePresence>
            {canEditTasks && (
              <QuickAdd
                placeholder="Add a client task…"
                onAdd={(title, due) => addTask({ title, client_id: client.id, assignee: me.id, due_date: due })}
              />
            )}
          </div>
        </section>

        <section>
          <p className="text-xs text-[#52525B] font-medium uppercase tracking-wide mb-2.5">Comments</p>
          <CommentThread entityType="client" entityId={client.id} />
        </section>
      </div>

      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        onConfirm={async () => {
          await supabase.from("clients").update({ archived: true }).eq("id", client.id);
          onArchived();
        }}
        title="Archive client?"
        message={`${client.company_name} will be hidden from the client grid. Files and history are kept.`}
        confirmLabel="Archive"
      />
    </Dialog>
  );
}

/* ---------------- page ---------------- */

function ClientsInner() {
  const { team, isAdmin } = useApp();
  const { clients, loading, reload } = useClients();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("new") === "client") {
      if (isAdmin) {
        setEditing(null);
        setDialogOpen(true);
      }
      router.replace("/clients");
    }
  }, [searchParams, router, isAdmin]);

  const detail = useMemo(() => clients.find((c) => c.id === detailId) ?? null, [clients, detailId]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading text-[28px] sm:text-[32px]">Clients</h1>
          <p className="text-sm text-[#52525B] mt-1">Active client work, one card per company.</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus size={15} /> New client
          </Button>
        )}
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          message="No clients yet. The first one is always the hardest."
          actionLabel={isAdmin ? "New client" : undefined}
          onAction={isAdmin ? () => { setEditing(null); setDialogOpen(true); } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => {
            const members = team.filter((p) => c.memberIds.includes(p.id));
            return (
              <button
                key={c.id}
                onClick={() => setDetailId(c.id)}
                className="surface p-5 text-left transition-all duration-150 hover:bg-[#1C1C1F] hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover hairline" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-white/[0.05] hairline flex items-center justify-center">
                      <Building2 size={17} className="text-[#52525B]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight truncate">{c.company_name}</p>
                    <p className="text-xs text-[#71717A] mt-0.5 truncate">
                      {c.contact_name ?? c.contact_handle ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                  <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  <Badge tone="neutral">{c.package_tier}</Badge>
                </div>
                <div className={cn("flex items-center justify-between mt-4")}>
                  <span className="text-sm font-semibold tabular-nums text-ic-green">
                    {formatUSD(c.deal_value)}
                  </span>
                  <AvatarStack people={members} size={22} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        client={editing}
        onSaved={reload}
      />
      <ClientDetail
        client={detail}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          setEditing(detail);
          setDialogOpen(true);
        }}
        onArchived={() => {
          setDetailId(null);
          reload();
        }}
        reload={reload}
      />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <ClientsInner />
    </Suspense>
  );
}
