import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle, ArrowLeft, Database, Sparkles, Info, MessageSquare,
  TrendingUp, TrendingDown, RotateCcw, ArrowRight, Target, Trophy,
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, Legend, Line, ComposedChart,
} from "recharts";
import { computeCVP, unitsForTargetProfit } from "@/lib/cvpMath";

interface CVPResults {
  totalRevenue: number;
  totalVariableCosts: number;
  totalFixedCosts: number;
  contributionMargin: number;
  contributionMarginRatio: number;
  contributionMarginPerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  currentVolume: number;
  operatingIncome: number;
  degreeOfOperatingLeverage: number;
  marginOfSafety: number;
  marginOfSafetyPercent: number;
}

interface Prescription {
  title: string;
  action: string;
  reason: string;
  expectedOutcome: string;
  priority: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
}

interface ProfitProInsightsProps {
  cvpResults: CVPResults;
  aiInsights: {
    summary?: string;
    prescriptions?: Prescription[];
    keyFindings?: string[];
  } | null;
  targetProfit?: number;
  period?: string;
  productName?: string;
  onConnectData: () => void;
  onChat: () => void;
  onBack: () => void;
  onNewAnalysis: () => void;
}

function fmt(n: number): string {
  if (!isFinite(n)) return "₦0";
  if (Math.abs(n) >= 1e6) return `₦${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `₦${(n / 1e3).toFixed(1)}K`;
  return `₦${n.toFixed(0)}`;
}

function fmtUnits(n: number): string {
  if (!isFinite(n)) return "0";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function buildChartData(price: number, vcPerUnit: number, fc: number, currentVol: number, beUnits: number) {
  const maxVol = Math.max(currentVol, beUnits, 1) * 1.5;
  const steps = 20;
  const stepSize = maxVol / steps;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const vol = Math.round(i * stepSize);
    return {
      volume: vol,
      Revenue: Math.round(vol * price),
      "Total Cost": Math.round(fc + vol * vcPerUnit),
      "Fixed Cost": Math.round(fc),
    };
  });
}

const priorityColor: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

// Plain-language metric card
const PlainCard = ({
  big, label, tooltip, tone = "neutral",
}: {
  big: string;
  label: string;
  tooltip?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) => {
  const toneClasses = {
    good: "border-emerald-500/30 bg-emerald-500/5",
    warn: "border-amber-500/30 bg-amber-500/5",
    bad: "border-red-500/30 bg-red-500/5",
    neutral: "border-border",
  }[tone];

  const numberTone = {
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
    neutral: "text-foreground",
  }[tone];

  return (
    <Card className={toneClasses}>
      <CardContent className="p-4 space-y-1.5">
        <p className={`text-2xl font-bold ${numberTone}`}>{big}</p>
        <div className="flex items-start gap-1">
          <p className="text-xs text-muted-foreground leading-snug flex-1">{label}</p>
          {tooltip && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ProfitProInsights = ({
  cvpResults: r, aiInsights, targetProfit = 0, period = "period", productName,
  onConnectData, onChat, onBack, onNewAnalysis,
}: ProfitProInsightsProps) => {
  // Baseline numbers
  const basePrice = r.totalRevenue / (r.currentVolume || 1);
  const baseVcPerUnit = r.totalVariableCosts / (r.currentVolume || 1);
  const baseFc = r.totalFixedCosts;
  const baseVol = r.currentVolume;

  const chartData = useMemo(
    () => buildChartData(basePrice, baseVcPerUnit, baseFc, baseVol, r.breakEvenUnits),
    [basePrice, baseVcPerUnit, baseFc, baseVol, r.breakEvenUnits],
  );

  // What-If state
  const [scPrice, setScPrice] = useState(basePrice);
  const [scVc, setScVc] = useState(baseVcPerUnit);
  const [scFc, setScFc] = useState(baseFc);
  const [scVol, setScVol] = useState(baseVol);

  const scenario = useMemo(() => computeCVP({
    pricePerUnit: scPrice,
    variableCostPerUnit: scVc,
    fixedCosts: scFc,
    volume: scVol,
  }), [scPrice, scVc, scFc, scVol]);

  const scenarioChart = useMemo(
    () => buildChartData(scPrice, scVc, scFc, scVol, scenario.breakEvenUnits),
    [scPrice, scVc, scFc, scVol, scenario.breakEvenUnits],
  );

  const resetScenario = () => {
    setScPrice(basePrice); setScVc(baseVcPerUnit); setScFc(baseFc); setScVol(baseVol);
  };

  const profitDelta = scenario.operatingIncome - r.operatingIncome;
  const beDelta = scenario.breakEvenUnits - r.breakEvenUnits;

  const isLoss = r.operatingIncome < 0;

  // Target-profit volume — baseline & scenario
  const baseTargetUnits = unitsForTargetProfit({
    pricePerUnit: basePrice, variableCostPerUnit: baseVcPerUnit,
    fixedCosts: baseFc, targetProfit,
  });
  const scenarioTargetUnits = unitsForTargetProfit({
    pricePerUnit: scPrice, variableCostPerUnit: scVc,
    fixedCosts: scFc, targetProfit,
  });
  const targetUnitsDelta = scenarioTargetUnits - baseTargetUnits;

  const matchMyGoal = () => {
    if (isFinite(scenarioTargetUnits)) setScVol(scenarioTargetUnits);
  };

  // Verdict for What-If
  const goalGap = scenario.operatingIncome - targetProfit;
  let verdictTone: "good" | "warn" | "bad" = "warn";
  let verdictMsg = "";
  if (scenario.operatingIncome < 0) {
    verdictTone = "bad";
    verdictMsg = `You'd still lose ${fmt(Math.abs(scenario.operatingIncome))}. Try raising price or volume.`;
  } else if (targetProfit > 0 && goalGap >= 0) {
    verdictTone = "good";
    verdictMsg = `You'd profit ${fmt(scenario.operatingIncome)} — that's ${fmt(goalGap)} above your goal of ${fmt(targetProfit)}.`;
  } else if (targetProfit > 0) {
    verdictTone = "warn";
    verdictMsg = `You'd cover costs but fall ${fmt(Math.abs(goalGap))} short of your ${fmt(targetProfit)} goal.`;
  } else {
    verdictTone = "good";
    verdictMsg = `You'd profit ${fmt(scenario.operatingIncome)} per ${period}.`;
  }
  const verdictClasses = {
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    bad: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  }[verdictTone];

  // Plain-language interpretations
  const cmRupiah = Math.round(r.contributionMarginRatio * 100);
  type Tone = "good" | "warn" | "bad" | "neutral";
  const cmCard = {
    big: `₦${cmRupiah}`,
    label: `Out of every ₦100 you earn, ${cmRupiah > 0 ? `₦${cmRupiah} is yours after the cost of making each unit` : "you lose money on every sale"}`,
    tooltip: `Contribution Margin Ratio: ${(r.contributionMarginRatio * 100).toFixed(1)}%`,
    tone: (cmRupiah > 40 ? "good" : cmRupiah > 20 ? "warn" : "bad") as Tone,
  };

  const beUnitsCard = {
    big: fmtUnits(r.breakEvenUnits),
    label: `Sell this many to cover all your costs (you're at ${fmtUnits(r.currentVolume)})`,
    tooltip: "Break-Even Point in Units",
    tone: (r.currentVolume >= r.breakEvenUnits ? "good" : "warn") as Tone,
  };

  const beRevenueCard = {
    big: fmt(r.breakEvenRevenue),
    label: "Earn this much per period to break even",
    tooltip: "Break-Even Revenue",
    tone: (r.totalRevenue >= r.breakEvenRevenue ? "good" : "warn") as Tone,
  };

  const profitCard = {
    big: fmt(r.operatingIncome),
    label: isLoss ? "You're currently losing this much" : "Your profit right now",
    tooltip: "Operating Income (Revenue − All Costs)",
    tone: (isLoss ? "bad" : "good") as Tone,
  };

  const mosCard = {
    big: `${(r.marginOfSafetyPercent * 100).toFixed(0)}%`,
    label: r.marginOfSafetyPercent > 0
      ? `Sales can drop this much before you stop making profit`
      : "You're below break-even — every sale matters",
    tooltip: "Margin of Safety",
    tone: (r.marginOfSafetyPercent > 0.2 ? "good" : r.marginOfSafetyPercent > 0 ? "warn" : "bad") as Tone,
  };

  const prescriptions = Array.isArray(aiInsights?.prescriptions) ? aiInsights.prescriptions : [];
  const keyFindings = Array.isArray(aiInsights?.keyFindings) ? aiInsights.keyFindings : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Your Profit Path</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {productName ? <>For <span className="font-medium text-foreground">{productName}</span></> : "What it takes to be profitable"}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onNewAnalysis}>Start Over</Button>
      </div>

      {/* Path to Profit hero — minimum profitable volume + target volume */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md overflow-hidden">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Minimum to be profitable</span>
            </div>
            <p className="text-3xl font-bold">
              {isFinite(r.breakEvenUnits) && r.breakEvenUnits > 0 ? fmtUnits(r.breakEvenUnits) : "—"}
              <span className="text-base font-medium text-muted-foreground ml-1">units / {period}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {isFinite(r.breakEvenUnits) && r.breakEvenUnits > 0 ? (
                <>Sell at least this many at {fmt(basePrice)} each — about {fmt(r.breakEvenRevenue)} in revenue.</>
              ) : (
                <>Your price is below the cost to make one unit. Raise your price to make profit possible.</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-md overflow-hidden">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Trophy className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">To hit your goal</span>
            </div>
            <p className="text-3xl font-bold">
              {isFinite(baseTargetUnits) ? fmtUnits(baseTargetUnits) : "—"}
              <span className="text-base font-medium text-muted-foreground ml-1">units / {period}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {targetProfit > 0 ? (
                isFinite(baseTargetUnits)
                  ? <>Sell this many to make {fmt(targetProfit)} profit per {period}.</>
                  : <>Not possible at current price — raise your price or cut costs.</>
              ) : (
                <>Set a profit goal in the dialogue to see this.</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loss Warning */}
      {isLoss && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-600 dark:text-red-400">You're below break-even</p>
              <p className="text-sm text-muted-foreground">
                At your current numbers you're losing money. Use the What If? tab to test prices and volumes that would turn this around.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plain-language metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <PlainCard {...cmCard} />
        <PlainCard {...profitCard} />
        <PlainCard {...mosCard} />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
          Show advanced metrics
        </summary>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PlainCard {...beRevenueCard} />
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-1.5">
              <p className="text-2xl font-bold text-muted-foreground">{r.degreeOfOperatingLeverage.toFixed(2)}x</p>
              <p className="text-xs text-muted-foreground leading-snug">
                <span className="font-medium">Operating Leverage:</span> How sensitive your profit is to sales changes.
                {r.degreeOfOperatingLeverage > 0 && ` A 10% sales rise lifts profit by ~${(r.degreeOfOperatingLeverage * 10).toFixed(0)}%.`}
              </p>
            </CardContent>
          </Card>
        </div>
      </details>

      <Tabs defaultValue="chart">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="chart">Break-Even</TabsTrigger>
          <TabsTrigger value="whatif">What If?</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="prescriptions">Actions ({prescriptions.length})</TabsTrigger>
        </TabsList>

        {/* Chart */}
        <TabsContent value="chart">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Where you break even</CardTitle>
              <p className="text-xs text-muted-foreground">Where the blue line crosses the red line is when revenue equals costs.</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="volume" tickFormatter={fmtUnits} label={{ value: "Units sold", position: "insideBottom", offset: -5 }} />
                  <YAxis tickFormatter={(v: number) => fmt(v)} />
                  <RTooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Total Cost" stroke="hsl(0, 70%, 50%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Fixed Cost" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  <ReferenceLine x={r.breakEvenUnits} stroke="hsl(45, 90%, 50%)" strokeDasharray="3 3" label={{ value: "Break-Even", position: "top" }} />
                  <ReferenceLine x={r.currentVolume} stroke="hsl(var(--primary))" strokeWidth={2} label={{ value: "You", position: "top" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* What If */}
        <TabsContent value="whatif">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Play with the numbers</CardTitle>
                  <p className="text-xs text-muted-foreground">Test changes to price, costs, or volume — see how they affect your path to profit.</p>
                </div>
                <div className="flex items-center gap-2">
                  {targetProfit > 0 && isFinite(scenarioTargetUnits) && (
                    <Button variant="default" size="sm" onClick={matchMyGoal}>
                      <Target className="h-3 w-3 mr-1" /> Match my goal
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={resetScenario}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Verdict banner */}
              <div className={`rounded-md border p-3 text-sm font-medium ${verdictClasses}`}>
                {verdictMsg}
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SliderRow
                  label="Selling price per unit"
                  value={scPrice} onChange={setScPrice}
                  min={Math.max(0, basePrice * 0.5)} max={basePrice * 1.5} step={Math.max(1, basePrice * 0.01)}
                  format={fmt} baseline={basePrice}
                />
                <SliderRow
                  label="Variable cost per unit"
                  value={scVc} onChange={setScVc}
                  min={Math.max(0, baseVcPerUnit * 0.5)} max={baseVcPerUnit * 1.5} step={Math.max(1, baseVcPerUnit * 0.01)}
                  format={fmt} baseline={baseVcPerUnit} invert
                />
                <SliderRow
                  label="Fixed costs (total)"
                  value={scFc} onChange={setScFc}
                  min={Math.max(0, baseFc * 0.5)} max={baseFc * 1.5} step={Math.max(1, baseFc * 0.01)}
                  format={fmt} baseline={baseFc} invert
                />
                <SliderRow
                  label="Sales volume (units)"
                  value={scVol} onChange={setScVol}
                  min={0} max={Math.max(baseVol * 2, 10)} step={Math.max(1, baseVol * 0.01)}
                  format={fmtUnits} baseline={baseVol}
                />
              </div>

              {/* Live deltas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DeltaCard
                  label="Profit vs your goal"
                  value={targetProfit > 0 ? fmt(scenario.operatingIncome - targetProfit) : fmt(scenario.operatingIncome)}
                  delta={profitDelta}
                  fmtDelta={fmt}
                  better={profitDelta >= 0}
                />
                <DeltaCard
                  label="Units to break even"
                  value={isFinite(scenario.breakEvenUnits) ? fmtUnits(scenario.breakEvenUnits) : "—"}
                  delta={beDelta}
                  fmtDelta={(v) => `${v >= 0 ? "+" : ""}${fmtUnits(v)}`}
                  better={beDelta <= 0}
                />
                <DeltaCard
                  label="Units to hit goal"
                  value={isFinite(scenarioTargetUnits) ? fmtUnits(scenarioTargetUnits) : "—"}
                  delta={targetUnitsDelta}
                  fmtDelta={(v) => `${v >= 0 ? "+" : ""}${fmtUnits(v)}`}
                  better={targetUnitsDelta <= 0}
                />
              </div>

              {/* Scenario chart */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Scenario chart</p>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={scenarioChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="volume" tickFormatter={fmtUnits} />
                    <YAxis tickFormatter={(v: number) => fmt(v)} />
                    <RTooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Total Cost" stroke="hsl(0, 70%, 50%)" strokeWidth={2} dot={false} />
                    <ReferenceLine x={scenario.breakEvenUnits} stroke="hsl(45, 90%, 50%)" strokeDasharray="3 3" label={{ value: "BE", position: "top" }} />
                    <ReferenceLine x={scVol} stroke="hsl(var(--primary))" strokeWidth={2} label={{ value: "You", position: "top" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button variant="outline" size="sm" disabled>Save this scenario</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights">
          <Card>
            <CardContent className="p-6 space-y-4">
              {aiInsights?.summary && (
                <div>
                  <h3 className="font-semibold mb-2">In short</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiInsights.summary}</p>
                </div>
              )}
              {keyFindings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">What we found</h3>
                  <ul className="space-y-2">
                    {keyFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescriptions">
          <div className="space-y-4">
            {prescriptions.length === 0 && (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No actions generated.</CardContent></Card>
            )}
            {prescriptions.map((p, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-semibold">{p.title}</h4>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={priorityColor[p.priority] || ""}>{p.priority} priority</Badge>
                      <Badge variant="secondary">{p.effort} effort</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-md bg-muted/30 border border-border/50">
                      <p className="font-medium text-xs text-muted-foreground mb-1">What to do</p>
                      <p>{p.action}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/30 border border-border/50">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Why it matters</p>
                      <p>{p.reason}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/30 border border-border/50">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Expected outcome</p>
                      <p>{p.expectedOutcome}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Chat with Coach CTA */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="font-semibold">Chat with your AI Profit Coach</h4>
            <p className="text-sm text-muted-foreground">
              Ask anything about your numbers — pricing, costs, growth strategy. Your coach knows your business.
            </p>
          </div>
          <Button onClick={onChat} className="shadow-md">
            Start Chat <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Connect data CTA */}
      <Card className="border-border/60">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="font-semibold">Want even sharper insights?</h4>
            <p className="text-sm text-muted-foreground">
              Connect a spreadsheet or live data source for analysis based on your real transactions.
            </p>
          </div>
          <Button variant="outline" onClick={onConnectData}>
            <Database className="h-4 w-4 mr-1" />
            Connect Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper sub-components

function SliderRow({
  label, value, onChange, min, max, step, format, baseline, invert,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; format: (n: number) => string;
  baseline: number; invert?: boolean;
}) {
  const pctChange = baseline > 0 ? ((value - baseline) / baseline) * 100 : 0;
  const isBetter = invert ? pctChange < 0 : pctChange > 0;
  const showColor = Math.abs(pctChange) > 0.5;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={`font-semibold ${showColor ? (isBetter ? "text-emerald-600" : "text-red-600") : "text-muted-foreground"}`}>
          {format(value)}
          {showColor && (
            <span className="ml-1 text-[10px]">
              ({pctChange >= 0 ? "+" : ""}{pctChange.toFixed(0)}%)
            </span>
          )}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function DeltaCard({
  label, value, delta, fmtDelta, better,
}: {
  label: string; value: string; delta: number; fmtDelta: (n: number) => string; better: boolean;
}) {
  const showDelta = Math.abs(delta) > 0.01;
  return (
    <Card>
      <CardContent className="p-3 text-center space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {showDelta && (
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            better ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}>
            {better ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmtDelta(delta)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
