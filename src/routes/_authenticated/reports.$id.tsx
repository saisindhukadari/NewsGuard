import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReport, toggleBookmark, deleteReport } from "@/lib/analysis.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Trash2, Lightbulb, CheckCircle2, AlertCircle, HelpCircle, XCircle } from "lucide-react";
import { categoryMeta, verdictMeta, type Category } from "@/lib/credibility";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({ meta: [{ title: "Report — NewsGuard" }] }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchReport = useServerFn(getReport);
  const bookmark = useServerFn(toggleBookmark);
  const remove = useServerFn(deleteReport);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReport({ data: { id } }),
  });

  const bookmarkMut = useMutation({
    mutationFn: (b: boolean) => bookmark({ data: { id, bookmarked: b } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); qc.invalidateQueries({ queryKey: ["reports"] }); },
  });
  const deleteMut = useMutation({
    mutationFn: () => remove({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["reports"] }); navigate({ to: "/reports" }); },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !report) return <p className="text-sm text-danger">Could not load report.</p>;

  const m = categoryMeta[report.category as Category];
  const indicators = (report.indicators ?? {}) as Record<string, number>;
  const claims = (report.claims ?? []) as { claim: string; verdict: string; note: string }[];
  const tips = (report.tips ?? []) as string[];

  const verdictIcon: Record<string, React.ReactNode> = {
    supported: <CheckCircle2 className="h-4 w-4 text-success" />,
    unsupported: <XCircle className="h-4 w-4 text-danger" />,
    questionable: <AlertCircle className="h-4 w-4 text-warning" />,
    unverifiable: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </Link>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => bookmarkMut.mutate(!report.bookmarked)}>
            {report.bookmarked ? <><BookmarkCheck className="mr-1.5 h-4 w-4 text-primary" /> Bookmarked</> : <><Bookmark className="mr-1.5 h-4 w-4" /> Bookmark</>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this report?")) deleteMut.mutate(); }}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <header className="rounded-2xl border bg-gradient-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${m.chip}`}>{m.label}</span>
          {report.source_url && (
            <a href={report.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3 w-3" /> Open source
            </a>
          )}
          <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{report.title ?? "Untitled article"}</h1>
        {report.excerpt && <p className="mt-2 text-muted-foreground">{report.excerpt}</p>}

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-muted-foreground">Credibility score</span>
            <span className={`text-3xl font-bold ${m.tone}`}>{report.credibility_score}<span className="text-base text-muted-foreground">/100</span></span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${m.bar} transition-all`} style={{ width: `${report.credibility_score}%` }} />
          </div>
        </div>
      </header>

      {(() => {
        const fakeProb = typeof (indicators as any).fake_news_probability === "number"
          ? (indicators as any).fake_news_probability
          : Math.max(0, 100 - (report.credibility_score ?? 0));
        const risk: "low" | "medium" | "high" =
          (indicators as any).risk_level ??
          ((report.credibility_score ?? 0) >= 70 ? "low" : (report.credibility_score ?? 0) >= 40 ? "medium" : "high");
        const riskMeta = {
          low: { label: "Low Risk", chip: "bg-success/15 text-success border border-success/30" },
          medium: { label: "Medium Risk", chip: "bg-warning/15 text-warning border border-warning/40" },
          high: { label: "High Risk", chip: "bg-danger/15 text-danger border border-danger/30" },
        }[risk];
        const fact = (indicators as any).fact_consistency as string | undefined;
        const factMeta: Record<string, { label: string; chip: string }> = {
          verified: { label: "Verified", chip: "bg-success/15 text-success border border-success/30" },
          partially_verified: { label: "Partially Verified", chip: "bg-warning/15 text-warning border border-warning/40" },
          unverified: { label: "Unverified", chip: "bg-danger/15 text-danger border border-danger/30" },
        };
        const bias = typeof (indicators as any).political_bias === "number" ? (indicators as any).political_bias : null;
        return (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="text-xs font-medium text-muted-foreground">Fake News Probability</div>
              <div className="mt-2 text-3xl font-bold text-danger">{Math.round(fakeProb)}<span className="text-base text-muted-foreground">/100</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-danger" style={{ width: `${fakeProb}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="text-xs font-medium text-muted-foreground">Risk Level</div>
              <div className="mt-2"><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${riskMeta.chip}`}>{riskMeta.label}</span></div>
              {fact && factMeta[fact] && (
                <div className="mt-4">
                  <div className="text-xs font-medium text-muted-foreground">Fact Consistency</div>
                  <div className="mt-1.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${factMeta[fact].chip}`}>{factMeta[fact].label}</span></div>
                </div>
              )}
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="text-xs font-medium text-muted-foreground">Political Bias</div>
              {bias === null ? (
                <div className="mt-2 text-sm text-muted-foreground">Not detected</div>
              ) : (
                <>
                  <div className="mt-2 text-sm font-semibold">{bias < -25 ? "Left-leaning" : bias > 25 ? "Right-leaning" : "Center / Neutral"}</div>
                  <div className="relative mt-3 h-2 rounded-full bg-muted">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-primary shadow"
                      style={{ left: `calc(${50 + bias / 2}% - 8px)` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground"><span>Left</span><span>Center</span><span>Right</span></div>
                </>
              )}
            </div>
          </section>
        );
      })()}

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Summary</h2>
        <p className="mt-2 leading-relaxed">{report.summary}</p>
      </section>


      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Why this score</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.explanation}</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Signals</h2>
          <div className="mt-3 space-y-3">
            {[
              { key: "clickbait", label: "Clickbait", invert: true },
              { key: "sensational_language", label: "Sensational language", invert: true },
              { key: "source_transparency", label: "Source transparency", invert: false },
              { key: "evidence_quality", label: "Evidence quality", invert: false },
            ].map((s) => {
              const val = indicators[s.key] ?? 0;
              const good = s.invert ? 100 - val : val;
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-xs">
                    <span>{s.label}</span>
                    <span className="text-muted-foreground">{val}/100</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${good >= 60 ? "bg-success" : good >= 35 ? "bg-warning" : "bg-danger"}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {claims.length > 0 && (
        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Key claims</h2>
          <ul className="mt-3 space-y-3">
            {claims.map((c, i) => {
              const v = verdictMeta[c.verdict] ?? verdictMeta.unverifiable;
              return (
                <li key={i} className="rounded-xl border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{verdictIcon[c.verdict] ?? verdictIcon.unverifiable}</div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.chip}`}>{v.label}</span>
                      </div>
                      <p className="mt-1 font-medium">{c.claim}</p>
                      {c.note && <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tips.length > 0 && (
        <section className="rounded-2xl border bg-gradient-card p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Lightbulb className="h-5 w-5 text-primary" /> Tips for next time</h2>
          <ul className="mt-3 space-y-2">
            {tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
