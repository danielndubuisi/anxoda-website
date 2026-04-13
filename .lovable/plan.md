

## ProfitPro Phase 1: Intelligent CVP Dashboard

Build the first module of ProfitPro as a fully functional tool within the existing Anxoda tool network. Users connect data via existing spreadsheet/live-sheet flows, then map financial fields for CVP analysis. The AI generates prescriptive profitability insights.

---

### Architecture Overview

```text
User clicks ProfitPro in Tools
         │
         ▼
┌──────────────────────────┐
│  ProfitPro Setup Wizard  │
│  Step 1: Select Data     │  ← Reuses existing spreadsheet_reports / live_sheet_connections
│  Step 2: Map Fields      │  ← NEW: User maps columns to financial roles
│  Step 3: Configure       │  ← Set unit price, volume baseline, etc.
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  Edge Function:          │
│  analyze-profitpro       │  ← NEW: Parses data, computes CVP metrics, calls AI
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  CVP Dashboard View      │
│  - Interactive CVP chart │
│  - Health metrics cards  │
│  - AI prescriptions      │
│  - DOL warning system    │
└──────────────────────────┘
```

---

### What Gets Built

#### 1. Database: New `profitpro_analyses` table

Stores each ProfitPro analysis run linked to the user and optionally to an existing spreadsheet report.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| source_report_id | uuid (nullable) | Links to `spreadsheet_reports` if reusing data |
| source_connection_id | uuid (nullable) | Links to `live_sheet_connections` if reusing |
| field_mapping | jsonb | User's column-to-financial-field mapping |
| config | jsonb | Unit price, fixed costs baseline, etc. |
| cvp_results | jsonb | Computed BEP, CMR, DOL, margins |
| ai_insights | jsonb | AI-generated prescriptions |
| processing_status | text | processing / completed / failed |
| created_at / updated_at | timestamps | Standard |

RLS: Users can only CRUD their own rows.

#### 2. Frontend Components (4 new files)

**`src/components/profitpro/ProfitProWorkflow.tsx`**
- Multi-step wizard: Select Data Source --> Map Fields --> Configure --> Results
- Step 1 shows existing reports and live-sheet connections to pick from (or upload new)
- Step 2 presents detected columns and lets user drag/assign them to: Revenue, Fixed Costs, Variable Costs, Volume/Quantity, Date, Product/Category
- Step 3 sets baseline unit price and any overrides
- Step 4 shows the CVP Dashboard

**`src/components/profitpro/FieldMapper.tsx`**
- Displays columns from the selected data source
- AI auto-suggests mappings based on column names (reuses existing `schema_detect` patterns)
- User confirms/corrects with dropdowns
- Financial roles: Revenue, Fixed Costs, Variable Costs, Volume, Unit Price, Date, Category

**`src/components/profitpro/CVPDashboard.tsx`**
- **Dynamic CVP Chart**: Recharts line chart plotting Revenue line, Total Cost line, Fixed Cost line with BEP intersection marker
- **Health Metrics Cards**: Contribution Margin Ratio, Break-Even Point (units + revenue), Degree of Operating Leverage, Current Profit/Loss position
- **DOL Warning System**: Amber/red alerts when DOL is negative (loss-amplifying zone)
- **AI Prescriptions Panel**: Reuses the existing prescription card pattern from ReportViewer (title, action, reason, expectedOutcome, priority, effort)

**`src/components/profitpro/ProfitProReport.tsx`**
- Read-only view of a completed analysis (for viewing from Reports tab)

#### 3. Edge Function: `supabase/functions/analyze-profitpro/index.ts`

Accepts: `{ sourceReportId?, sourceConnectionId?, fieldMapping, config }`

Processing pipeline:
1. Fetch raw data from storage (reuses existing download logic from process-spreadsheet)
2. Parse with XLSX, apply field mapping to extract financial columns
3. Compute CVP metrics:
   - Total Revenue, Total Variable Costs, Total Fixed Costs
   - Contribution Margin = Revenue - Variable Costs
   - CMR = CM / Revenue
   - BEP (units) = Fixed Costs / CM per unit
   - BEP (revenue) = Fixed Costs / CMR
   - DOL = CM / Operating Income (with negative DOL detection)
   - Current volume position relative to BEP
4. Call Lovable AI (with OpenAI fallback) for prescriptive analysis using financial context
5. Store results in `profitpro_analyses` table
6. Return computed metrics + AI insights

#### 4. Dashboard Integration

- Update `ToolsGrid.tsx`: Change ProfitPro status from "coming-soon" to "active"
- Update `Dashboard.tsx`: Add `selectedTool === "cvp-analyzer"` case that renders `ProfitProWorkflow`
- ProfitPro analyses appear in the Reports tab alongside spreadsheet reports

---

### What Gets Reused

| Existing Asset | How ProfitPro Uses It |
|---|---|
| `spreadsheet_reports` table | Source data reference |
| `live_sheet_connections` table | Source data reference |
| Storage buckets (spreadsheets) | Downloads raw files |
| `process-spreadsheet` parsing logic | XLSX parsing patterns |
| `schema_detect.py` column matching | Inspires client-side auto-mapping |
| ReportViewer prescription cards | Same UI pattern for AI insights |
| Lovable AI Gateway | Powers prescriptive recommendations |
| Auth context | Same user auth flow |

---

### Files Changed/Created

| File | Action |
|------|--------|
| `src/components/profitpro/ProfitProWorkflow.tsx` | Create |
| `src/components/profitpro/FieldMapper.tsx` | Create |
| `src/components/profitpro/CVPDashboard.tsx` | Create |
| `src/components/profitpro/ProfitProReport.tsx` | Create |
| `supabase/functions/analyze-profitpro/index.ts` | Create |
| `src/components/ToolsGrid.tsx` | Update status to active |
| `src/pages/Dashboard.tsx` | Add ProfitPro tool routing |
| `supabase/config.toml` | Add analyze-profitpro function config |
| Migration | Create `profitpro_analyses` table + RLS |

---

### Not Included in Phase 1 (Future Phases)

- Module 2: Automated Variance Advisor (budget vs actual comparison)
- Module 3: What-If Sandbox (Monte Carlo simulation, interactive sliders)
- ERP/QuickBooks OAuth integration
- Enterprise SQL connector
- Real-time live-sync updates
- Redis caching layer

