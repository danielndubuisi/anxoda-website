import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Wand2, DollarSign } from "lucide-react";

export interface FieldMapping {
  revenue: string | null;
  fixedCosts: string | null;
  variableCosts: string | null;
  volume: string | null;
  unitPrice: string | null;
  date: string | null;
  category: string | null;
  manualValues?: {
    fixedCosts?: number;
    variableCosts?: number;
    unitPrice?: number;
  };
}

interface FieldMapperProps {
  columns: string[];
  onMappingComplete: (mapping: FieldMapping) => void;
  onBack: () => void;
}

const MANUAL_ELIGIBLE_KEYS = ["fixedCosts", "variableCosts", "unitPrice"] as const;

const FINANCIAL_ROLES = [
  { key: "revenue", label: "Revenue / Sales", required: true, keywords: ["revenue", "sales", "amount", "total", "income", "net sales", "gross sales"] },
  { key: "fixedCosts", label: "Fixed Costs", required: true, keywords: ["fixed cost", "fixed_cost", "overhead", "rent", "salary", "salaries", "fixed expense"] },
  { key: "variableCosts", label: "Variable Costs", required: true, keywords: ["variable cost", "variable_cost", "cogs", "cost of goods", "material", "direct cost"] },
  { key: "volume", label: "Volume / Quantity", required: true, keywords: ["quantity", "qty", "volume", "units", "units sold", "count"] },
  { key: "unitPrice", label: "Unit Price", required: false, keywords: ["price", "unit price", "selling price", "rate"] },
  { key: "date", label: "Date", required: false, keywords: ["date", "order date", "invoice date", "transaction date", "period", "month", "year"] },
  { key: "category", label: "Product / Category", required: false, keywords: ["category", "product", "segment", "item", "sku", "product name", "type"] },
] as const;

function autoSuggest(columns: string[]): FieldMapping {
  const mapping: FieldMapping = {
    revenue: null, fixedCosts: null, variableCosts: null,
    volume: null, unitPrice: null, date: null, category: null,
  };
  const used = new Set<string>();

  for (const role of FINANCIAL_ROLES) {
    for (const col of columns) {
      if (used.has(col)) continue;
      const lc = col.toLowerCase().trim();
      if (role.keywords.some(k => lc === k || lc.includes(k))) {
        (mapping as any)[role.key] = col;
        used.add(col);
        break;
      }
    }
  }
  return mapping;
}

export const FieldMapper = ({ columns, onMappingComplete, onBack }: FieldMapperProps) => {
  const [mapping, setMapping] = useState<FieldMapping>(() => autoSuggest(columns));
  const [autoDetected, setAutoDetected] = useState(true);
  const [manualMode, setManualMode] = useState<Record<string, boolean>>({});
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  const updateField = (key: string, value: string) => {
    setMapping(prev => ({ ...prev, [key]: value === "__none__" ? null : value }));
    setAutoDetected(false);
  };

  const toggleManual = (key: string, enabled: boolean) => {
    setManualMode(prev => ({ ...prev, [key]: enabled }));
    if (enabled) {
      // Clear column mapping when switching to manual
      setMapping(prev => ({ ...prev, [key]: null }));
    } else {
      // Clear manual value when switching to column
      setManualValues(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const isManualEligible = (key: string): boolean =>
    (MANUAL_ELIGIBLE_KEYS as readonly string[]).includes(key);

  const isFieldSatisfied = (key: string): boolean => {
    if ((mapping as any)[key]) return true;
    if (manualMode[key] && manualValues[key] && parseFloat(manualValues[key]) > 0) return true;
    return false;
  };

  const requiredFilled = FINANCIAL_ROLES
    .filter(r => r.required)
    .every(r => isFieldSatisfied(r.key));

  const mappedCount = Object.entries(mapping)
    .filter(([k, v]) => v && k !== "manualValues")
    .length + Object.values(manualValues).filter(v => v && parseFloat(v) > 0).length;

  const handleComplete = () => {
    const finalMapping: FieldMapping = { ...mapping };
    const mv: Record<string, number> = {};
    for (const key of MANUAL_ELIGIBLE_KEYS) {
      if (manualMode[key] && manualValues[key]) {
        const val = parseFloat(manualValues[key]);
        if (val > 0) mv[key] = val;
      }
    }
    if (Object.keys(mv).length > 0) {
      finalMapping.manualValues = mv;
    }
    onMappingComplete(finalMapping);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Map Financial Fields</CardTitle>
            {autoDetected && mappedCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Wand2 className="h-3 w-3" />
                {mappedCount} auto-detected
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Assign your spreadsheet columns to financial roles for CVP analysis.
            Fields marked with * are required. You can enter values manually if a column isn't available.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {FINANCIAL_ROLES.map(role => {
            const value = (mapping as any)[role.key];
            const isManual = manualMode[role.key];
            const satisfied = isFieldSatisfied(role.key);
            const canManual = isManualEligible(role.key);

            return (
              <div key={role.key} className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-44 flex items-center gap-2 shrink-0">
                    {satisfied ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : role.required ? (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm font-medium">
                      {role.label}{role.required && " *"}
                    </span>
                  </div>

                  {isManual ? (
                    <div className="flex-1 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        type="number"
                        placeholder="Enter total value..."
                        value={manualValues[role.key] || ""}
                        onChange={e => setManualValues(prev => ({ ...prev, [role.key]: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <Select
                      value={value || "__none__"}
                      onValueChange={(v) => updateField(role.key, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {canManual && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        id={`manual-${role.key}`}
                        checked={isManual}
                        onCheckedChange={(checked) => toggleManual(role.key, checked)}
                      />
                      <Label htmlFor={`manual-${role.key}`} className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                        Manual
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button
          onClick={handleComplete}
          disabled={!requiredFilled}
        >
          Continue to Configure →
        </Button>
      </div>
    </div>
  );
};
