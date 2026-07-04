"use client";

import { CommentThread } from "@/components/comments/comment-thread";
import { useApp } from "@/components/shell/app-context";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Board, BoardList, Card, ChecklistItem } from "@/lib/types";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  Check,
  CheckSquare,
  Plus,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ============================= data hook ============================= */

function useBoard(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<{ card_id: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const [{ data: b }, { data: ls }, { data: cs }, { data: bms }, { data: cas }] =
      await Promise.all([
        supabase.from("boards").select("*").eq("id", boardId).maybeSingle(),
        supabase.from("board_lists").select("*").eq("board_id", boardId).order("position"),
        supabase.from("cards").select("*").eq("board_id", boardId).order("position"),
        supabase.from("board_members").select("*").eq("board_id", boardId),
        supabase.from("card_assignees").select("*"),
      ]);
    if (!b) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setBoard(b as Board);
    setLists((ls ?? []) as BoardList[]);
    setCards(
      ((cs ?? []) as Card[]).map((c) => ({
        ...c,
        labels: Array.isArray(c.labels) ? c.labels : [],
        checklist: Array.isArray(c.checklist) ? c.checklist : [],
      }))
    );
    setMemberIds(((bms ?? []) as { user_id: string }[]).map((m) => m.user_id));
    setAssignees((cas ?? []) as { card_id: string; user_id: string }[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`board-${boardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "board_lists" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { board, lists, cards, memberIds, assignees, loading, notFound, setCards, setLists, reload: load };
}

/* ============================= card tile ============================= */

function CardTile({
  card,
  people,
  onOpen,
  overlay,
}: {
  card: Card;
  people: { full_name: string; avatar_url?: string | null }[];
  onOpen?: () => void;
  overlay?: boolean;
}) {
  const checklistDone = card.checklist.filter((i) => i.done).length;
  const overdue = isOverdue(card.due_date);

  return (
    <div
      onClick={onOpen}
      className={cn(
        "rounded-xl bg-card hairline p-3 cursor-pointer transition-colors duration-150 hover:bg-[#1C1C1F] select-none",
        overlay && "shadow-card rotate-2"
      )}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((l) => (
            <Badge key={l} tone="purple">{l}</Badge>
          ))}
        </div>
      )}
      <p className="text-sm leading-snug">{card.title}</p>
      {(card.due_date || card.checklist.length > 0 || people.length > 0) && (
        <div className="flex items-center gap-2.5 mt-2.5">
          {card.due_date && (
            <span className={cn("flex items-center gap-1 text-[11px]", overdue ? "text-ic-red font-medium" : "text-[#52525B]")}>
              <CalendarDays size={11} /> {formatDate(card.due_date)}
            </span>
          )}
          {card.checklist.length > 0 && (
            <span className={cn("flex items-center gap-1 text-[11px]", checklistDone === card.checklist.length ? "text-ic-green" : "text-[#52525B]")}>
              <CheckSquare size={11} /> {checklistDone}/{card.checklist.length}
            </span>
          )}
          <span className="ml-auto">
            <AvatarStack people={people} size={18} max={3} />
          </span>
        </div>
      )}
    </div>
  );
}

function SortableCard(props: {
  card: Card;
  people: { full_name: string; avatar_url?: string | null }[];
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
    data: { type: "card", listId: props.card.list_id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-30")}
    >
      <CardTile card={props.card} people={props.people} onOpen={props.onOpen} />
    </div>
  );
}

/* ============================= list column ============================= */

function ListColumn({
  list,
  cards,
  peopleFor,
  onOpenCard,
  onRename,
  onDelete,
  onAddCard,
  onMove,
  isFirst,
  isLast,
}: {
  list: BoardList;
  cards: Card[];
  peopleFor: (c: Card) => { full_name: string; avatar_url?: string | null }[];
  onOpenCard: (c: Card) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddCard: (title: string) => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}`, data: { type: "list", listId: list.id } });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [confirming, setConfirming] = useState(false);

  function submitCard() {
    if (title.trim()) onAddCard(title.trim());
    setTitle("");
    setAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[264px] shrink-0 rounded-2xl bg-elevated/70 hairline flex flex-col max-h-full snap-start transition-colors",
        isOver && "border-[var(--ic-blue)]/40"
      )}
    >
      <div className="group flex items-center gap-1.5 px-3.5 pt-3 pb-2">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              if (name.trim() && name !== list.name) onRename(name.trim());
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="flex-1 bg-transparent text-[13px] font-semibold outline-none border-b border-[var(--ic-blue)]/50 min-w-0"
          />
        ) : (
          <button onClick={() => setRenaming(true)} className="text-[13px] font-semibold truncate text-left flex-1">
            {list.name}
          </button>
        )}
        <span className="text-[11px] text-[#52525B] tabular-nums">{cards.length}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          {!isFirst && (
            <button onClick={() => onMove(-1)} className="p-1 rounded text-[#52525B] hover:text-[#FAFAFA]" title="Move left">
              <ArrowLeftRight size={12} className="-scale-x-100" />
            </button>
          )}
          {!isLast && (
            <button onClick={() => onMove(1)} className="p-1 rounded text-[#52525B] hover:text-[#FAFAFA]" title="Move right">
              <ArrowLeftRight size={12} />
            </button>
          )}
          <button onClick={() => setConfirming(true)} className="p-1 rounded text-[#52525B] hover:text-ic-red" title="Delete list">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto px-2.5 pb-1 space-y-2 min-h-[60px]">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} people={peopleFor(card)} onOpen={() => onOpenCard(card)} />
          ))}
        </div>
      </SortableContext>

      <div className="p-2.5 pt-1.5">
        {adding ? (
          <div className="space-y-1.5">
            <Textarea
              autoFocus
              placeholder="Card title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitCard();
                }
                if (e.key === "Escape") setAdding(false);
              }}
              className="min-h-[56px]"
            />
            <div className="flex gap-1.5">
              <Button variant="primary" size="sm" onClick={submitCard}>Add</Button>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/[0.04] transition-colors"
          >
            <Plus size={14} /> Add card
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={onDelete}
        title="Delete list?"
        message={`“${list.name}” and its ${cards.length} card${cards.length === 1 ? "" : "s"} will be permanently deleted.`}
      />
    </div>
  );
}

/* ============================= card detail ============================= */

function CardDetail({
  card,
  onClose,
  onUpdate,
  onDelete,
  assignees,
  onToggleAssignee,
  boardMemberIds,
}: {
  card: Card | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Card>) => void;
  onDelete: (id: string) => void;
  assignees: { card_id: string; user_id: string }[];
  onToggleAssignee: (cardId: string, userId: string, on: boolean) => void;
  boardMemberIds: string[];
}) {
  const { team } = useApp();
  const [desc, setDesc] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newItem, setNewItem] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setDesc(card?.description ?? "");
  }, [card]);

  if (!card) return null;
  const assignedIds = assignees.filter((a) => a.card_id === card.id).map((a) => a.user_id);
  const eligible = team.filter((p) => boardMemberIds.includes(p.id));

  function patchChecklist(items: ChecklistItem[]) {
    onUpdate(card!.id, { checklist: items });
  }

  return (
    <Dialog open={!!card} onClose={onClose} title={card.title} side>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#52525B] flex items-center gap-1 mb-1">
              <CalendarDays size={11} /> Due date
            </label>
            <Input
              type="date"
              value={card.due_date ?? ""}
              onChange={(e) => onUpdate(card.id, { due_date: e.target.value || null })}
            />
          </div>
          <div>
            <label className="text-xs text-[#52525B] flex items-center gap-1 mb-1">
              <Users size={11} /> Assignees
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {eligible.map((p) => {
                const on = assignedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onToggleAssignee(card.id, p.id, !on)}
                    className={cn(
                      "rounded-full transition-all duration-150",
                      on ? "ring-2 ring-[var(--ic-blue)]" : "opacity-40 hover:opacity-80"
                    )}
                    title={p.full_name}
                  >
                    <Avatar name={p.full_name} src={p.avatar_url} size={26} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-[#52525B] block mb-1.5">Description</label>
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => desc !== (card.description ?? "") && onUpdate(card.id, { description: desc || null })}
            placeholder="Add details…"
          />
        </div>

        <div>
          <label className="text-xs text-[#52525B] flex items-center gap-1 mb-2">
            <Tag size={11} /> Labels
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {card.labels.map((l) => (
              <Badge key={l} tone="purple" className="gap-1.5">
                {l}
                <button
                  onClick={() => onUpdate(card.id, { labels: card.labels.filter((x) => x !== l) })}
                  className="hover:text-white transition-colors"
                  aria-label={`Remove ${l}`}
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newLabel.trim()) {
                  onUpdate(card.id, { labels: [...card.labels, newLabel.trim()] });
                  setNewLabel("");
                }
              }}
              placeholder="+ label"
              className="h-6 w-20 bg-transparent text-xs outline-none placeholder:text-[#52525B]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#52525B] flex items-center gap-1 mb-2">
            <CheckSquare size={11} /> Checklist
            {card.checklist.length > 0 && (
              <span className="tabular-nums">
                — {card.checklist.filter((i) => i.done).length}/{card.checklist.length}
              </span>
            )}
          </label>
          <div className="space-y-1.5">
            {card.checklist.map((item) => (
              <div key={item.id} className="group flex items-center gap-2.5">
                <button
                  onClick={() =>
                    patchChecklist(card.checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
                  }
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-all shrink-0",
                    item.done ? "bg-ic-green border-ic-green" : "border-white/20"
                  )}
                >
                  {item.done && <Check size={10} strokeWidth={3.5} className="text-black" />}
                </button>
                <span className={cn("text-sm flex-1", item.done && "line-through text-[#71717A]")}>
                  {item.text}
                </span>
                <button
                  onClick={() => patchChecklist(card.checklist.filter((i) => i.id !== item.id))}
                  className="opacity-0 group-hover:opacity-100 text-[#52525B] hover:text-ic-red transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newItem.trim()) {
                  patchChecklist([
                    ...card.checklist,
                    { id: String(Date.now()), text: newItem.trim(), done: false },
                  ]);
                  setNewItem("");
                }
              }}
              placeholder="+ Add checklist item"
              className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-[#52525B]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#52525B] block mb-2.5">Comments</label>
          <CommentThread entityType="card" entityId={card.id} />
        </div>

        <div className="pt-2 border-t border-hairline">
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 size={13} /> Delete card
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          onDelete(card.id);
          onClose();
        }}
        title="Delete card?"
        message={`“${card.title}” will be permanently deleted.`}
      />
    </Dialog>
  );
}

/* ============================= members dialog ============================= */

function MembersDialog({
  open,
  onClose,
  boardId,
  memberIds,
  canManage,
  reload,
}: {
  open: boolean;
  onClose: () => void;
  boardId: string;
  memberIds: string[];
  canManage: boolean;
  reload: () => void;
}) {
  const { team } = useApp();
  const supabase = supabaseBrowser();

  async function toggle(userId: string, on: boolean) {
    if (on) await supabase.from("board_members").insert({ board_id: boardId, user_id: userId });
    else await supabase.from("board_members").delete().eq("board_id", boardId).eq("user_id", userId);
    reload();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Board members">
      <p className="text-sm text-[#A1A1AA] mb-4">
        Only members (and admins) can see this board.
      </p>
      <div className="space-y-1">
        {team.map((p) => {
          const on = memberIds.includes(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03] transition-colors">
              <Avatar name={p.full_name} src={p.avatar_url} size={28} />
              <span className="text-sm flex-1">{p.full_name}</span>
              {canManage ? (
                <button
                  onClick={() => toggle(p.id, !on)}
                  className={cn(
                    "h-6 w-10 rounded-full transition-colors duration-200 relative",
                    on ? "bg-[var(--ic-blue)]" : "bg-white/[0.1]"
                  )}
                  role="switch"
                  aria-checked={on}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200",
                      on ? "left-[18px]" : "left-0.5"
                    )}
                  />
                </button>
              ) : (
                on && <Check size={15} className="text-ic-green" />
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

/* ============================= page ============================= */

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;
  const router = useRouter();
  const { me, team, isAdmin } = useApp();
  const { board, lists, cards, memberIds, assignees, loading, notFound, setCards, setLists, reload } =
    useBoard(boardId);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const supabase = supabaseBrowser();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const openCard = useMemo(() => cards.find((c) => c.id === openCardId) ?? null, [cards, openCardId]);
  const canManage = isAdmin || board?.created_by === me.id;

  const peopleFor = useCallback(
    (c: Card) =>
      team.filter((p) => assignees.some((a) => a.card_id === c.id && a.user_id === p.id)),
    [team, assignees]
  );

  /* ---------- mutations ---------- */

  async function updateCard(id: string, patch: Partial<Card>) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase.from("cards").update(patch).eq("id", id);
  }

  async function deleteCard(id: string) {
    setCards((cs) => cs.filter((c) => c.id !== id));
    await supabase.from("cards").delete().eq("id", id);
  }

  async function addCard(listId: string, title: string) {
    const inList = cards.filter((c) => c.list_id === listId);
    const position = inList.length ? Math.max(...inList.map((c) => c.position)) + 1 : 1;
    const { data } = await supabase
      .from("cards")
      .insert({ board_id: boardId, list_id: listId, title, position, created_by: me.id })
      .select()
      .single();
    if (data) setCards((cs) => [...cs, { ...(data as Card), labels: [], checklist: [] }]);
  }

  async function toggleAssignee(cardId: string, userId: string, on: boolean) {
    if (on) await supabase.from("card_assignees").insert({ card_id: cardId, user_id: userId });
    else await supabase.from("card_assignees").delete().eq("card_id", cardId).eq("user_id", userId);
    reload();
  }

  async function addList() {
    const position = lists.length ? Math.max(...lists.map((l) => l.position)) + 1 : 1;
    const { data } = await supabase
      .from("board_lists")
      .insert({ board_id: boardId, name: "New list", position })
      .select()
      .single();
    if (data) setLists((ls) => [...ls, data as BoardList]);
  }

  async function renameList(id: string, name: string) {
    setLists((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)));
    await supabase.from("board_lists").update({ name }).eq("id", id);
  }

  async function deleteList(id: string) {
    setLists((ls) => ls.filter((l) => l.id !== id));
    setCards((cs) => cs.filter((c) => c.list_id !== id));
    await supabase.from("board_lists").delete().eq("id", id);
  }

  async function moveList(id: string, dir: -1 | 1) {
    const idx = lists.findIndex((l) => l.id === id);
    const other = lists[idx + dir];
    if (!other) return;
    const a = lists[idx];
    setLists((ls) =>
      [...ls]
        .map((l) => (l.id === a.id ? { ...l, position: other.position } : l.id === other.id ? { ...l, position: a.position } : l))
        .sort((x, y) => x.position - y.position)
    );
    await Promise.all([
      supabase.from("board_lists").update({ position: other.position }).eq("id", a.id),
      supabase.from("board_lists").update({ position: a.position }).eq("id", other.id),
    ]);
  }

  /* ---------- drag & drop ---------- */

  function onDragStart(e: DragStartEvent) {
    setActiveCard(cards.find((c) => c.id === e.active.id) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    // target list: either dropped on a card (its list) or on a list container
    let targetListId: string;
    let overCardId: string | null = null;
    const overData = over.data.current as { type?: string; listId?: string } | undefined;
    if (overData?.type === "card") {
      targetListId = overData.listId!;
      overCardId = String(over.id);
    } else if (overData?.type === "list") {
      targetListId = overData.listId!;
    } else return;

    const targetCards = cards
      .filter((c) => c.list_id === targetListId && c.id !== card.id)
      .sort((a, b) => a.position - b.position);

    let index = targetCards.length; // default: end of list
    if (overCardId && overCardId !== card.id) {
      const overIdx = targetCards.findIndex((c) => c.id === overCardId);
      if (overIdx >= 0) index = overIdx + (card.position > (targetCards[overIdx]?.position ?? 0) && card.list_id === targetListId ? 0 : 1);
    }

    const prev = targetCards[index - 1]?.position;
    const next = targetCards[index]?.position;
    const position =
      prev != null && next != null
        ? (prev + next) / 2
        : prev != null
          ? prev + 1
          : next != null
            ? next - 1
            : 1;

    if (card.list_id === targetListId && Math.abs(position - card.position) < 1e-9) return;

    setCards((cs) =>
      cs.map((c) => (c.id === card.id ? { ...c, list_id: targetListId, position } : c))
    );
    await supabase.from("cards").update({ list_id: targetListId, position }).eq("id", card.id);
  }

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-[264px] rounded-2xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !board) {
    return (
      <div className="text-center py-20">
        <p className="text-[#A1A1AA]">Board not found — or you&apos;re not a member.</p>
        <Link href="/boards" className="text-[var(--ic-blue)] text-sm mt-2 inline-block">
          ← All boards
        </Link>
      </div>
    );
  }

  const members = team.filter((p) => memberIds.includes(p.id));

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <Link
          href="/boards"
          className="p-1.5 rounded-lg text-[#52525B] hover:text-[#FAFAFA] hover:bg-white/[0.05] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: board.color }} />
        <div className="min-w-0 flex-1">
          <h1 className="heading text-xl sm:text-2xl truncate">{board.name}</h1>
          {board.description && (
            <p className="text-[13px] text-[#52525B] truncate">{board.description}</p>
          )}
        </div>
        <button onClick={() => setMembersOpen(true)} className="hover:opacity-80 transition-opacity">
          <AvatarStack people={members} size={26} />
        </button>
        <Button size="sm" onClick={() => setMembersOpen(true)}>
          <Users size={13} /> Members
        </Button>
        {canManage && (
          <Button size="sm" variant="danger" onClick={() => setDeletingBoard(true)}>
            <Trash2 size={13} />
          </Button>
        )}
      </header>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveCard(null)}>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x -mx-4 px-4 sm:mx-0 sm:px-0 items-start h-[calc(100vh-220px)] min-h-[420px]">
          {lists.map((list, i) => (
            <ListColumn
              key={list.id}
              list={list}
              cards={cards.filter((c) => c.list_id === list.id).sort((a, b) => a.position - b.position)}
              peopleFor={peopleFor}
              onOpenCard={(c) => setOpenCardId(c.id)}
              onRename={(name) => renameList(list.id, name)}
              onDelete={() => deleteList(list.id)}
              onAddCard={(title) => addCard(list.id, title)}
              onMove={(dir) => moveList(list.id, dir)}
              isFirst={i === 0}
              isLast={i === lists.length - 1}
            />
          ))}
          <button
            onClick={addList}
            className="w-[264px] shrink-0 rounded-2xl border border-dashed border-white/10 text-[#52525B] hover:text-[#A1A1AA] hover:border-white/20 transition-colors flex items-center justify-center gap-1.5 h-24 text-sm snap-start"
          >
            <Plus size={15} /> Add list
          </button>
        </div>
        <DragOverlay>
          {activeCard && <CardTile card={activeCard} people={peopleFor(activeCard)} overlay />}
        </DragOverlay>
      </DndContext>

      <CardDetail
        card={openCard}
        onClose={() => setOpenCardId(null)}
        onUpdate={updateCard}
        onDelete={deleteCard}
        assignees={assignees}
        onToggleAssignee={toggleAssignee}
        boardMemberIds={memberIds}
      />
      <MembersDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        boardId={boardId}
        memberIds={memberIds}
        canManage={!!canManage}
        reload={reload}
      />
      <ConfirmDialog
        open={deletingBoard}
        onClose={() => setDeletingBoard(false)}
        onConfirm={async () => {
          await supabase.from("boards").delete().eq("id", boardId);
          router.push("/boards");
        }}
        title="Delete board?"
        message={`“${board.name}” with all lists and cards will be permanently deleted.`}
      />
    </div>
  );
}
