

## Enhance ProfitPro: Reusable Data Connection + Manual Field Entry

Two changes: (1) Let ProfitPro use the existing `DataConnectionSelector` for new uploads/connections instead of only listing existing reports, and (2) allow manual value entry in the FieldMapper when a column isn't available in the data.

### 1. ProfitProWorkflow.tsx - Add DataConnectionSelector for New Data

**Current**: Step 1 ("Select Data") only lists existing `spreadsheet_reports`. Users can't upload new data directly from ProfitPro.

**Change**: Add a tabbed interface in Step 1 with two options:
- **"Existing Reports"** tab - current behavior, pick from completed reports
- **"Connect New Data"** tab - embeds the existing `DataConnectionSelector` component (same one used in A.S.S.), letting users upload a spreadsheet or connect a live sheet directly from ProfitPro

When a new upload completes via `DataConnectionSelector`, we wait for the report to be created in `spreadsheet_reports`, then extract its columns and proceed to the Map Fields step -- same as selecting an existing report.

### 2. FieldMapper.tsx - Manual Value Entry Mode

**Current**: Each financial role has a dropdown to pick a column. If the data doesn't have a "Fixed Costs" column, the user is stuck.

**Change**: Add a toggle per required field (fixedCosts, variableCosts) that switches between:
- **"Map to column"** (default) - existing dropdown behavior
- **"Enter manually"** - shows a numeric input where the user types a dollar value (e.g., $50,000 for total fixed costs)

Update the `FieldMapping` interface to support manual values:

```typescript
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
```

The validation logic changes: a required field is satisfied if it has either a mapped column OR a manual value.

### 3. Edge Function Update - Handle Manual Values

Update `analyze-profitpro/index.ts` to check `fieldMapping.manualValues`. If `manualValues.fixedCosts` is provided, use that number directly instead of summing from the column. Same for `variableCosts` and `unitPrice`.

### Files Changed

| File | Change |
|------|--------|
| `src/components/profitpro/ProfitProWorkflow.tsx` | Add DataConnectionSelector tab in Step 1; handle new upload flow |
| `src/components/profitpro/FieldMapper.tsx` | Add manual entry toggle + input for cost fields; update FieldMapping interface |
| `supabase/functions/analyze-profitpro/index.ts` | Handle `manualValues` in field mapping |

### Technical Details

- The `DataConnectionSelector` `onConnectionComplete` callback returns `{ type, file, fileUrl }`. After upload, we poll `spreadsheet_reports` for a matching `file_path` to get the report ID and proceed.
- Manual entry toggle uses a simple `Switch` component next to the dropdown. When toggled on, the dropdown is replaced by a currency `Input`.
- The edge function checks `fieldMapping.manualValues?.fixedCosts` before falling back to column summation.

