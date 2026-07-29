export type Category = "reliable" | "mostly_reliable" | "suspicious" | "potentially_fake";

export const categoryMeta: Record<Category, { label: string; tone: string; bar: string; chip: string }> = {
  reliable: {
    label: "Reliable",
    tone: "text-success",
    bar: "bg-success",
    chip: "bg-success/15 text-success border border-success/30",
  },
  mostly_reliable: {
    label: "Mostly Reliable",
    tone: "text-info",
    bar: "bg-info",
    chip: "bg-info/15 text-info border border-info/30",
  },
  suspicious: {
    label: "Suspicious",
    tone: "text-warning",
    bar: "bg-warning",
    chip: "bg-warning/15 text-warning border border-warning/40",
  },
  potentially_fake: {
    label: "Potentially Fake",
    tone: "text-danger",
    bar: "bg-danger",
    chip: "bg-danger/15 text-danger border border-danger/30",
  },
};

export const verdictMeta: Record<string, { label: string; chip: string }> = {
  supported: { label: "Supported", chip: "bg-success/15 text-success border border-success/30" },
  unsupported: { label: "Unsupported", chip: "bg-danger/15 text-danger border border-danger/30" },
  questionable: { label: "Questionable", chip: "bg-warning/15 text-warning border border-warning/40" },
  unverifiable: { label: "Unverifiable", chip: "bg-muted text-muted-foreground border" },
};
