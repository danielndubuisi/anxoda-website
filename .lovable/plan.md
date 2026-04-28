## ProfitPro v3: Conversational, AI-Researched, Profit-Path Focused

Six refinements to make ProfitPro feel like a friendly profit coach that does the homework for the user.

### 1. Conversational Welcome (`ProfitProWelcome.tsx`)

Replace the landing-page-style hero with a warmer, chat-style greeting:

- New headline: **"Hello there 👋"**
- Sub-headline: **"Want to boost your profits and know exactly what it takes?"**
- One-paragraph copy: _"Tell me a little about your business and I'll show you the smallest number of sales you need to start making real profit — plus how to get there faster."_
- Drop the "AI-Powered" / "7 questions" framing entirely (no mention of AI to the user).
- Keep the gradient icon + soft animations but tone down to feel more personal.
- CTAs unchanged: **"Let's go →"** and **"Back to Tools"**.
- Footer line: _"Takes about 2 minutes."_

### 2. Step 1 reorder + comma-formatted inputs (`ProfitProDialogue.tsx`)

Reorder Step 1 so the **profit goal comes first**, then the period:

1. **"How much profit do you want to make?"** (Naira input, comma-formatted)
2. **"Over what period?"** (Daily / Weekly / Monthly / Yearly select)
3. Inline confirmation: _"Got it — you want to make ₦X every [period]."_

Build a new **`FormattedNairaInput`** component that:
- Displays values with thousands-separators (e.g. `500,000`) as the user types
- Stores the underlying numeric string in state (strips commas)
- Reads `inputMode="numeric"` and `type="text"` so commas render properly on mobile/desktop
- Reused in **every** monetary field across the dialogue (target profit, costs, unit price)
- Volume field also gets thousand-separator formatting (without ₦)

### 3. AI-researched cost auto-fill (new step + edge function)

Replace the manual variable-cost step with an **AI suggestion flow**:

- After Industry, ask: **"What's the one product or service you want to sell?"** (single text input — e.g. "Bottled groundnut oil 1L", "Haircut", "T-shirt").
- On submit, call a new edge function **`suggest-product-costs`** (uses Lovable AI Gateway, `google/gemini-3-flash-preview` with structured tool-calling) that returns:
  ```json
  {
    "suggestedUnitPrice": 2500,
    "marketPriceRange": { "low": 2000, "high": 3200 },
    "variableCosts": { "material": 1200, "labour": 300, "other": 150 },
    "fixedCostsHints": { "rent": 80000, "admin": 50000 },
    "rationale": "Based on typical Nigerian small-business benchmarks for ..."
  }
  ```
  Prompt anchors on Nigerian market context (Naira), the user's industry, and the product/service name.
- Show a **"Smart Estimates"** card pre-filled with these numbers; each field is editable. A small note reads: _"These are typical benchmarks for your industry — adjust to match your reality."_
- The fixed-costs step keeps its existing shape but uses the suggested rent/admin as defaults (still editable and additive).
- Selling-price step shows the suggested price prominently with the **market range** as helper text: _"Most sellers charge ₦2,000–₦3,200. Suggested: ₦2,500."_

This satisfies "what price to sell at based on current market trends" and "auto-fill costs based on industry + product."

### 4. Remove Expected Revenue step (auto-calculate)

Delete Step 7 entirely. Revenue is computed as `unitPrice × volume` server-side and client-side. The dialogue ends after the Volume step. Total dialogue: **6 steps** (Profit Goal → Industry → Product → Smart Costs → Fixed Bills → Selling Price → Volume — actually 7 steps but one less interactive question; will combine Product+Smart Costs review into a single step to keep it at ~6).

Updated `DialogueAnswers` interface: drop `expectedRevenue`; add `productName: string` and optional `marketPriceRange: { low: number; high: number }`.

### 5. Refocused summary report — "Path to Profit" (`ProfitProInsights.tsx`)

The hero of the insights view becomes a single, can't-miss card:

> **"Sell at least X units per [period] to start making profit."**
> _"At your price of ₦Y, that's ₦Z in revenue."_

Below it, a second highlight card:

> **"To hit your goal of ₦[targetProfit], sell N units per [period]."**
> Where `N = (fixedCosts + targetProfit) / (price - vcPerUnit)` — the **target-profit volume** formula.

Then keep:
- The 3 core plain-English cards (margin, profit/loss, margin of safety) — drop the redundant break-even revenue card since BE units is now the hero.
- The **break-even chart** below.
- The **What If?** tab (see #6).
- The **Actions** tab (AI prescriptions).

Demote the "Advanced (DOL)" card to a collapsible `<details>` element so it doesn't clutter the main view.

The AI prompt in `analyze-profitpro` is updated to emphasize: _"The user's #1 question is 'how many units must I sell to be profitable AND hit my target?' Always reference the minimum-profitable volume and target-profit volume in plain language."_

### 6. Smarter What-If with profitability framing (`ProfitProInsights.tsx`)

Keep the slider mechanics but reframe the live deltas around the user's actual question:

- Add a **"Profitability Verdict"** banner at the top of the What-If tab:
  - Green: _"At this scenario you'd profit ₦X — ₦Y above your goal."_
  - Amber: _"You'd cover costs but fall ₦Z short of your goal."_
  - Red: _"You'd still lose money — try raising price or volume."_
- The 3 delta cards become: **"Profit vs your goal"**, **"Units needed to break even"**, **"Units needed to hit goal"** (replaces "Margin of safety" delta — clearer for an SMB owner).
- Keep the live scenario chart.
- Add a one-click **"Match my goal"** button that auto-solves the volume slider to the exact units needed to reach the target profit at the current price/cost mix (computed via the target-profit-volume formula).

### Files Changed / Created

| File | Action |
|---|---|
| `src/components/profitpro/ProfitProWelcome.tsx` | Rewrite: warm, conversational tone, drop AI/landing-page framing |
| `src/components/profitpro/ProfitProDialogue.tsx` | Reorder Step 1, add Product step, drop Revenue step, integrate `FormattedNairaInput`, accept AI-suggested defaults |
| `src/components/profitpro/FormattedNairaInput.tsx` | **Create** — comma-formatted numeric input |
| `src/components/profitpro/ProfitProInsights.tsx` | New "Path to Profit" hero, target-profit-volume calc, demote DOL, refocus What-If verdict + "Match my goal" button |
| `src/lib/cvpMath.ts` | Add `unitsForTargetProfit({ price, vcPerUnit, fc, target })` helper |
| `supabase/functions/suggest-product-costs/index.ts` | **Create** — Lovable AI tool-calling endpoint returning typical Nigerian benchmarks for industry + product |
| `supabase/functions/analyze-profitpro/index.ts` | Drop `expectedRevenue` requirement (compute as price × volume); enhance prompt to emphasize minimum-profitable volume + target-profit volume |
| `supabase/config.toml` | Register `suggest-product-costs` (`verify_jwt = true`) |

### Technical Notes

- **Comma formatting**: store raw numeric string in state, format with `Intl.NumberFormat('en-NG').format(n)` for display, parse with `value.replace(/,/g,'')` on change.
- **Target-profit volume formula**: `Math.ceil((fixedCosts + targetProfit) / (pricePerUnit - vcPerUnit))` — guarded against `cmPerUnit <= 0` (returns `Infinity`, displayed as "Not possible at current pricing").
- **Cost-suggestion edge function**: authenticated (`verify_jwt = true`), uses tool-calling for guaranteed JSON shape, falls back to `null` on AI failure (UI then shows blank inputs as before).
- **No AI mention to users**: all UI copy says "smart estimates" / "typical benchmarks" rather than naming the technology.
- **Period semantics unchanged**: math stays in the user's chosen period; `unitPrice × volume` consistency means we don't need to re-introduce period normalization.
