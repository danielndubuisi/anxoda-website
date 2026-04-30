import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, LineChart, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const processSteps = [
  {
    icon: MessageSquare,
    title: "Tell us about your business",
    description:
      "Answer a few quick questions about your costs, prices, and profit goal. No spreadsheets needed to start.",
    details: [
      "Industry & product",
      "Costs & prices",
      "Your target profit",
    ],
  },
  {
    icon: LineChart,
    title: "See your profit picture",
    description:
      "Get an instant break-even chart, the exact volume needed to hit your target profit, and AI-powered recommendations.",
    details: [
      "Break-even chart",
      "Target profit volume",
      "Plain-English insights",
    ],
  },
  {
    icon: Sparkles,
    title: "Refine and decide",
    description:
      "Use the what-if sandbox to test price and cost changes, or chat with your AI profit coach to plan your next move.",
    details: [
      "What-if sandbox",
      "AI profit coach",
      "Shareable PDF reports",
    ],
  },
];

const Process = () => {
  const { user } = useAuth();
  const profitProHref = user
    ? "/dashboard?tool=cvp-analyzer"
    : "/auth?redirect=cvp-analyzer";

  return (
    <section
      id="process"
      className="py-12 sm:py-16 lg:py-20 bg-background"
      aria-label="How Anxoda works in three steps">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium mb-4">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            From confusion to
            <span className="text-primary"> clarity in 3 steps</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            No accounting background required. Anxoda guides you from your
            first question to a clear, profitable next step.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12 sm:mb-16">
          {processSteps.map((step, i) => (
            <Card
              key={step.title}
              className="group hover:shadow-elegant transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${i * 120}ms` }}>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <step.icon className="w-5 h-5" />
                  </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-base text-muted-foreground">
                  {step.description}
                </p>
                <ul className="space-y-2">
                  {step.details.map((d) => (
                    <li
                      key={d}
                      className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center animate-fade-in">
          <div className="bg-gradient-subtle rounded-xl sm:rounded-2xl p-8 sm:p-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              See your profit picture today
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              Free to start. No credit card required.
            </p>
            <Link to={profitProHref}>
              <Button variant="hero" size="lg" className="group w-full sm:w-auto">
                Start ProfitPro Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
