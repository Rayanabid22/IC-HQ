"use client";

import { useApp } from "@/components/shell/app-context";
import { Avatar } from "@/components/ui/avatar";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Comment } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function CommentThread({
  entityType,
  entityId,
}: {
  entityType: Comment["entity_type"];
  entityId: string;
}) {
  const { me, team } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at");
    setComments((data ?? []) as Comment[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      entity_type: entityType,
      entity_id: entityId,
      author: me.id,
      body: text,
      created_at: new Date().toISOString(),
    };
    setComments((c) => [...c, optimistic]);
    await supabase.from("comments").insert({
      entity_type: entityType,
      entity_id: entityId,
      author: me.id,
      body: text,
    });
    load();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-[13px] text-[#52525B]">No comments yet.</p>
        )}
        {comments.map((c) => {
          const author = team.find((p) => p.id === c.author);
          return (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={author?.full_name ?? "?"} src={author?.avatar_url} size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <span className="font-medium">{author?.full_name ?? "Unknown"}</span>{" "}
                  <span className="text-[11px] text-[#52525B]">{formatDateTime(c.created_at)}</span>
                </p>
                <p className="text-sm text-[#D4D4D8] leading-relaxed whitespace-pre-wrap break-words">
                  {c.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          className="flex-1 h-9 rounded-full bg-white/[0.04] hairline px-4 text-sm outline-none placeholder:text-[#52525B] focus:bg-white/[0.06] transition-colors min-w-0"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="h-9 w-9 rounded-full bg-[var(--ic-blue)] flex items-center justify-center text-white disabled:opacity-30 transition-all hover:brightness-110 shrink-0"
          aria-label="Send"
        >
          <SendHorizontal size={15} />
        </button>
      </form>
    </div>
  );
}
