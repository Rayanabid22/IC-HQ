"use client";

import { useApp } from "@/components/shell/app-context";
import { AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Board } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const COLORS = ["#2E6BFF", "#BF5AF2", "#30D158", "#FFD60A", "#FF453A", "#64D2FF"];

interface BoardWithMembers extends Board {
  memberIds: string[];
}

export default function BoardsPage() {
  const { me, team } = useApp();
  const [boards, setBoards] = useState<BoardWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: COLORS[0] });
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const [{ data: bs }, { data: bms }] = await Promise.all([
      supabase.from("boards").select("*").order("created_at"),
      supabase.from("board_members").select("*"),
    ]);
    const members = (bms ?? []) as { board_id: string; user_id: string }[];
    setBoards(
      ((bs ?? []) as Board[]).map((b) => ({
        ...b,
        memberIds: members.filter((m) => m.board_id === b.id).map((m) => m.user_id),
      }))
    );
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("boards")
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        created_by: me.id,
      })
      .select()
      .single();
    if (!error && data) {
      await supabase.from("board_members").insert({ board_id: data.id, user_id: me.id });
      await supabase.from("board_lists").insert([
        { board_id: data.id, name: "To do", position: 1 },
        { board_id: data.id, name: "Doing", position: 2 },
        { board_id: data.id, name: "Done", position: 3 },
      ]);
    }
    setCreateOpen(false);
    setForm({ name: "", description: "", color: COLORS[0] });
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading text-[28px] sm:text-[32px]">Boards</h1>
          <p className="text-sm text-[#52525B] mt-1">
            Kanban for anything — content, production, hiring.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> New board
        </Button>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={SquareKanban}
          message="No boards yet. Spin one up for anything the team tracks."
          actionLabel="New board"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => {
            const members = team.filter((p) => b.memberIds.includes(p.id));
            return (
              <Link
                key={b.id}
                href={`/boards/${b.id}`}
                className="surface p-5 transition-all duration-150 hover:bg-[#1C1C1F] hover:-translate-y-0.5 block"
              >
                <div
                  className="h-1.5 w-10 rounded-full mb-4"
                  style={{ background: b.color }}
                />
                <p className="font-medium leading-tight">{b.name}</p>
                {b.description && (
                  <p className="text-[13px] text-[#71717A] mt-1 line-clamp-2 leading-relaxed">
                    {b.description}
                  </p>
                )}
                <div className="mt-4">
                  <AvatarStack people={members} size={22} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New board">
        <form onSubmit={createBoard} className="space-y-3">
          <Input
            autoFocus
            required
            placeholder="Board name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div>
            <label className="text-xs text-[#52525B] block mb-2">Accent</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform duration-150",
                    form.color === c && "ring-2 ring-white/60 scale-110"
                  )}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button variant="primary" type="submit" disabled={!form.name.trim()}>
              Create board
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
