"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Editor, Tldraw, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

export function Whiteboard({ userId }: { userId: string }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const supabase = supabaseBrowser();

  useEffect(() => {
    supabase
      .from("whiteboards")
      .select("document")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setDoc((data?.document as Record<string, unknown>) ?? null);
        setReady(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onMount = useCallback(
    (editor: Editor) => {
      if (doc && Object.keys(doc).length > 0) {
        try {
          loadSnapshot(editor.store, doc as never);
        } catch {
          // corrupt/old snapshot — start fresh
        }
      }
      const unlisten = editor.store.listen(
        () => {
          setSaveState("saving");
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(async () => {
            const snapshot = getSnapshot(editor.store);
            await supabase
              .from("whiteboards")
              .upsert(
                { user_id: userId, document: snapshot as never },
                { onConflict: "user_id" }
              );
            setSaveState("saved");
          }, 900);
        },
        { scope: "document", source: "user" }
      );
      return () => unlisten();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, userId]
  );

  if (!ready) return <div className="skeleton h-[480px] rounded-2xl" />;

  return (
    <div
      className={cn(
        "relative hairline rounded-2xl overflow-hidden bg-elevated",
        fullscreen ? "fixed inset-0 z-50 rounded-none" : "h-[480px]"
      )}
    >
      <Tldraw inferDarkMode onMount={onMount} />
      <div className="absolute top-3 right-3 z-[300] flex items-center gap-2">
        <span className="text-[11px] text-[#52525B] bg-black/50 rounded-full px-2 py-1 backdrop-blur">
          {saveState === "saving" ? "Saving…" : "Saved"}
        </span>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="h-8 w-8 rounded-full bg-black/50 backdrop-blur hairline flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors"
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </div>
  );
}
