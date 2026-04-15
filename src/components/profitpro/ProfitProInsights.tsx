import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, TrendingUp, Target, Activity, ArrowLeft,
  Database, Sparkles,
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Line, ComposedChart,
} from "recharts";

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
  onConnectData: () => void;
  onBack: () => void;
  onNewAnalysis: () => void;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return `₦${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `₦${(n / 1e3).toFixed(1)}K`;
  return `₦${n.toFixed(2)}`;
}

function fmtUnits(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function buildChartData(r: CVPResults) {
  const maxVol = Math.max(r.currentVolume, r.breakEvenUnits) * 1.5;
  const steps = 20;
  const stepSize = maxVol / steps;
  const pricePerUnit = r.totalRevenue / (r.currentVolume || 1);
  const vcPerUnit = r.totalVariableCosts / (r.currentVolume || 1);

  return Array.from({ length: steps + 1 }, (_, i) => {
    const vol = Math.round(i * stepSize);
    const rev = vol * pricePerUnit;
    const tc = r.totalFixedCosts + vol * vcPerUnit;
    return { volume: vol, Revenue: Math.round(rev), "Total Cost": Math.round(tc), "Fixed Cost": Math.round(r.totalFixedCosts) };
  });
}

const priorityColor: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export const ProfitProInsights = ({ cvpResults: r, aiInsights, onConnectData, onBack, onNewAnalysis }: ProfitProInsightsProps) => {
  const chartData = buildChartData(r);
  const dolWarning = r.degreeOfOperatingLeverage < 0;
  const isLoss = r.operatingIncome < 0;

  const metrics = [
    { label: "Contribution Margin", value: pct(r.contributionMarginRatio), icon: TrendingUp, color: "text-emerald-600" },
    { label: "Break-Even (Units)", value: fmtUnits(r.breakEvenUnits), icon: Target, color: "text-primary" },
    { label: "Break-Even (Revenue)", value: fmt(r.breakEvenRevenue), icon: Target, color: "text-primary" },
    { label: "Operating Income", value: fmt(r.operatingIncome), icon: Activity, color: isLoss ? "text-red-600" : "text-emerald-600" },
    { label: "Margin of Safety", value: pct(r.marginOfSafetyPercent), icon: Target, color: r.marginOfSafetyPercent > 0.2 ? "text-emerald-600" : "text-amber-600" },
    { label: "Operating Leverage", value: r.degreeOfOperatingLeverage.toFixed(2), icon: Activity, color: dolWarning ? "text-red-600" : "text-primary" },
  ];

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
              <h2 className="text-xl font-bold">ProfitPro Insights</h2>
              <Badge variant="secondary" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> AI-Generated</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Based on your business inputs</p>
          </div>
        </div>
        <Button variant="outline" onClick={onNewAnalysis}>New Analysis</Button>
      </div>

      {/* DOL Warning */}
      {dolWarning && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-600 dark:text-red-400">Below Break-Even</p>
              <p className="text-sm text-muted-foreground">
                Your current metrics indicate you're operating at a loss. Review the prescriptions below to reach profitability.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardContent className="p-3 text-center">
                <Icon className={`h-5 w-5 mx-auto mb-1 ${m.color}`} />
                <p className="text-lg font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{m.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Break-Even Chart</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cost-Volume-Profit Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="volume" tickFormatter={fmtUnits} label={{ value: "Volume (units)", position: "insideBottom", offset: -5 }} />
                  <YAxis tickFormatter={(v: number) => fmt(v)} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Total Cost" stroke="hsl(0, 70%, 50%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Fixed Cost" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  <ReferenceLine x={r.breakEvenUnits} stroke="hsl(45, 90%, 50%)" strokeDasharray="3 3" label={{ value: "BEP", position: "top" }} />
                  <ReferenceLine x={r.currentVolume} stroke="hsl(var(--primary))" strokeWidth={2} label={{ value: "Current", position: "top" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardContent className="p-6 space-y-4">
              {aiInsights?.summary && (
                <div>
                  <h3 className="font-semibold mb-2">Executive Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiInsights.summary}</p>
                </div>
              )}
              {keyFindings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Key Findings</h3>
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

        <TabsContent value="prescriptions">
          <div className="space-y-4">
            {prescriptions.length === 0 && (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No prescriptions generated.</CardContent></Card>
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

      {/* CTA: Connect Data */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="font-semibold">Want deeper, data-driven insights?</h4>
            <p className="text-sm text-muted-foreground">
              Connect your spreadsheet or live data source for more accurate analysis based on real transaction data.
            </p>
          </div>
          <Button onClick={onConnectData}>
            <Database className="h-4 w-4 mr-1" />
            Connect Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
