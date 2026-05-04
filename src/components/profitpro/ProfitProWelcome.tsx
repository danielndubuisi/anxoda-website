import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, Sparkles, History, FlaskConical, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PastAnalysis {
  id: string;
  title: string;
  created_at: string;
  cvp_results: any;
  ai_insights: any;
  config: any;
}

interface ProfitProWelcomeProps {
  onStart: () => void;
  onBack: () => void;
  onOpenAnalysis?: (analysis: PastAnalysis, opts?: { goToWhatIf?: boolean }) => void;
}

const fmtUnits = (n: number) => {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

const fmtNGN = (n: number) => {
  if (!isFinite(n)) return "₦0";
  if (Math.abs(n) >= 1e6) return `₦${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `₦${(n / 1e3).toFixed(1)}K`;
  return `₦${n.toFixed(0)}`;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const FirstTimeWelcome = ({ onStart, onBack }: { onStart: () => void; onBack: () => void }) => (
  <div className="max-w-xl mx-auto">
    <Card className="overflow-hidden border-primary/20 shadow-lg bg-gradient-to-br from-background via-background to-primary/5">
      <CardContent className="p-8 sm:p-10 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 animate-scale-in">
          <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shrink-0">
            <TrendingUp className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hello there <span className="inline-block animate-pulse">👋</span>
            </h1>
            <p className="text-sm text-muted-foreground">Welcome to ProfitPro</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-base sm:text-lg font-medium leading-relaxed">
            Want to boost your profits and know exactly what it takes?
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Tell me a little about your business and I'll show you the smallest number of sales you need to start making real profit — plus how to get there faster.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button size="lg" onClick={onStart} className="w-full sm:w-auto group shadow-md hover:shadow-lg transition-all">
            Let's go
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <Button size="lg" variant="ghost" onClick={onBack} className="w-full sm:w-auto">
            Back to Tools
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          Takes about 2 minutes.
        </p>
      </CardContent>
    </Card>
  </div>
);

const LoadingState = () => (
  <div className="max-w-2xl mx-auto space-y-4">
    <Skeleton className="h-8 w-1/2" />
    <Card className="border-primary/20">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export const ProfitProWelcome = ({ onStart, onBack, onOpenAnalysis }: ProfitProWelcomeProps) => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<PastAnalysis[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setAnalyses([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("profitpro_analyses")
        .select("id, title, created_at, cvp_results, ai_insights, config")
        .eq("user_id", user.id)
        .eq("processing_status", "completed")
        .not("cvp_results", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && data) setAnalyses(data as any);
      else setAnalyses([]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <LoadingState />;

  if (!analyses || analyses.length === 0) {
    return <FirstTimeWelcome onStart={onStart} onBack={onBack} />;
  }

  const [latest, ...older] = analyses;
  const latestDa = (latest.config as any)?.dialogueAnswers;
  const latestCvp = latest.cvp_results || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back <span className="inline-block">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground">Pick up where you left off — or test a new what-if.</p>
        </div>
        <Button variant="ghost" onClick={onBack}>Back to Tools</Button>
      </div>

      {/* Latest analysis hero */}
      <Card className="overflow-hidden border-primary/30 shadow-md bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px] uppercase tracking-wide">
                  <Sparkles className="h-3 w-3 mr-1" /> Most recent
                </Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(latest.created_at)}</span>
              </div>
              <h3 className="text-lg font-bold truncate">{latest.title}</h3>
              {latestDa?.industry && (
                <p className="text-xs text-muted-foreground">{latestDa.industry}</p>
              )}
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-md bg-background/60 border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Target profit</p>
              <p className="font-semibold">
                {latestDa?.targetProfit ? fmtNGN(latestDa.targetProfit) : "—"}
                {latestDa?.period && (
                  <span className="text-xs text-muted-foreground"> /{latestDa.period.replace("ly", "")}</span>
                )}
              </p>
            </div>
            <div className="rounded-md bg-background/60 border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Break-even units</p>
              <p className="font-semibold">{fmtUnits(latestCvp.breakEvenUnits || 0)}</p>
            </div>
            <div className="rounded-md bg-background/60 border border-border/60 p-3 col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Current profit</p>
              <p className={`font-semibold ${(latestCvp.operatingIncome || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {fmtNGN(latestCvp.operatingIncome || 0)}
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button onClick={() => onOpenAnalysis?.(latest)} className="shadow-md">
              Open insights <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="secondary" onClick={() => onOpenAnalysis?.(latest, { goToWhatIf: true })}>
              <FlaskConical className="h-4 w-4 mr-1" /> Run a What-If
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Older analyses */}
      {older.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <History className="h-3 w-3" /> Earlier analyses
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {older.map(a => {
              const da = (a.config as any)?.dialogueAnswers;
              const cvp = a.cvp_results || {};
              return (
                <Card
                  key={a.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => onOpenAnalysis?.(a)}
                >
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{a.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo(a.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {da?.industry || "Analysis"} · BE {fmtUnits(cvp.breakEvenUnits || 0)} units
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Fresh start CTA */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="lg" onClick={onStart}>
          <Plus className="h-4 w-4 mr-1" /> Start a fresh analysis
        </Button>
      </div>
    </div>
  );
};
