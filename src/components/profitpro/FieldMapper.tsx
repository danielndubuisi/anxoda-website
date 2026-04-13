import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Wand2 } from "lucide-react";

export interface FieldMapping {
  revenue: string | null;
  fixedCosts: string | null;
  variableCosts: string | null;
  volume: string | null;
  unitPrice: string | null;
  date: string | null;
  category: string | null;
}

interface FieldMapperProps {
  columns: string[];
  onMappingComplete: (mapping: FieldMapping) => void;
  onBack: () => void;
}

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

  const updateField = (key: string, value: string) => {
    setMapping(prev => ({ ...prev, [key]: value === "__none__" ? null : value }));
    setAutoDetected(false);
  };

  const requiredFilled = FINANCIAL_ROLES
    .filter(r => r.required)
    .every(r => (mapping as any)[r.key]);

  const mappedCount = Object.values(mapping).filter(Boolean).length;

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
            Fields marked with * are required.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {FINANCIAL_ROLES.map(role => {
            const value = (mapping as any)[role.key];
            return (
              <div key={role.key} className="flex items-center gap-4">
                <div className="w-44 flex items-center gap-2 shrink-0">
                  {value ? (
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
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button
          onClick={() => onMappingComplete(mapping)}
          disabled={!requiredFilled}
        >
          Continue to Configure →
        </Button>
      </div>
    </div>
  );
};
