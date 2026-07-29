import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listReports, toggleBookmark, deleteReport } from "@/lib/analysis.functions";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Trash2, ExternalLink, ScanSearch } from "lucide-react";
import { categoryMeta, type Category } from "@/lib/credibility";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — NewsGuard" }] }),
  component: Reports,
});

function Reports() {
  const fetchReports = useServerFn(listReports);
  const bookmark = useServerFn(toggleBookmark);
  const remove = useServerFn(deleteReport);
  const qc = useQueryClient();
  const { data: reports = [], isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => fetchReports() });
  const [filter, setFilter] = useState<"all" | "bookmarked">("all");

  const bookmarkMut = useMutation({
    mutationFn: (v: { id: string; bookmarked: boolean }) => bookmark({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Deleted"); },
  });

  const visible = filter === "bookmarked" ? reports.filter((r) => r.bookmarked) : reports;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="mt-1 text-muted-foreground">Every article you've analyzed.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "bookmarked" ? "default" : "outline"} size="sm" onClick={() => setFilter("bookmarked")}>
            <BookmarkCheck className="mr-1.5 h-4 w-4" /> Bookmarked
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-card p-12 text-center">
          <ScanSearch className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold">{filter === "bookmarked" ? "No bookmarks yet" : "No reports yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Run an analysis to start building your library.</p>
          <Link to="/analyze" className="mt-5 inline-block"><Button>Analyze an article</Button></Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((r) => {
            const m = categoryMeta[r.category as Category];
            return (
              <div key={r.id} className="group rounded-xl border bg-card p-4 shadow-card transition hover:border-primary/50">
                <div className="flex items-start gap-4">
                  <Link to="/reports/$id" params={{ id: r.id }} className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl text-lg font-bold ${m.chip}`}>
                    {r.credibility_score}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to="/reports/$id" params={{ id: r.id }} className="block">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.chip}`}>{m.label}</span>
                        {r.source_url && (
                          <a href={r.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                             className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3 w-3" /> Source
                          </a>
                        )}
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="mt-1 truncate font-semibold">{r.title ?? "Untitled article"}</h3>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{r.excerpt}</p>
                    </Link>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => bookmarkMut.mutate({ id: r.id, bookmarked: !r.bookmarked })}>
                      {r.bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this report?")) deleteMut.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
