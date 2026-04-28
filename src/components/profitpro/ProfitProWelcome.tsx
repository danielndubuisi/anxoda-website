import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight } from "lucide-react";

interface ProfitProWelcomeProps {
  onStart: () => void;
  onBack: () => void;
}

export const ProfitProWelcome = ({ onStart, onBack }: ProfitProWelcomeProps) => {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="overflow-hidden border-primary/20 shadow-lg bg-gradient-to-br from-background via-background to-primary/5">
        <CardContent className="p-8 sm:p-10 space-y-6 animate-fade-in">
          {/* Friendly icon */}
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

          {/* Conversational message bubble */}
          <div className="space-y-3">
            <p className="text-base sm:text-lg font-medium leading-relaxed">
              Want to boost your profits and know exactly what it takes?
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Tell me a little about your business and I'll show you the smallest number of sales you need to start making real profit — plus how to get there faster.
            </p>
          </div>

          {/* CTAs */}
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
};
