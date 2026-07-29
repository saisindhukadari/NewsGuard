import { Link, useRouter } from "@tanstack/react-router";
import { ShieldCheck, LayoutDashboard, ScanSearch, BookmarkCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function AppNav() {
  const router = useRouter();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const linkCls = "px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors";
  const activeCls = "text-foreground bg-muted";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span>NewsGuard</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/dashboard" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            <LayoutDashboard className="mr-1.5 inline h-4 w-4" />Dashboard
          </Link>
          <Link to="/analyze" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            <ScanSearch className="mr-1.5 inline h-4 w-4" />Analyze
          </Link>
          <Link to="/reports" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            <BookmarkCheck className="mr-1.5 inline h-4 w-4" />Reports
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
