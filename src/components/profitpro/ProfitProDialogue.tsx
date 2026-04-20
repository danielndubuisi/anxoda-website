import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Target, Factory, Boxes, Building2, Tag, BarChart3, TrendingUp,
  ArrowRight, ArrowLeft, Sparkles,
} from "lucide-react";

export type DialoguePeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface DialogueAnswers {
  targetProfit: number;
  period: DialoguePeriod;
  industry: string;
  variableCosts: { material: number; labour: number; other: number };
  fixedCosts: { rent: number; depreciation: number; admin: number; other: number };
  unitPrice: number;
  volume: number;
  expectedRevenue: number;
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
  { icon: Factory, title: "Your Industry", description: "Helps us tailor advice to your business type" },
  { icon: Boxes, title: "Cost to Make ONE Unit", description: "Just one item — not your total" },
  { icon: Building2, title: "Fixed Bills", description: "What you pay no matter what you sell" },
  { icon: Tag, title: "Your Selling Price", description: "How much one customer pays for one unit" },
  { icon: BarChart3, title: "Sales Volume", description: "How many units you'll sell" },
  { icon: TrendingUp, title: "Expected Revenue", description: "Total money you expect to earn" },
];

const PERIOD_LABELS: Record<DialoguePeriod, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

const NairaInput = ({
  value, onChange, placeholder, id,
}: { value: string; onChange: (v: string) => void; placeholder?: string; id?: string }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₦</span>
    <Input
      id={id}
      type="number"
      min={0}
      className="pl-8"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "0"}
    />
  </div>
);

export const ProfitProDialogue = ({ onComplete, onBack }: ProfitProDialogueProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [targetProfit, setTargetProfit] = useState("");
  const [period, setPeriod] = useState<DialoguePeriod>("monthly");
  const [industry, setIndustry] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [otherVC, setOtherVC] = useState("");
  const [rent, setRent] = useState("");
  const [depreciation, setDepreciation] = useState("");
  const [adminCost, setAdminCost] = useState("");
  const [otherFC, setOtherFC] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [volume, setVolume] = useState("");
  const [expectedRevenue, setExpectedRevenue] = useState("");

  const periodWord = PERIOD_LABELS[period];

  const autoRevenue = unitPrice && volume ? (parseFloat(unitPrice) * parseFloat(volume)) : null;

  useEffect(() => {
    if (autoRevenue && !expectedRevenue) {
      setExpectedRevenue(autoRevenue.toString());
    }
  }, [autoRevenue]);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!targetProfit && parseFloat(targetProfit) > 0;
      case 1: return !!industry;
      case 2: return !!materialCost || !!labourCost || !!otherVC;
      case 3: return !!rent || !!depreciation || !!adminCost || !!otherFC;
      case 4: return !!unitPrice && parseFloat(unitPrice) > 0;
      case 5: return !!volume && parseFloat(volume) > 0;
      case 6: return !!expectedRevenue && parseFloat(expectedRevenue) > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete({
        targetProfit: parseFloat(targetProfit) || 0,
        period,
        industry,
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
        unitPrice: parseFloat(unitPrice) || 0,
        volume: parseFloat(volume) || 0,
        expectedRevenue: parseFloat(expectedRevenue) || 0,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    } else {
      onBack();
    }
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
              <Label>First, what time period are we planning for?</Label>
              <Select value={period} onValueChange={(v: DialoguePeriod) => setPeriod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">All numbers you enter from here will be {period}.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetProfit">How much profit do you want to make per {periodWord}?</Label>
              <NairaInput id="targetProfit" value={targetProfit} onChange={setTargetProfit} placeholder="e.g. 500000" />
              <p className="text-xs text-muted-foreground">This is the money you want left after paying all costs.</p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-2">
            <Label>What industry or business are you in?</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(ind => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                ⚡ Enter the cost to produce ONE unit — not your total. Fill at least one field.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="material">Material cost per ONE unit</Label>
                <NairaInput id="material" value={materialCost} onChange={setMaterialCost} placeholder="Cost of raw materials for one item" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="labour">Labour cost per ONE unit</Label>
                <NairaInput id="labour" value={labourCost} onChange={setLabourCost} placeholder="Wages/work to make one item" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="othervc">Other cost per ONE unit</Label>
                <NairaInput id="othervc" value={otherVC} onChange={setOtherVC} placeholder="Packaging, delivery per item, etc." />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              These are bills you pay every {periodWord} <span className="font-medium">whether you sell anything or not</span>. Fill at least one.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rent">Rent (per {periodWord})</Label>
                <NairaInput id="rent" value={rent} onChange={setRent} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depreciation">Equipment depreciation (per {periodWord})</Label>
                <NairaInput id="depreciation" value={depreciation} onChange={setDepreciation} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin">Admin costs — salaries, utilities, software (per {periodWord})</Label>
                <NairaInput id="admin" value={adminCost} onChange={setAdminCost} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otherfc">Other fixed costs (per {periodWord})</Label>
                <NairaInput id="otherfc" value={otherFC} onChange={setOtherFC} />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-2">
            <Label htmlFor="unitPrice">How much do you charge a customer for ONE unit?</Label>
            <NairaInput id="unitPrice" value={unitPrice} onChange={setUnitPrice} placeholder="e.g. 2500" />
            <p className="text-xs text-muted-foreground">Your sticker price for a single item.</p>
          </div>
        );
      case 5:
        return (
          <div className="space-y-2">
            <Label htmlFor="volume">How many units will you sell per {periodWord}?</Label>
            <Input
              id="volume"
              type="number"
              min={0}
              value={volume}
              onChange={e => setVolume(e.target.value)}
              placeholder="e.g. 1000"
            />
            <p className="text-xs text-muted-foreground">Your realistic sales target for one {periodWord}.</p>
          </div>
        );
      case 6:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="revenue">Total money you expect to earn per {periodWord}</Label>
              <NairaInput id="revenue" value={expectedRevenue} onChange={setExpectedRevenue} />
            </div>
            {autoRevenue && (
              <p className="text-xs text-muted-foreground">
                Suggested: ₦{autoRevenue.toLocaleString()} (Price × Volume)
                {expectedRevenue !== autoRevenue.toString() && (
                  <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => setExpectedRevenue(autoRevenue.toString())}>
                    Use this
                  </Button>
                )}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

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
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {currentStep === 0 ? "Back" : "Previous"}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed()}>
          {currentStep === 6 ? (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              Get AI Insights
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
