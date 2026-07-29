import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeArticle } from "@/lib/analysis.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertCircle,
  FileText,
  Lightbulb,
  LinkIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({ meta: [{ title: "Analyze — NewsGuard" }] }),
  component: Analyze,
});

function Analyze() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeArticle);
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const getAnalysisErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err ?? "Analysis failed");
    if (
      message.includes("valid data format") ||
      message.includes("schema") ||
      message.includes("JSON")
    ) {
      return "AI returned invalid data format. The article was received, but response validation failed.";
    }
    if (message.includes("fetch") || message.includes("extract")) {
      return "Article extraction failed. Try pasting the article text instead.";
    }
    if (message.includes("Rate limit")) return "AI rate limit reached. Try again in a minute.";
    if (message.includes("credits")) {
      return "AI analysis is temporarily unavailable because credits are exhausted.";
    }
    return message;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      setDiagnostic(null);
      if (mode === "url") return analyze({ data: { sourceType: "url", url } });
      return analyze({ data: { sourceType: "text", text } });
    },
    onSuccess: (res) => {
      toast.success("Analysis complete");
      navigate({ to: "/reports/$id", params: { id: res.id } });
    },
    onError: (err: unknown) => {
      const message = getAnalysisErrorMessage(err);
      setDiagnostic(message);
      toast.error(message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analyze an article</h1>
        <p className="mt-1 text-muted-foreground">
          Submit a link or paste the article text. We'll fetch, summarize, and score it.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl border bg-gradient-card p-6 shadow-card">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "text")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">
              <LinkIcon className="mr-1.5 h-4 w-4" /> URL
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="mr-1.5 h-4 w-4" /> Paste text
            </TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="mt-5 space-y-2">
            <Label htmlFor="url">Article URL</Label>
            <Input
              id="url"
              type="url"
              required={mode === "url"}
              placeholder="https://example.com/news-article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={mutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              We fetch the page, extract the main content, and analyze it.
            </p>
          </TabsContent>
          <TabsContent value="text" className="mt-5 space-y-2">
            <Label htmlFor="text">Article text</Label>
            <Textarea
              id="text"
              required={mode === "text"}
              rows={10}
              placeholder="Paste the full article text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={mutation.isPending}
              maxLength={50000}
            />
            <p className="text-xs text-muted-foreground">{text.length} / 50,000 characters</p>
          </TabsContent>
        </Tabs>

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Analyze
            </>
          )}
        </Button>

        {diagnostic && (
          <div className="mt-4 flex gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{diagnostic}</span>
          </div>
        )}
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Credibility score",
            body: "0–100 based on sourcing, evidence, tone, and red flags.",
          },
          {
            icon: FileText,
            title: "Plain summary",
            body: "A short, student-friendly summary of what the article says.",
          },
          {
            icon: Lightbulb,
            title: "Learn why",
            body: "We explain the score so you can spot patterns next time.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-5">
            <f.icon className="h-5 w-5 text-primary" />
            <h4 className="mt-2 font-semibold">{f.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
