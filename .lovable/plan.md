

## ProfitPro Polish: Welcome Screen, Clearer Questions, What-If Sandbox & AI Chat

Six fixes that turn ProfitPro into a delightful, intuitive, end-to-end experience.

### 1. Remove the "Coming Soon" toast on click (Dashboard)

In `src/pages/Dashboard.tsx`, the `ToolsGrid.onToolSelect` handler currently fires a "Coming Soon!" toast for every tool that isn't `spreadsheet-analyzer` — including the now-active `cvp-analyzer`. Update the condition to also exclude `cvp-analyzer` so opening ProfitPro launches cleanly with no popup.

### 2. Welcome screen as first thing users see

Create **`ProfitProWelcome.tsx`** — a beautiful, animated landing card shown before the dialogue:

- Large gradient hero icon (Sparkles + TrendingUp), tagline: **"Know your numbers. Grow your profit."**
- One-paragraph plain-English explainer: _"Answer 7 quick questions about your business and get instant AI-powered insights — break-even point, profit forecasts, and tailored recommendations. No spreadsheets needed to start."_
- Three small feature pills with icons: **Instant Insights · Break-Even Chart · AI Coach**
- Two CTAs: **"Let's Get Started →"** (primary) and **"Back to Tools"** (ghost)
- Subtle floating/pulse animations using existing Tailwind keyframes (`fade-in`, `scale-in`, `animate-pulse`)

Wire it in `ProfitProWorkflow.tsx` as a new initial step: `welcome → dialogue → thinking → insights → ...`

### 3. Simpler, friendlier insight cards

Rewrite `ProfitProInsights.tsx` metric cards in plain language a non-finance owner instantly grasps:

| Old (jargon) | New (plain) |
|---|---|
| Contribution Margin (45.2%) | **For every ₦100 you earn, ₦45 is yours after costs** |
| Break-Even (Units) | **Sell this many to cover your costs** |
| Break-Even (Revenue) | **Earn this much to break even** |
| Operating Income | **Your profit / loss right now** |
| Margin of Safety | **How far you are above break-even** |
| Operating Leverage | _(moved to an "Advanced" toggle)_ |

Each card: big bold number, one-line plain-English label below, color-coded (green good / amber caution / red warning), tiny info-tooltip with the technical name for those who want it.

### 4. Crystal-clear question framing

Update `ProfitProDialogue.tsx` so every monetary or volume question explicitly states the period being asked:

- Step 1 (Target Profit): **Period selector becomes "Daily / Weekly / Monthly / Yearly"** _before_ the amount, and the amount label dynamically reads **"How much profit do you want to make per [month]?"**
- Step 3 (Variable Costs): label shows **"Cost to make ONE unit"** with a sub-line **"(Not your total — just one item)"**
- Step 4 (Fixed Costs): each input label appends the chosen period, e.g. **"Rent (per month)"**, **"Admin costs (per month)"**
- Step 5 (Unit Price): **"How much do you charge a customer for ONE unit?"**
- Step 6 (Volume): **"How many units will you sell per [month]?"**
- Step 7 (Revenue): **"Total money you expect to earn per [month]"**

The selected period propagates through every subsequent step's label and gets passed to the edge function so calculations stay consistent. Volume is normalized server-side: daily × 30 → monthly equivalent, weekly × ~4.33 → monthly, yearly ÷ 12 → monthly. (We standardize internally to monthly for math, but display labels use the user's chosen period.)

### 5. What-If Scenario Sandbox

Add a new **"What If?"** tab inside `ProfitProInsights.tsx` (alongside Break-Even Chart, AI Insights, Prescriptions):

- Four sliders (and number inputs for precision):
  - **Selling Price per Unit** (±50% range)
  - **Variable Cost per Unit** (±50%)
  - **Fixed Costs** (±50%)
  - **Volume** (±100%)
- A **"Reset to my numbers"** button
- Live-updating mini break-even chart (re-uses the same `ComposedChart`) recalculates client-side as sliders move — no server round-trip
- Live metric strip below the sliders shows the new BEP, profit, and margin of safety with **delta badges** (e.g., +₦120K profit, -200 units BEP)
- Color cue: green when scenario is better than baseline, red when worse
- Small "Save this scenario" button (Phase 2 — for now disabled with a "coming soon" tooltip)

All math is pure client-side TypeScript using the same CVP formulas already in the edge function — instant, no API cost.

### 6. "Chat with your Coach" CTA → AI chat

After the insights view, add a prominent **"Chat with your AI Profit Coach →"** card (gradient background, MessageSquare icon). Clicking opens a new step `chat`:

- Create **`ProfitProChat.tsx`** — a focused chat interface (similar pattern to `AIChatbot.tsx`) seeded with the user's full context: dialogue answers, computed CVP results, AI prescriptions, industry, period
- Uses **`react-markdown`** for AI response rendering (per project chatbot pattern)
- Suggested starter prompts as clickable chips: _"Why is my break-even so high?"_ · _"How can I improve my margin?"_ · _"What should I do first?"_ · _"Is my pricing right for my industry?"_
- Calls a new edge function **`profitpro-chat`** that streams responses from the Lovable AI Gateway (`google/gemini-2.5-flash`), with a system prompt grounding the model in the user's specific numbers and the prescriptive-insights pattern (Title, What to do, Why it matters, Expected outcome)
- Sends full message history each turn (per chatbot best practices)
- Back button returns to insights; user's chat history persists in component state for the session

### Files Changed / Created

| File | Action |
|---|---|
| `src/pages/Dashboard.tsx` | Remove the "Coming Soon" toast for `cvp-analyzer` |
| `src/components/profitpro/ProfitProWelcome.tsx` | **Create** — animated welcome screen |
| `src/components/profitpro/ProfitProDialogue.tsx` | Rewrite question copy + add Daily/Weekly/Monthly/Yearly period; dynamic labels |
| `src/components/profitpro/ProfitProInsights.tsx` | Plain-language cards + new What-If tab + Chat CTA card |
| `src/components/profitpro/ProfitProChat.tsx` | **Create** — contextual AI coach chat UI |
| `src/components/profitpro/ProfitProWorkflow.tsx` | Add `welcome` and `chat` steps; wire flow |
| `supabase/functions/analyze-profitpro/index.ts` | Accept Daily/Weekly period; normalize to monthly for math |
| `supabase/functions/profitpro-chat/index.ts` | **Create** — streaming AI coach grounded in user CVP context |
| `supabase/config.toml` | Register new edge function |

### Technical Notes

- The What-If tab uses pure functional CVP formulas duplicated client-side (CM = price − VC/unit; BEP units = FC / CM; etc.) — kept in a small `lib/cvpMath.ts` helper so client and server stay in sync conceptually
- Period normalization factor map: `{ daily: 30, weekly: 4.333, monthly: 1, yearly: 1/12 }` — multiply user input by factor to get monthly equivalent for internal math
- `react-markdown` is already used in `AIChatbot.tsx`; reuse the same pattern
- Welcome screen uses existing tailwind animations (`animate-fade-in`, `animate-scale-in`) — no new keyframes needed
- Chat edge function follows the same auth + LOVABLE_API_KEY pattern as `chatbot/index.ts`, but is **authenticated** (verify_jwt = true) since it uses private user financial data

