import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listReports } from "@/lib/analysis.functions";
import { Button } from "@/components/ui/button";
import { ScanSearch, FileBarChart2, ShieldAlert, ShieldCheck, ArrowUpRight } from "lucide-react";
import { categoryMeta, type Category } from "@/lib/credibility";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NewsGuard" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchReports = useServerFn(listReports);
  const { data: reports = [], isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => fetchReports() });

  const stats = useMemo(() => {
    const total = reports.length;
    const reliable = reports.filter((r) => r.category === "reliable" || r.category === "mostly_reliable").length;
    const suspicious = reports.filter((r) => r.category === "suspicious" || r.category === "potentially_fake").length;
    const avg = total ? Math.round(reports.reduce((s, r) => s + (r.credibility_score ?? 0), 0) / total) : 0;
    return { total, reliable, suspicious, avg };
  }, [reports]);

  const pieData = useMemo(() => {
    const counts: Record<Category, number> = { reliable: 0, mostly_reliable: 0, suspicious: 0, potentially_fake: 0 };
    reports.forEach((r) => { counts[r.category as Category] = (counts[r.category as Category] ?? 0) + 1; });
    return (Object.keys(counts) as Category[]).map((k) => ({ name: categoryMeta[k].label, value: counts[k], key: k }));
  }, [reports]);

  const pieColors = ["var(--color-success)", "var(--color-info)", "var(--color-warning)", "var(--color-danger)"];

  const trend = useMemo(() => {
    const map = new Map<string, { date: string; count: number; avg: number; sum: number }>();
    [...reports].reverse().slice(-30).forEach((r) => {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      const cur = map.get(d) ?? { date: d.slice(5), count: 0, avg: 0, sum: 0 };
      cur.count += 1; cur.sum += r.credibility_score ?? 0; cur.avg = Math.round(cur.sum / cur.count);
      map.set(d, cur);
    });
    return Array.from(map.values());
  }, [reports]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Your media-literacy activity at a glance.</p>
        </div>
        <Link to="/analyze"><Button size="lg"><ScanSearch className="mr-2 h-4 w-4" /> Analyze an article</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<FileBarChart2 className="h-5 w-5" />} label="Articles analyzed" value={stats.total} tone="text-primary" />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Reliable / Mostly" value={stats.reliable} tone="text-success" />
        <StatCard icon={<ShieldAlert className="h-5 w-5" />} label="Suspicious / Fake" value={stats.suspicious} tone="text-danger" />
        <StatCard icon={<FileBarChart2 className="h-5 w-5" />} label="Average credibility" value={stats.avg} tone="text-info" suffix=" / 100" />
      </div>

      {reports.length === 0 ? (
        <EmptyDash loading={isLoading} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border bg-gradient-card p-6 shadow-card lg:col-span-2">
              <h3 className="font-semibold">Distribution</h3>
              <p className="text-sm text-muted-foreground">By credibility category</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border bg-gradient-card p-6 shadow-card lg:col-span-3">
              <h3 className="font-semibold">Recent activity</h3>
              <p className="text-sm text-muted-foreground">Credibility scores over time</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Bar dataKey="avg" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h3 className="font-semibold">Recent reports</h3>
                <p className="text-sm text-muted-foreground">Your latest analyses</p>
              </div>
              <Link to="/reports"><Button variant="ghost" size="sm">View all <ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
            </div>
            <ul className="divide-y">
              {reports.slice(0, 5).map((r) => {
                const m = categoryMeta[r.category as Category];
                return (
                  <li key={r.id}>
                    <Link to="/reports/$id" params={{ id: r.id }} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold ${m.chip}`}>{r.credibility_score}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.title ?? "Untitled article"}</p>
                        <p className="truncate text-sm text-muted-foreground">{r.excerpt}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${m.chip}`}>{m.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone, suffix }: { icon: React.ReactNode; label: string; value: number; tone: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border bg-gradient-card p-5 shadow-card">
      <div className={`mb-3 inline-grid h-10 w-10 place-items-center rounded-lg bg-background ${tone}`}>{icon}</div>
      <div className="text-3xl font-bold">{value}{suffix}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyDash({ loading }: { loading: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-card p-12 text-center">
      <ScanSearch className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 text-lg font-semibold">{loading ? "Loading…" : "No analyses yet"}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Run your first analysis to see stats and charts here.</p>
      {!loading && <Link to="/analyze" className="mt-5 inline-block"><Button>Analyze an article</Button></Link>}
    </div>
  );
}
