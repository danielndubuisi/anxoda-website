import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, BarChart3, MessageSquare, ArrowRight, Zap } from "lucide-react";

interface ProfitProWelcomeProps {
  onStart: () => void;
  onBack: () => void;
}

export const ProfitProWelcome = ({ onStart, onBack }: ProfitProWelcomeProps) => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="overflow-hidden border-primary/20 shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
        <CardContent className="p-8 sm:p-12 text-center space-y-8 animate-fade-in">
          {/* Hero icon */}
          <div className="relative mx-auto w-24 h-24 animate-scale-in">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-primary/60 blur-xl opacity-50 animate-pulse" />
            <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <TrendingUp className="h-12 w-12 text-primary-foreground" strokeWidth={2.5} />
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-400 animate-pulse" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              Know your numbers.
              <br />
              <span className="text-primary">Grow your profit.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Answer 7 quick questions about your business and get instant AI-powered insights — break-even point, profit forecasts, and tailored recommendations. No spreadsheets needed to start.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Zap className="h-3.5 w-3.5" /> Instant Insights
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <BarChart3 className="h-3.5 w-3.5" /> Break-Even Chart
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <MessageSquare className="h-3.5 w-3.5" /> AI Coach
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button size="lg" onClick={onStart} className="w-full sm:w-auto group shadow-md hover:shadow-lg transition-all">
              Let's Get Started
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button size="lg" variant="ghost" onClick={onBack} className="w-full sm:w-auto">
              Back to Tools
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground pt-2">
            Takes about 2 minutes · Your answers stay private
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
