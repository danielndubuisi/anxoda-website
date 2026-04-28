import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Factory, Package, Boxes, Building2, Tag, BarChart3,
  ArrowRight, ArrowLeft, Sparkles, Loader2, Lightbulb,
} from "lucide-react";
import { FormattedNairaInput, FormattedNumberInput } from "./FormattedNairaInput";

export type DialoguePeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface DialogueAnswers {
  targetProfit: number;
  period: DialoguePeriod;
  industry: string;
  productName: string;
  variableCosts: { material: number; labour: number; other: number };
  fixedCosts: { rent: number; depreciation: number; admin: number; other: number };
  unitPrice: number;
  volume: number;
  expectedRevenue: number; // = unitPrice * volume (auto)
  marketPriceRange?: { low: number; high: number };
}

interface CostSuggestion {
  suggestedUnitPrice: number;
  marketPriceRange: { low: number; high: number };
  variableCosts: { material: number; labour: number; other: number };
  fixedCostsHints: { rent: number; admin: number };
  rationale: string;
}

interface ProfitProDialogueProps {
  onComplete: (answers: DialogueAnswers) => void;
  onBack: () => void;
}

const INDUSTRIES = [
  "Agriculture & Farming", "Manufacturing", "Retail & E-commerce", "Food & Beverages",
  "Technology & Software", "Healthcare & Pharmaceuticals", "Construction & Real Estate",
  "Transportation & Logistics", "Fashion & Textiles", "Education & Training",
  "Financial Services", "Oil & Gas / Energy", "Hospitality & Tourism",
  "Media & Entertainment", "Telecommunications", "Mining & Extractives",
  "Beauty & Personal Care", "Professional Services", "Automotive", "Other",
];

const STEPS = [
  { icon: Target, title: "Your Profit Goal", description: "Let's start with what you want to earn" },
  { icon: Factory, title: "Your Industry", description: "Helps us tailor advice to your business" },
  { icon: Package, title: "Your Product or Service", description: "Just one item — we'll research the rest" },
  { icon: Boxes, title: "Cost to Make ONE Unit", description: "We've pre-filled typical numbers — adjust as you like" },
  { icon: Building2, title: "Fixed Bills", description: "What you pay no matter what you sell" },
  { icon: Tag, title: "Your Selling Price", description: "How much one customer pays for one unit" },
  { icon: BarChart3, title: "Sales Volume", description: "How many units you'll sell" },
];

const PERIOD_LABELS: Record<DialoguePeriod, string> = {
  daily: "day", weekly: "week", monthly: "month", yearly: "year",
};

const fmtNGN = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export const ProfitProDialogue = ({ onComplete, onBack }: ProfitProDialogueProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: profit goal first, then period
  const [targetProfit, setTargetProfit] = useState("");
  const [period, setPeriod] = useState<DialoguePeriod>("monthly");

  // Step 2
  const [industry, setIndustry] = useState("");

  // Step 3 — product + AI suggestion
  const [productName, setProductName] = useState("");
  const [suggestion, setSuggestion] = useState<CostSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  // Step 4: variable costs (per unit) — prefilled from suggestion
  const [materialCost, setMaterialCost] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [otherVC, setOtherVC] = useState("");

  // Step 5: fixed costs — rent/admin prefilled
  const [rent, setRent] = useState("");
  const [depreciation, setDepreciation] = useState("");
  const [adminCost, setAdminCost] = useState("");
  const [otherFC, setOtherFC] = useState("");

  // Step 6: unit price — prefilled
  const [unitPrice, setUnitPrice] = useState("");

  // Step 7: volume
  const [volume, setVolume] = useState("");

  const periodWord = PERIOD_LABELS[period];

  const fetchSuggestion = async () => {
    if (!productName.trim() || !industry) return;
    setSuggestionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-product-costs", {
        body: { industry, productName: productName.trim(), period },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const s: CostSuggestion = data.suggestion;
      setSuggestion(s);
      // Pre-fill downstream fields (only if user hasn't typed already)
      if (!materialCost) setMaterialCost(String(Math.round(s.variableCosts.material || 0)));
      if (!labourCost) setLabourCost(String(Math.round(s.variableCosts.labour || 0)));
      if (!otherVC) setOtherVC(String(Math.round(s.variableCosts.other || 0)));
      if (!rent) setRent(String(Math.round(s.fixedCostsHints.rent || 0)));
      if (!adminCost) setAdminCost(String(Math.round(s.fixedCostsHints.admin || 0)));
      if (!unitPrice) setUnitPrice(String(Math.round(s.suggestedUnitPrice || 0)));
      // Auto-advance to the smart-costs review step
      setCurrentStep(3);
    } catch (err: any) {
      toast({
        title: "Couldn't fetch suggestions",
        description: "No worries — you can fill the numbers in yourself on the next steps.",
        variant: "destructive",
      });
      // Still let the user proceed
      setCurrentStep(3);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!targetProfit && parseFloat(targetProfit) > 0;
      case 1: return !!industry;
      case 2: return productName.trim().length > 1;
      case 3: return !!materialCost || !!labourCost || !!otherVC;
      case 4: return !!rent || !!depreciation || !!adminCost || !!otherFC;
      case 5: return !!unitPrice && parseFloat(unitPrice) > 0;
      case 6: return !!volume && parseFloat(volume) > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      // Trigger AI suggestion before moving on
      fetchSuggestion();
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      const up = parseFloat(unitPrice) || 0;
      const vol = parseFloat(volume) || 0;
      onComplete({
        targetProfit: parseFloat(targetProfit) || 0,
        period,
        industry,
        productName: productName.trim(),
        variableCosts: {
          material: parseFloat(materialCost) || 0,
          labour: parseFloat(labourCost) || 0,
          other: parseFloat(otherVC) || 0,
        },
        fixedCosts: {
          rent: parseFloat(rent) || 0,
          depreciation: parseFloat(depreciation) || 0,
          admin: parseFloat(adminCost) || 0,
          other: parseFloat(otherFC) || 0,
        },
        unitPrice: up,
        volume: vol,
        expectedRevenue: up * vol,
        marketPriceRange: suggestion?.marketPriceRange,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
    else onBack();
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetProfit">How much profit do you want to make?</Label>
              <FormattedNairaInput id="targetProfit" value={targetProfit} onChange={setTargetProfit} placeholder="e.g. 500,000" />
              <p className="text-xs text-muted-foreground">The money you want left in your pocket after paying everything.</p>
            </div>
            <div className="space-y-2">
              <Label>Over what period?</Label>
              <Select value={period} onValueChange={(v: DialoguePeriod) => setPeriod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {targetProfit && parseFloat(targetProfit) > 0 && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 animate-fade-in">
                <p className="text-sm">
                  Got it — you want to make <span className="font-semibold text-primary">{fmtNGN(parseFloat(targetProfit))}</span> every <span className="font-semibold">{periodWord}</span>. Let's see what it takes.
                </p>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-2">
            <Label>What industry are you in?</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(ind => (<SelectItem key={ind} value={ind}>{ind}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <Label htmlFor="product">What's the one product or service you want to sell?</Label>
            <Input
              id="product"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="e.g. Bottled groundnut oil 1L · Haircut · T-shirt"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Be specific so we can pull realistic prices and costs for you.</p>
            {suggestionLoading && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Researching typical prices and costs for "{productName}"…
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {suggestion && (
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2">
                <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  <span className="font-semibold">Smart Estimates pre-filled.</span> {suggestion.rationale} Adjust to match your reality.
                </div>
              </div>
            )}
            {!suggestion && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                Enter the cost to produce ONE unit (just one item, not the total). Fill at least one.
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="material">Material cost per ONE unit</Label>
                <FormattedNairaInput id="material" value={materialCost} onChange={setMaterialCost} placeholder="Raw materials for one item" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="labour">Labour cost per ONE unit</Label>
                <FormattedNairaInput id="labour" value={labourCost} onChange={setLabourCost} placeholder="Wages/work for one item" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="othervc">Other cost per ONE unit</Label>
                <FormattedNairaInput id="othervc" value={otherVC} onChange={setOtherVC} placeholder="Packaging, delivery per item" />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              These are bills you pay every {periodWord} <span className="font-medium">whether you sell anything or not</span>. We've pre-filled typical estimates — adjust as needed.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rent">Rent (per {periodWord})</Label>
                <FormattedNairaInput id="rent" value={rent} onChange={setRent} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depreciation">Equipment depreciation (per {periodWord})</Label>
                <FormattedNairaInput id="depreciation" value={depreciation} onChange={setDepreciation} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin">Admin — salaries, utilities, software (per {periodWord})</Label>
                <FormattedNairaInput id="admin" value={adminCost} onChange={setAdminCost} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otherfc">Other fixed costs (per {periodWord})</Label>
                <FormattedNairaInput id="otherfc" value={otherFC} onChange={setOtherFC} />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-3">
            <Label htmlFor="unitPrice">How much do you charge a customer for ONE unit?</Label>
            <FormattedNairaInput id="unitPrice" value={unitPrice} onChange={setUnitPrice} placeholder="e.g. 2,500" />
            {suggestion?.marketPriceRange && (
              <div className="rounded-md bg-muted/40 border border-border/60 p-3 text-xs">
                <p className="text-muted-foreground">
                  Most sellers charge <span className="font-semibold text-foreground">{fmtNGN(suggestion.marketPriceRange.low)} – {fmtNGN(suggestion.marketPriceRange.high)}</span>.{" "}
                  Suggested: <span className="font-semibold text-primary">{fmtNGN(suggestion.suggestedUnitPrice)}</span>.
                  {unitPrice !== String(Math.round(suggestion.suggestedUnitPrice)) && (
                    <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs"
                      onClick={() => setUnitPrice(String(Math.round(suggestion.suggestedUnitPrice)))}>
                      Use suggested
                    </Button>
                  )}
                </p>
              </div>
            )}
          </div>
        );
      case 6: {
        const up = parseFloat(unitPrice) || 0;
        const vol = parseFloat(volume) || 0;
        const autoRev = up * vol;
        return (
          <div className="space-y-3">
            <Label htmlFor="volume">How many units will you sell per {periodWord}?</Label>
            <FormattedNumberInput id="volume" value={volume} onChange={setVolume} placeholder="e.g. 1,000" />
            <p className="text-xs text-muted-foreground">Your realistic sales target for one {periodWord}.</p>
            {autoRev > 0 && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm animate-fade-in">
                That's about <span className="font-semibold text-primary">{fmtNGN(autoRev)}</span> in revenue per {periodWord}{" "}
                <span className="text-muted-foreground text-xs">(price × volume)</span>.
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div key={currentStep} className="animate-fade-in space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {renderStepContent()}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack} disabled={suggestionLoading}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {currentStep === 0 ? "Back" : "Previous"}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed() || suggestionLoading}>
          {suggestionLoading ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Researching…</>
          ) : isLast ? (
            <><Sparkles className="h-4 w-4 mr-1" /> See My Profit Path</>
          ) : (
            <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
};