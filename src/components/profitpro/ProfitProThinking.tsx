import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Brain } from "lucide-react";

const MESSAGES = [
  "Analyzing your cost structure…",
  "Calculating break-even point…",
  "Evaluating contribution margins…",
  "Generating profitability insights…",
  "Preparing prescriptions…",
];

export const ProfitProThinking = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md mx-auto py-16">
      <Card className="border-primary/20 shadow-xl overflow-hidden">
        <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
          {/* Animated icon */}
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Brain className="h-10 w-10 text-primary" />
            </div>
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2.5 w-2.5 rounded-full bg-primary/60" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 h-2 w-2 rounded-full bg-accent/40" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold">ProfitPro is thinking…</h3>
            <p
              key={msgIndex}
              className="text-sm text-muted-foreground animate-fade-in"
            >
              {MESSAGES[msgIndex]}
            </p>
          </div>

          {/* Progress bar-style dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-1.5 w-6 rounded-full transition-colors duration-500"
                style={{
                  backgroundColor: i <= msgIndex
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted))",
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
