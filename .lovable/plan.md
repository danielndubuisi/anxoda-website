

## Separate Active and Coming Soon Tools into Distinct Sections

Inspired by the reference image's pattern of grouping content into labeled sections (like "Recent Documents" and "My presets"), the ToolsGrid will be restructured to split tools into two clearly labeled groups.

### What Changes

**File: `src/components/ToolsGrid.tsx`**

Instead of rendering all tools in a single grid, the component will:

1. **Filter tools** into two arrays: `activeTools` and `comingSoonTools`
2. **Render two separate sections**, each with its own heading:
   - **"Active Tools"** -- section header with a green dot indicator, followed by a grid of active tool cards
   - **"Coming Soon"** -- section header with a muted style, followed by a grid of coming-soon tool cards with reduced opacity on hover
3. **Keep all existing card designs** -- gradient overlays, icons, badges, demo visualizations, and hover effects remain unchanged
4. **Add visual distinction** between sections using a subtle separator (a `Separator` component or spacing) so users can immediately see what is available now vs. what is planned

### Layout Structure

```text
Business Intelligence Tools (main heading)
subtitle

--- Active Tools ---
[ A.S.S card ]

--- Coming Soon ---
[ ProfitPro card ] [ Mapper card ]
[ SWOT Genie card ]
```

- Active tools get full interactive styling (as today)
- Coming Soon tools get a slight opacity reduction (`opacity-70 hover:opacity-100`) to visually de-emphasize them while keeping them discoverable
- Section headers are left-aligned, bold, with a small colored indicator dot

### Technical Details

- Split the `tools` array using `.filter()` on `status`
- Active section uses the same `grid grid-cols-1 md:grid-cols-2` but since there is only one active tool currently, it will naturally display as a single prominent card
- Coming Soon section uses `grid grid-cols-1 md:grid-cols-3` to fit three cards more compactly, reinforcing they are secondary
- Add a `Separator` from `@/components/ui/separator` between the two sections
- No new files or dependencies needed

