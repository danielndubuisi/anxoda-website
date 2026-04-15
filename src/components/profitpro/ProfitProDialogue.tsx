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

export interface DialogueAnswers {
  targetProfit: number;
  period: "monthly" | "yearly";
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
  { icon: Target, title: "Target Profit", description: "What profit do you plan to make?" },
  { icon: Factory, title: "Your Industry", description: "What industry or business are you in?" },
  { icon: Boxes, title: "Variable Costs", description: "Break down your cost per unit produced" },
  { icon: Building2, title: "Fixed Costs", description: "What are your recurring fixed expenses?" },
  { icon: Tag, title: "Unit Selling Price", description: "At what price do you sell one unit of your product?" },
  { icon: BarChart3, title: "Sales Volume", description: "How many units do you expect to sell?" },
  { icon: TrendingUp, title: "Expected Revenue", description: "How much do you expect to generate from sales?" },
];

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
  const [animDir, setAnimDir] = useState<"forward" | "back">("forward");

  // Form state
  const [targetProfit, setTargetProfit] = useState("");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
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

  // Auto-calculate expected revenue hint
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
      setAnimDir("forward");
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
      setAnimDir("back");
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
              <Label htmlFor="targetProfit">Target Profit</Label>
              <NairaInput id="targetProfit" value={targetProfit} onChange={setTargetProfit} placeholder="e.g. 500000" />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={(v: "monthly" | "yearly") => setPeriod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-2">
            <Label>Industry</Label>
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
            <p className="text-xs text-muted-foreground">Enter the cost per unit. Fill at least one field.</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="material">Material Cost per Unit</Label>
                <NairaInput id="material" value={materialCost} onChange={setMaterialCost} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="labour">Labour Cost per Unit</Label>
                <NairaInput id="labour" value={labourCost} onChange={setLabourCost} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="othervc">Other Variable Cost per Unit</Label>
                <NairaInput id="othervc" value={otherVC} onChange={setOtherVC} />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Enter your {period} fixed expenses. Fill at least one field.</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rent">Rent</Label>
                <NairaInput id="rent" value={rent} onChange={setRent} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depreciation">Equipment Depreciation</Label>
                <NairaInput id="depreciation" value={depreciation} onChange={setDepreciation} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin">Administrative Costs</Label>
                <NairaInput id="admin" value={adminCost} onChange={setAdminCost} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otherfc">Other Fixed Costs</Label>
                <NairaInput id="otherfc" value={otherFC} onChange={setOtherFC} />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Selling Price per Unit</Label>
            <NairaInput id="unitPrice" value={unitPrice} onChange={setUnitPrice} placeholder="e.g. 2500" />
          </div>
        );
      case 5:
        return (
          <div className="space-y-2">
            <Label htmlFor="volume">Estimated Volume ({period})</Label>
            <Input
              id="volume"
              type="number"
              min={0}
              value={volume}
              onChange={e => setVolume(e.target.value)}
              placeholder="e.g. 1000"
            />
          </div>
        );
      case 6:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="revenue">Expected Revenue ({period})</Label>
              <NairaInput id="revenue" value={expectedRevenue} onChange={setExpectedRevenue} />
            </div>
            {autoRevenue && (
              <p className="text-xs text-muted-foreground">
                Based on your inputs: ₦{autoRevenue.toLocaleString()} (Price × Volume)
                {expectedRevenue !== autoRevenue.toString() && (
                  <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => setExpectedRevenue(autoRevenue.toString())}>
                    Use this value
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
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div
            key={currentStep}
            className="animate-fade-in space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Content */}
            {renderStepContent()}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {currentStep === 0 ? "Exit" : "Back"}
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
