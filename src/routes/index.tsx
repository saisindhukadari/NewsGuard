import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ScanSearch, BookOpenCheck, Sparkles, ArrowRight, Brain, LinkIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NewsGuard — Spot Misinformation. Build Media Literacy." },
      { name: "description", content: "A free tool for students to analyze news articles, verify claims, and learn how misinformation works." },
      { property: "og:title", content: "NewsGuard — Spot Misinformation" },
      { property: "og:description", content: "Analyze articles, check credibility, and build media literacy." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="text-lg">NewsGuard</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button>Get started</Button></Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-[0.08]" />
        <div className="container mx-auto px-4 pb-20 pt-12 text-center md:pt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-Powered Fake News Detection & Credibility Analysis Platform
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Read the news with{" "}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              NewsGuard
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Paste an article or a link. NewsGuard analyzes credibility, detects bias, flags misinformation patterns, and explains why — so you can think critically and share responsibly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2">Start analyzing <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <a href="#how"><Button size="lg" variant="outline">How it works</Button></a>
          </div>
        </div>
      </section>

      <section id="how" className="container mx-auto px-4 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: LinkIcon, title: "Submit", body: "Paste an article URL or full text. We extract the content cleanly." },
            { icon: Brain, title: "Analyze", body: "AI scores credibility, flags clickbait, sensational language, and weak sourcing." },
            { icon: BookOpenCheck, title: "Learn", body: "Get a plain-English explanation, key claims, and tips you can reuse." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-gradient-card p-6 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl border bg-gradient-card p-8 shadow-card md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Built for students, not algorithms.</h2>
              <p className="mt-3 text-muted-foreground">
                Misinformation spreads fast. NewsGuard helps you slow down, ask better questions, and recognize the patterns that fake news relies on.
              </p>
              <Link to="/auth" className="mt-6 inline-block">
                <Button size="lg">Create a free account</Button>
              </Link>
            </div>
            <div className="rounded-2xl border bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Credibility</span>
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Reliable · 87</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[87%] bg-success" /></div>
              <div className="mt-5 space-y-3">
                {[
                  { l: "Source transparency", v: 92 },
                  { l: "Evidence quality", v: 84 },
                  { l: "Clickbait", v: 12 },
                ].map((r) => (
                  <div key={r.l}>
                    <div className="flex justify-between text-xs"><span>{r.l}</span><span className="text-muted-foreground">{r.v}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.v}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} NewsGuard</span>
          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Built for learning, not a substitute for professional fact-checking.</span>
        </div>
      </footer>
    </div>
  );
}
