"use client";

import { useApp } from "@/components/shell/app-context";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Client, FileMeta } from "@/lib/types";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import {
  Download,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function iconFor(mime: string | null) {
  if (mime?.startsWith("image/")) return ImageIcon;
  if (mime?.startsWith("video/")) return FileVideo;
  return FileText;
}

export default function FilesPage() {
  const { me, team, isAdmin } = useApp();
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [folder, setFolder] = useState<string>("General");
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<FileMeta | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const [{ data: fs }, { data: cs }] = await Promise.all([
      supabase.from("files_meta").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").eq("archived", false).order("company_name"),
    ]);
    setFiles((fs ?? []) as FileMeta[]);
    setClients((cs ?? []) as Client[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // folder list: General + one per client (auto-created)
  const folders = useMemo(
    () => ["General", ...clients.map((c) => c.company_name)],
    [clients]
  );

  const visible = useMemo(() => files.filter((f) => f.folder === folder), [files, folder]);

  // signed thumbnails for images in view
  useEffect(() => {
    const images = visible.filter((f) => f.mime_type?.startsWith("image/") && !thumbs[f.id]);
    if (images.length === 0) return;
    Promise.all(
      images.map(async (f) => {
        const { data } = await supabase.storage.from("files").createSignedUrl(f.path, 3600);
        return [f.id, data?.signedUrl ?? ""] as const;
      })
    ).then((pairs) => {
      setThumbs((t) => ({ ...t, ...Object.fromEntries(pairs.filter(([, u]) => u)) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function upload(fileList: FileList | File[]) {
    setError(null);
    const list = Array.from(fileList);
    const tooBig = list.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setError(
        `“${tooBig.name}” is ${formatBytes(tooBig.size)} — over the 50MB cap. Big video masters live in Drive; this hub is for briefs, assets and docs.`
      );
      return;
    }
    setUploading(true);
    const client = clients.find((c) => c.company_name === folder);
    for (const file of list) {
      const path = `${folder}/${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9./ _-]/g, "_");
      const { error: upErr } = await supabase.storage.from("files").upload(path, file);
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      await supabase.from("files_meta").insert({
        name: file.name,
        path,
        size: file.size,
        mime_type: file.type || null,
        folder,
        client_id: client?.id ?? null,
        uploaded_by: me.id,
      });
    }
    setUploading(false);
    load();
  }

  async function download(f: FileMeta) {
    const { data } = await supabase.storage.from("files").createSignedUrl(f.path, 60, {
      download: f.name,
    });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function remove(f: FileMeta) {
    await supabase.storage.from("files").remove([f.path]);
    await supabase.from("files_meta").delete().eq("id", f.id);
    load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading text-[28px] sm:text-[32px]">Files</h1>
        <p className="text-sm text-[#52525B] mt-1">
          Briefs, assets and docs — 50MB max per file. Video masters stay in Drive.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-ic-red/[0.08] border border-ic-red/20 px-4 py-3 text-sm text-ic-red">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr] items-start">
        {/* folders */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 h-9 text-sm font-medium transition-colors duration-150 whitespace-nowrap",
                folder === f
                  ? "bg-[color-mix(in_srgb,var(--ic-blue)_13%,transparent)] text-[var(--ic-blue)]"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.05]"
              )}
            >
              {folder === f ? <FolderOpen size={15} /> : <Folder size={15} />}
              <span className="truncate">{f}</span>
              <span className="ml-auto text-[11px] text-[#52525B] tabular-nums hidden lg:block">
                {files.filter((x) => x.folder === f).length || ""}
              </span>
            </button>
          ))}
        </nav>

        {/* drop zone + list */}
        <div className="space-y-4 min-w-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              upload(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "rounded-2xl border border-dashed p-8 text-center cursor-pointer transition-all duration-150",
              dragging
                ? "border-[var(--ic-blue)] bg-[color-mix(in_srgb,var(--ic-blue)_6%,transparent)]"
                : "border-white/10 hover:border-white/20 bg-white/[0.02]"
            )}
          >
            <UploadCloud
              size={22}
              className={cn("mx-auto mb-2", dragging ? "text-[var(--ic-blue)]" : "text-[#52525B]")}
            />
            <p className="text-sm text-[#A1A1AA]">
              {uploading ? "Uploading…" : (
                <>
                  Drop files into <span className="font-medium text-[#FAFAFA]">{folder}</span> or click to browse
                </>
              )}
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && upload(e.target.files)}
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={Folder} message={`Nothing in ${folder} yet. Drop the first file above.`} />
          ) : (
            <div className="surface divide-y divide-white/[0.04] overflow-hidden">
              {visible.map((f) => {
                const uploader = team.find((p) => p.id === f.uploaded_by);
                const Icon = iconFor(f.mime_type);
                const canDelete = isAdmin || f.uploaded_by === me.id;
                return (
                  <div key={f.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    {f.mime_type?.startsWith("image/") && thumbs[f.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[f.id]} alt="" className="h-9 w-9 rounded-lg object-cover hairline shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-white/[0.05] hairline flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-[#71717A]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{f.name}</p>
                      <p className="text-[11px] text-[#52525B]">
                        {formatBytes(Number(f.size))} · {formatDate(f.created_at)}
                      </p>
                    </div>
                    {uploader && (
                      <Avatar name={uploader.full_name} src={uploader.avatar_url} size={22} />
                    )}
                    <button
                      onClick={() => download(f)}
                      className="p-1.5 rounded-md text-[#52525B] hover:text-[var(--ic-blue)] hover:bg-white/[0.05] transition-colors"
                      aria-label="Download"
                    >
                      <Download size={15} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setDeleting(f)}
                        className="p-1.5 rounded-md text-[#52525B] hover:text-ic-red hover:bg-ic-red/10 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Delete file?"
        message={`“${deleting?.name}” will be permanently removed from storage.`}
      />
    </div>
  );
}
