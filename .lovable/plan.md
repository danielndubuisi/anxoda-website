## ProfitPro Polish Round 3: Personality, Industry-Awareness & Returning Users

Three focused changes that make ProfitPro feel smarter and more personal — no backend logic, math, or schema changes.

---

### 1. Industry-aware placeholders on Step 3 (Product/Service)

**File:** `src/components/profitpro/ProfitProDialogue.tsx`

Currently the product input shows a fixed placeholder: `e.g. Bottled groundnut oil 1L · Haircut · T-shirt`.

Add a placeholder map keyed by industry (using the existing `INDUSTRIES` list) so the example matches the user's selected industry:

| Industry | Placeholder example |
|---|---|
| Food & Beverages | `e.g. Jollof rice plate · Bottled zobo 50cl · Meat pie` |
| Fashion & Textiles | `e.g. Ankara dress · Men's t-shirt · Bridal gele` |
| Beauty & Personal Care | `e.g. Box braids · Manicure · Shea butter 250g` |
| Retail & E-commerce | `e.g. Phone charger · School bag · 5L bucket` |
| Agriculture & Farming | `e.g. 50kg bag of maize · Crate of eggs · Live broiler` |
| Manufacturing | `e.g. Plastic chair · Bottled groundnut oil 1L · Bag of sachet water` |
| Hospitality & Tourism | `e.g. Standard room/night · Weekend tour package · Event hall/day` |
| Professional Services | `e.g. Logo design · Tax filing · 1-hr consultation` |
| Technology & Software | `e.g. Website build · SaaS subscription/month · App maintenance` |
| Healthcare & Pharmaceuticals | `e.g. Malaria test · Antimalarial pack · Doctor consultation` |
| Construction & Real Estate | `e.g. Bag of cement · House plan design · Tile installation/sqm` |
| Transportation & Logistics | `e.g. Lagos–Ibadan trip · Same-day delivery · Container haulage` |
| Education & Training | `e.g. Monthly tuition · Coding bootcamp seat · Tutoring/hr` |
| Automotive | `e.g. Engine oil change · Car wash · Brake pad replacement` |

(Plus sensible defaults for the remaining industries; fall back to the current example for `Other` / unmatched.)

Also use the same map to flavor the **labels** of cost fields on Step 4 where useful — e.g. for service industries the "Material cost" label becomes "Materials/supplies cost" and for pure services it can show a hint "Services often have ₦0 here". Keep field IDs and state untouched.

---

### 2. Rebrand "AI Profit Coach" → "John, your Anxoda Profit Coach"

**File:** `src/components/profitpro/ProfitProChat.tsx`

- Header label: change `AI Profit Coach` → `John · Anxoda Profit Coach`.
- Welcome message: replace
  > 👋 Hi! I'm your **AI Profit Coach**. I've reviewed your numbers…

  with
  > 👋 Hi, I'm **John**, your Anxoda Profit Coach. I've looked over your numbers and I'm here to help you grow your profit. Ask me anything — or pick a question below to get started.
- Replace the generic `Bot` lucide icon used for the assistant avatar with a small monogram **"J"** in a circle (same primary-tint background) so it feels like a person, not a robot.
- Input placeholder: `Ask John anything…`

**File:** `supabase/functions/profitpro-chat/index.ts`

Update the system prompt so the assistant introduces and refers to itself as **John, the Anxoda Profit Coach**, never mentioning "AI", "model", or "assistant". Tone: warm, direct, plain English, Naira examples.

**Other entry points** to scan for "AI Profit Coach" / "AI Coach" wording and update to "Profit Coach" / "Talk to John":
- `src/components/profitpro/ProfitProInsights.tsx` (the "Chat" CTA button + any heading)
- `src/components/profitpro/ProfitProWorkflow.tsx` (any tab/label)

The word "AI" stays in marketing/landing pages — only the coach persona is renamed.

---

### 3. Smart Welcome screen for returning users

**Files:**
- `src/components/profitpro/ProfitProWorkflow.tsx` (orchestrates step state)
- `src/components/profitpro/ProfitProWelcome.tsx` (extend, not replace)

**Behavior**

On entering ProfitPro, query `profitpro_analyses` for the current user (`order created_at desc`, `limit 5`, `processing_status = 'completed'`, non-null `cvp_results`).

- **No prior analyses** → show the existing friendly welcome screen unchanged (first-time experience preserved).
- **Has prior analyses** → render a new **"Welcome back" dashboard** instead:
  - Compact header: `Welcome back 👋 — pick up where you left off.`
  - **Most recent analysis card** (highlighted): product name, industry, target profit, break-even units, last updated. Two primary actions:
    - `Open insights` → loads that analysis's `cvp_results` + `ai_insights` into state and jumps directly to the `insights` step (reusing `ProfitProInsights`, including its existing What-If sandbox + `Talk to John` chat).
    - `Run a What-If on this` → same as above but auto-scrolls/opens the What-If panel inside `ProfitProInsights`. (If the panel is currently a section, pass an `initialTab="whatif"` prop; otherwise add a small `scrollToWhatIf` ref behavior.)
  - **List of up to 4 more past analyses** (smaller cards): each opens its insights view.
  - **Secondary CTA at the bottom:** `Start a fresh analysis` → goes to the `dialogue` step like today.

Loading state: show a subtle skeleton inside the welcome card while the query runs (keeps the screen from flashing the first-time message before the dashboard appears).

**Loading saved analyses into state**

The analysis row already stores `cvp_results`, `ai_insights`, `config`, and (in `config`) the original `dialogueAnswers`. Reuse `ProfitProReport`'s fetch pattern, then set:
- `dialogueCvpResults`, `dialogueAiInsights`, `dialogueAnswers` (read from `config.dialogueAnswers` if present), then `setStep("insights")`.

If a row has no `dialogueAnswers` saved (older spreadsheet-flow analyses), open it in the existing `CVPDashboard` results view instead.

---

### Files Touched

**Edited**
- `src/components/profitpro/ProfitProDialogue.tsx` — industry placeholder map for Step 3 + tweaked Step 4 labels.
- `src/components/profitpro/ProfitProChat.tsx` — John persona, header, avatar monogram, placeholder.
- `src/components/profitpro/ProfitProInsights.tsx` — chat CTA copy ("Talk to John"); add optional `initialTab="whatif"` (or scroll target) so the welcome dashboard can deep-link into What-If.
- `src/components/profitpro/ProfitProWelcome.tsx` — extend to render the returning-user dashboard when prior analyses exist.
- `src/components/profitpro/ProfitProWorkflow.tsx` — fetch past analyses on mount; new handler to load a saved analysis into insights state; pass props through to welcome and insights.
- `supabase/functions/profitpro-chat/index.ts` — system prompt rename to John.

**Not touched**
- CVP math (`src/lib/cvpMath.ts`)
- `analyze-profitpro` edge function and DB schema
- Auth / RLS / migrations
- Marketing site copy

---

### Out of scope (explicit)

- No new database columns or migrations.
- No changes to how analyses are saved.
- No changes to the dialogue's 7-step structure or order.
- No removal of the first-time welcome — only an alternate render path for returning users.
