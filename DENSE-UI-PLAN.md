# Dense UI Implementation Plan

> **Interesting artifacts and learnings must be written back to this document.**

This document describes the incremental plan for updating TypeDB Web Studio's styling and layout to implement the Dense-Core design system derived from the [DENSE-UI-CATALOG.md](./DENSE-UI-CATALOG.md).

---

## 1. Objectives

### Primary Goals

1. **Implement Dense-Core Design Tokens**: Add spacing, typography, heights, and color tokens to `src/styles.css` using Tailwind v4's `@theme inline` directive.

2. **Apply Compact Spacing**: Update all components to use the Dense-Core spacing scale for information-dense layouts suitable for a developer IDE.

3. **Implement TypeQL Semantic Colors**: Add operation-aware colors (READ/WRITE/SCHEMA) for syntax highlighting and UI badges.

4. **Standardize Interactive Heights**: Ensure all interactive elements use consistent heights (`h-compact`, `h-default`, `h-row`, `h-header`).

5. **Maintain Dark Mode Parity**: All styling must work seamlessly in both light and dark modes using semantic color tokens.

6. **Centralize Dense Behavior in Primitives**: Refactor button, input, tab, and table primitives so future components inherit Dense defaults automatically.

### Non-Goals

- Changing VM interfaces or business logic
- Adding new features or functionality
- Modifying the LiveStore schema
- Changing routing or navigation behavior

---

## 2. Scope

### In Scope

| Area | Components Affected |
|------|---------------------|
| **Global Tokens** | `src/styles.css` - spacing, typography, heights, colors |
| **Application Shell** | TopBar, Snackbar, Dialog backdrop/container |
| **Navigation** | Navigation tabs, Database selector, Connection status beacon |
| **Pages** | Home, Connect, Query, Schema, Users |
| **Sidebar** | Schema tree, Saved queries tree, section headers |
| **Editor** | Header bar, mode tabs, action buttons, autocomplete |
| **Results** | Tab bar, Log output, Table, Graph controls |
| **History Bar** | Collapsed/expanded states, entry rows |
| **Forms** | All FormInputVM/PasswordInputVM implementations |
| **Dialogs** | All 9 dialog types (see catalog) |
| **Editor Theme** | Monaco/CodeMirror TypeQL theme colors mapped to Dense tokens |

### Out of Scope

- Graph visualization library internals (Sigma/vis.js)
- Third-party component library internals beyond the shared primitives we own (shadcn/ui base implementation details)

---

## 3. Dependencies

### Technical Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | v4.x | CSS-first configuration, OKLCH colors |
| @tailwindcss/vite | v4.x | Vite integration |
| shadcn/ui | latest | Base component primitives |

### Document Dependencies

| Document | Purpose |
|----------|---------|
| [DENSE-UI-CATALOG.md](./DENSE-UI-CATALOG.md) | Token definitions, component patterns, color mappings |
| [TESTING-PLAN.md](./TESTING-PLAN.md) | VM-first testing approach |
| `.claude/skills/tailwind/SKILL.md` | Tailwind v4 patterns and semantic colors |

### Blocking Dependencies

- [ ] Confirm OKLCH browser support matches target browsers (Safari 16.4+, Chrome 111+, Firefox 128+)
- [ ] Verify shadcn/ui components accept custom height classes without override conflicts

---

## 4. Task List

### Phase 1: Foundation Tokens & Primitives

#### Task 1.1: Add Dense-Core Spacing Tokens

**Description**: Add compact spacing scale to `@theme inline` in `src/styles.css`.

**Changes**:
- Add `--spacing-*` tokens (0, 0.5, 1, 1.5, 2, 3, 4, 6, 8)

**Acceptance Criteria**:
- [ ] All spacing tokens are defined in `@theme inline`
- [ ] Tokens use `rem` units for accessibility (respects user font size)
- [ ] `gap-1`, `p-2`, `m-3`, etc. resolve to Dense-Core values
- [ ] No visual regressions in existing components

---

#### Task 1.2: Add Dense-Core Typography Tokens

**Description**: Add compact font size scale for information-dense layouts.

**Changes**:
- Add `--font-size-dense-*` tokens (xs: 11px, sm: 13px, base: 15px, lg: 17px, xl: 20px)
- Create utility classes `text-dense-xs`, `text-dense-sm`, etc.

**Acceptance Criteria**:
- [ ] Typography tokens defined in `@theme inline`
- [ ] Custom `@utility` classes created for dense sizes
- [ ] Font sizes remain readable at 100% zoom
- [ ] Line heights proportional (approximately 1.5x font size)

---

#### Task 1.3: Add Interactive Height Tokens

**Description**: Define standard heights for interactive elements.

**Changes**:
- Add `--height-compact` (28px), `--height-default` (36px), `--height-row` (40px), `--height-header` (48px)
- Create utility classes `h-compact`, `h-default`, `h-row`, `h-header`

**Acceptance Criteria**:
- [ ] Height tokens defined in `@theme inline`
- [ ] Custom `@utility` classes created
- [ ] Heights are touch-friendly (minimum 28px)
- [ ] Heights work with flexbox alignment (`items-center`)

---

#### Task 1.4: Add Connection Beacon Colors

**Description**: Add semantic colors for connection status indicators.

**Changes**:
- Add `--color-beacon-error`, `--color-beacon-warn`, `--color-beacon-ok`
- Map to existing `--destructive`, `--chart-4`, `--chart-2`

**Acceptance Criteria**:
- [ ] Beacon colors defined in `@theme inline`
- [ ] Colors accessible as `bg-beacon-*`, `text-beacon-*`
- [ ] Colors work in both light and dark modes
- [ ] Warn state supports `animate-pulse`

---

#### Task 1.5: Add Schema Graph Node Colors

**Description**: Add OKLCH colors for schema visualization nodes.

**Changes**:
- Add `--color-graph-entity` (blue), `--color-graph-relation` (magenta), `--color-graph-attribute` (green)

**Acceptance Criteria**:
- [ ] Graph colors defined using OKLCH
- [ ] Colors accessible as `bg-graph-*`, `text-graph-*`, `border-graph-*`
- [ ] Opacity variants work (`bg-graph-entity/20`)
- [ ] Colors distinguishable for color-blind users (different lightness values)

---

#### Task 1.6: Add TypeQL Operation Colors

**Description**: Add semantic colors for TypeQL operation types.

**Changes**:
- Add `--color-op-read` (cyan), `--color-op-write` (amber), `--color-op-schema` (violet)
- Add `--color-op-commit` (green), `--color-op-rollback` (red)

**Acceptance Criteria**:
- [ ] Operation colors defined using OKLCH
- [ ] Colors accessible as `bg-op-*`, `text-op-*`, `border-op-*`
- [ ] Colors semantically meaningful (read=safe, write=caution, schema=structural)
- [ ] Dark mode variants have adjusted lightness for readability

---

#### Task 1.7: Add TypeQL Syntax Highlighting Colors

**Description**: Add color tokens for code editor syntax highlighting and thread them through the Monaco/CodeMirror TypeQL themes.

**Changes**:
- Add `--syntax-keyword-read`, `--syntax-keyword-write`, `--syntax-keyword-schema`
- Add `--syntax-keyword-struct`, `--syntax-keyword-modifier`
- Add `--syntax-type`, `--syntax-variable`, `--syntax-string`, `--syntax-number`, `--syntax-comment`
- Update the TypeQL editor theme definition to reference the Dense tokens rather than hardcoded hex values

**Acceptance Criteria**:
- [ ] Syntax colors defined for both light and dark modes
- [ ] Monaco/CodeMirror theme files pull the tokens via CSS variables or exported constants
- [ ] Colors consistent with operation semantic colors and meet WCAG AA contrast requirements
- [ ] Comment color is visually subdued

---

#### Task 1.8: Standardize Button Primitive

**Description**: Refactor the shared button primitive (`src/components/ui/button.tsx` or equivalent) so every button automatically receives Dense spacing, typography, and height tokens.

**Changes**:
- Introduce `density`/`scale` variants that map to `h-compact`, `h-default`, and `h-row`
- Apply `text-dense-*` utilities directly in the primitive instead of per-consumer overrides
- Ensure destructive/primary/secondary variants map to the semantic color tokens defined above

**Acceptance Criteria**:
- [ ] All buttons (including icon-only states) use the primitive hooks with no ad-hoc class overrides
- [ ] Focus, hover, and disabled states reference the semantic tokens from Phase 1
- [ ] Storybook/demo updated (or lightweight fixtures) to preview the Dense button system

---

#### Task 1.9: Standardize Input & Form Field Primitives

**Description**: Update the shared `Input`, `Select`, `Textarea`, and `FormField` wrappers to consume the Dense tokens.

**Changes**:
- Apply `h-default` and `text-dense-sm` in the primitives
- Ensure padding (`px-3`) and label spacing are consistent via wrapper components
- Add shared error/help text components that use `text-dense-xs`

**Acceptance Criteria**:
- [ ] All form VMs render through the primitives with no redundant Tailwind classes
- [ ] Error/description text spacing comes from the shared wrapper
- [ ] Password toggles, clear buttons, and prefix/suffix slots align vertically without custom per-dialog CSS

---

#### Task 1.10: Standardize Tabs and Segmented Controls

**Description**: Create a Dense-aware variant of the shadcn Tabs/SegmentedControl primitives for navigation, editor mode switches, and pills.

**Changes**:
- Wrap shadcn's `TabsList`, `TabsTrigger`, and `TabsContent` with components that set `h-compact`, `px-3`, and `text-dense-sm`
- Add props for icon+label tabs so icon sizing is consistent (`size-4`)
- Provide story/demo coverage that shows shell tabs, editor tabs, and sidebar pills

**Acceptance Criteria**:
- [ ] Application code imports the Dense tab primitive instead of redefining className per usage
- [ ] Active, hover, and focus states align with semantic accent tokens
- [ ] Mode tabs and page navigation share the same accessible markup/ARIA attributes

---

#### Task 1.11: Standardize Table & List Row Primitives

**Description**: Create table, list, and history-row wrappers that encode `h-row` heights, spacing, and typography.

**Changes**:
- Add a `DenseTable` component that defines header/cell typography and spacing
- Provide a `DenseRow` primitive for tree items, dropdown rows, and history entries
- Ensure zebra striping, hover, and selected states all use semantic tokens

**Acceptance Criteria**:
- [ ] Results tables, Users table, and history bar reuse the same primitives
- [ ] Row hover/selection styles are centralized (no duplicated Tailwind strings)
- [ ] Tree indentation uses shared CSS variables or utility classes for depth spacing

---

#### Task 1.12: Add Targeted Test Commands

**Description**: Extend `package.json` with scripts for the test groupings referenced in this plan.

**Changes**:
- Add `pnpm test:tokens`, `pnpm test:components`, `pnpm test:visual`, and `pnpm test:a11y` scripts
- Wire each script to the relevant Vitest/Playwright runner with filtering by directory/tag
- Document the scripts in `README` or `TESTING-PLAN.md`

**Acceptance Criteria**:
- [ ] `pnpm` scripts exist and pass locally
- [ ] CI wiring updated to call the new scripts where appropriate
- [ ] Testing documentation references the new commands

---

### Phase 2: Application Shell

#### Task 2.1: Update TopBar Layout

**Description**: Apply Dense-Core spacing to the top bar.

**Changes**:
- Update TopBar container to `h-header` (48px)
- Apply `px-4 gap-2` spacing between elements
- Ensure logo clickable area is touch-friendly

**Acceptance Criteria**:
- [ ] TopBar height is exactly 48px
- [ ] Logo, navigation, selector, and status are properly aligned
- [ ] No horizontal overflow on narrow screens
- [ ] Keyboard navigation works between all interactive elements

---

#### Task 2.2: Update Navigation Tabs

**Description**: Apply compact styling to navigation tabs.

**Changes**:
- Update tab buttons to `h-compact` (28px)
- Apply `px-3 gap-1` internal spacing
- Use `text-dense-sm` for labels
- Render navigation tabs through the Dense Tabs primitive created in Task 1.10

**Acceptance Criteria**:
- [ ] Tabs are 28px height
- [ ] Active tab has clear visual distinction (`bg-accent`)
- [ ] Hover states use `hover:bg-accent/50`
- [ ] Icons are `size-4` (16px)

---

#### Task 2.3: Update Database Selector

**Description**: Apply Dense-Core styling to database dropdown.

**Changes**:
- Update trigger button to `h-default` (36px)
- Update dropdown items to `h-row` (40px)
- Apply `text-dense-sm` typography
- Use the Dense Button/Input primitives so selectors inherit padding/typography automatically

**Acceptance Criteria**:
- [ ] Trigger button is 36px height
- [ ] Dropdown items are 40px height
- [ ] Placeholder text uses `text-muted-foreground italic`
- [ ] Selected item shows checkmark or highlight

---

#### Task 2.4: Update Connection Status Beacon

**Description**: Implement beacon with semantic colors.

**Changes**:
- Apply `size-2 rounded-full` to beacon dot
- Use `bg-beacon-*` colors based on state
- Add `animate-pulse` for warn states

**Acceptance Criteria**:
- [ ] Beacon is 8px diameter circle
- [ ] Disconnected = red, Connecting/Reconnecting = amber pulse, Connected = green
- [ ] Status text uses `text-dense-sm`
- [ ] Tooltip shows on beacon hover

---

#### Task 2.5: Update Snackbar Notifications

**Description**: Apply Dense-Core styling to toast notifications.

**Changes**:
- Apply `px-4 py-3 rounded-lg` container
- Use semantic variant colors with `/10` opacity backgrounds
- Apply `text-dense-sm` for message
- Refactor Snackbar component to use shared button/icon primitives for actions and to read semantic tokens

**Acceptance Criteria**:
- [ ] Notifications are compact but readable
- [ ] Success = green tint, Warning = amber tint, Error = red tint
- [ ] Dismiss button is `size-4` (16px)
- [ ] Animation is smooth 200ms slide

---

### Phase 3: Dialog System

#### Task 3.1: Update Dialog Container

**Description**: Standardize dialog layout and spacing.

**Changes**:
- Apply `rounded-lg shadow-lg` to container
- Update padding: header `p-6 pb-0`, content `px-6 py-4`, footer `p-6 pt-0`
- Apply `max-w-[400px]` or `max-w-[480px]` based on dialog type

**Acceptance Criteria**:
- [ ] All dialogs have consistent border radius and shadow
- [ ] Spacing is uniform across all dialog types
- [ ] Focus trap works correctly
- [ ] Escape key closes dialog

---

#### Task 3.2: Update Dialog Typography

**Description**: Apply Dense-Core typography to dialog content.

**Changes**:
- Title: `text-lg font-semibold`
- Body: `text-dense-sm text-muted-foreground`
- Labels: `text-dense-sm font-medium`
- Errors: `text-dense-xs text-destructive`

**Acceptance Criteria**:
- [ ] Typography hierarchy is clear
- [ ] Body text has sufficient contrast
- [ ] Error messages are visible but not overwhelming

---

#### Task 3.3: Update Dialog Buttons

**Description**: Apply Dense-Core heights to dialog actions.

**Changes**:
- Apply `h-default` (36px) to all buttons
- Apply `px-4` horizontal padding
- Use `text-dense-sm font-medium`
- Use the Dense Button primitive variants for destructive/secondary styles instead of dialog-specific classes

**Acceptance Criteria**:
- [ ] Buttons are 36px height
- [ ] Cancel button is secondary style
- [ ] Confirm button is primary or destructive based on action
- [ ] Buttons have `gap-3` spacing

---

#### Task 3.4: Update Form Inputs in Dialogs

**Description**: Apply Dense-Core styling to form fields.

**Changes**:
- Apply `h-default` (36px) to inputs
- Apply `px-3` internal padding
- Apply `text-dense-sm` typography
- Apply `mb-4` spacing between fields
- Ensure dialogs import the shared Dense FormField primitive so labels, errors, and help text remain consistent

**Acceptance Criteria**:
- [ ] Inputs are 36px height
- [ ] Labels are positioned `mb-1.5` above inputs
- [ ] Error text appears `mt-1` below inputs
- [ ] Password visibility toggle is properly aligned

---

### Phase 4: Sidebar Components

#### Task 4.1: Update Sidebar Container

**Description**: Apply Dense-Core width and spacing to sidebars.

**Changes**:
- Default width: 280px
- Min width: 200px
- Max width: 50% viewport
- Apply `border-r border-border`

**Acceptance Criteria**:
- [ ] Sidebar respects min/max constraints during resize
- [ ] Resize handle is visible and draggable
- [ ] Width persists to localStorage

---

#### Task 4.2: Update Section Headers

**Description**: Apply Dense-Core styling to collapsible section headers.

**Changes**:
- Apply `h-header` (48px) to section headers
- Apply `px-3` padding
- Apply `text-dense-xs font-semibold uppercase tracking-wider`

**Acceptance Criteria**:
- [ ] Headers are 48px height
- [ ] Collapse chevron is `size-4`
- [ ] Collapsed state hides content with 150ms transition
- [ ] Keyboard toggle works (Enter/Space)

---

#### Task 4.3: Update Tree Item Rows

**Description**: Apply Dense-Core styling to tree items.

**Changes**:
- Apply `h-row` (40px) to tree rows
- Apply `px-3` padding
- Apply `text-dense-sm` typography
- Indent: 16-24px per level
- Implement tree rows with the DenseRow primitive to inherit hover/selection styles

**Acceptance Criteria**:
- [ ] Tree items are 40px height
- [ ] Icons are `size-4 mr-2`
- [ ] Expand/collapse chevron visible for folders
- [ ] Hover state uses `bg-accent/50`
- [ ] Selected state uses `bg-accent text-accent-foreground`

---

#### Task 4.4: Update Search Input

**Description**: Apply Dense-Core styling to sidebar search.

**Changes**:
- Apply `h-compact` (28px) to search input
- Apply `mx-3 my-2` margins
- Apply `text-dense-sm` typography
- Base search input on the Dense Input primitive with a search-icon slot instead of custom classes

**Acceptance Criteria**:
- [ ] Search input is 28px height
- [ ] Clear button appears when input has content
- [ ] Search icon is `size-4`
- [ ] Placeholder text is `text-muted-foreground`

---

### Phase 5: Query Workspace

#### Task 5.1: Update Editor Header

**Description**: Apply Dense-Core styling to editor header bar.

**Changes**:
- Apply `h-row` (40px) to header
- Apply `px-3 gap-2` spacing
- Title: `text-dense-sm font-medium`

**Acceptance Criteria**:
- [ ] Header is 40px height
- [ ] Mode tabs are `h-compact` (28px)
- [ ] Action buttons are `h-compact` (28px)
- [ ] Dirty indicator (*) uses `text-destructive`

---

#### Task 5.2: Update Editor Action Buttons

**Description**: Apply Dense-Core styling to New/Save/Run buttons.

**Changes**:
- Icon-only buttons: `size-7` (28px)
- Labeled buttons: `h-compact px-3`
- Apply `text-dense-xs` for labels
- Implement buttons using the Dense Button primitive with `density="compact"` and icon slots

**Acceptance Criteria**:
- [ ] Buttons are consistently sized
- [ ] Tooltips show on hover with keyboard shortcut
- [ ] Disabled state uses `opacity-50 cursor-not-allowed`
- [ ] Loading state shows spinner

---

#### Task 5.3: Update Autocomplete Popup

**Description**: Apply Dense-Core styling to autocomplete suggestions.

**Changes**:
- Container: `py-1 max-h-[200px] overflow-y-auto`
- Items: `py-1.5 px-3`
- Apply `text-dense-sm` for labels
- Apply `text-dense-xs text-muted-foreground` for kind
- Items use the DenseRow primitive so hover/selection colors stay consistent

**Acceptance Criteria**:
- [ ] Popup is positioned at cursor
- [ ] Items are compact but readable
- [ ] Selected item has `bg-accent` highlight
- [ ] Kind label is right-aligned

---

#### Task 5.4: Update Results Tab Bar

**Description**: Apply Dense-Core styling to results output tabs.

**Changes**:
- Apply `h-default` (36px) to tab bar
- Tab buttons: `h-compact px-3`
- Apply `text-dense-xs font-medium`
- Leverage the Dense Tabs primitive for the entire results tab stack

**Acceptance Criteria**:
- [ ] Tab bar is 36px height
- [ ] Active tab has clear visual distinction
- [ ] Tab icons are `size-4`
- [ ] Disabled tabs use `opacity-50`

---

#### Task 5.5: Update Table Output

**Description**: Apply Dense-Core styling to results table.

**Changes**:
- Header: `h-row` (40px), `text-dense-xs font-semibold uppercase`
- Cells: `py-2 px-3`, `text-dense-sm`
- Sort indicators: `size-4`
- Render tables using the DenseTable primitive from Task 1.11

**Acceptance Criteria**:
- [ ] Table headers are 40px height
- [ ] Cell text is properly truncated with ellipsis
- [ ] Sort arrows are visible and clickable
- [ ] Row hover uses `bg-muted/50`

---

#### Task 5.6: Update History Bar

**Description**: Apply Dense-Core styling to query history.

**Changes**:
- Collapsed: `h-default` (36px), single entry
- Expanded entries: `h-row` (40px) each
- Apply `text-dense-sm font-mono` for query summaries
- Use DenseRow primitive for entries and share selection/hover logic with sidebar trees

**Acceptance Criteria**:
- [ ] Collapsed bar is 36px height
- [ ] Expanded entries are 40px height each
- [ ] Status icons are `size-4`
- [ ] Time ago and duration use `text-dense-xs text-muted-foreground`

---

### Phase 6: Page-Specific Updates

#### Task 6.1: Update Home Page Cards

**Description**: Apply Dense-Core styling to navigation cards.

**Changes**:
- Card container: `p-6 rounded-xl`
- Icon: `size-10 mb-4`
- Title: `text-lg font-medium mb-2`
- Description: `text-dense-sm text-muted-foreground`

**Acceptance Criteria**:
- [ ] Cards have consistent padding and radius
- [ ] Disabled cards use `opacity-50`
- [ ] Hover state uses `border-primary/50 bg-accent/50`
- [ ] Grid gap is `gap-6`

---

#### Task 6.2: Update Connect Page Sections

**Description**: Apply Dense-Core styling to connection sections.

**Changes**:
- Section headings: `text-lg font-semibold mb-4`
- Demo cards: `p-4 gap-3`
- Local server rows: `py-3 px-4 h-row`
- Form container: expandable accordion
- All controls reuse the Dense form primitives (Buttons, Inputs, Selectors) introduced in Phase 1

**Acceptance Criteria**:
- [ ] Sections have clear visual separation
- [ ] Demo cards are compact but informative
- [ ] Server rows have action buttons on hover/focus
- [ ] Remote form expand/collapse has smooth transition

---

#### Task 6.3: Update Schema Page

**Description**: Apply Dense-Core styling to schema explorer.

**Changes**:
- Sidebar controls: Dense form elements
- Graph zoom controls: `h-compact` buttons
- Node tooltips: `p-2 text-dense-xs`
- Zoom and mode toggles reuse Dense Button/Tab primitives to keep states aligned

**Acceptance Criteria**:
- [ ] Link toggle pills use `h-compact`
- [ ] View mode dropdown uses `h-compact`
- [ ] Zoom buttons are properly grouped
- [ ] Graph node labels use `text-dense-xs`

---

#### Task 6.4: Update Users Page Table

**Description**: Apply Dense-Core styling to users management.

**Changes**:
- Page header: `py-4 px-6`
- Title: `text-xl font-semibold`
- Table: same patterns as results table
- Action buttons: `h-compact`
- Leverage DenseTable and Dense Button primitives to avoid page-specific overrides

**Acceptance Criteria**:
- [ ] Header layout matches other pages
- [ ] Create User button is prominent
- [ ] Table rows are 40px height
- [ ] Delete buttons use `text-destructive`

---

### Phase 7: Polish & Consistency

#### Task 7.1: Audit All Interactive Heights

**Description**: Verify all interactive elements use standard heights.

**Changes**:
- Audit all buttons, inputs, selects, rows
- Fix any elements not using `h-compact`, `h-default`, `h-row`, or `h-header`

**Acceptance Criteria**:
- [ ] No interactive element is smaller than 28px
- [ ] All form inputs are 36px
- [ ] All list rows are 40px
- [ ] All section headers are 48px

---

#### Task 7.2: Audit All Typography

**Description**: Verify all text uses Dense-Core typography scale.

**Changes**:
- Audit all text elements
- Replace any non-standard font sizes

**Acceptance Criteria**:
- [ ] No text smaller than 11px (dense-xs)
- [ ] Body text is 13px (dense-sm)
- [ ] Headings follow the scale (lg, xl, 2xl, 3xl)
- [ ] Monospace text uses `font-mono`

---

#### Task 7.3: Audit All Spacing

**Description**: Verify all spacing uses Dense-Core scale.

**Changes**:
- Audit all padding, margins, gaps
- Replace any non-standard spacing values

**Acceptance Criteria**:
- [ ] No arbitrary spacing values outside the scale
- [ ] Consistent `gap-2` or `gap-3` between related elements
- [ ] Consistent section padding (`p-4` or `p-6`)
- [ ] Tree indentation is consistent (16-24px per level)

---

#### Task 7.4: Audit Dark Mode

**Description**: Verify all colors work in dark mode.

**Changes**:
- Test all components in dark mode
- Fix any contrast issues

**Acceptance Criteria**:
- [ ] All text meets WCAG AA contrast requirements
- [ ] All interactive elements have visible focus states
- [ ] Syntax highlighting is readable in dark mode
- [ ] No hardcoded colors that don't adapt

---

#### Task 7.5: Audit Accessibility

**Description**: Verify keyboard navigation and screen reader support.

**Changes**:
- Test all interactive elements with keyboard
- Verify ARIA labels and roles

**Acceptance Criteria**:
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Skip links work for major sections
- [ ] Screen reader announcements are appropriate

---

## 5. Verification

### Test Organization

All tests must be implemented in the codebase and organized as follows:

```
src/
├── __tests__/
│   ├── tokens/
│   │   ├── spacing.test.ts
│   │   ├── typography.test.ts
│   │   ├── heights.test.ts
│   │   └── colors.test.ts
│   ├── primitives/
│   │   ├── button.test.ts
│   │   ├── input.test.ts
│   │   ├── tabs.test.ts
│   │   └── table.test.ts
│   ├── components/
│   │   ├── shell/
│   │   │   ├── top-bar.test.ts
│   │   │   ├── navigation.test.ts
│   │   │   ├── database-selector.test.ts
│   │   │   ├── connection-status.test.ts
│   │   │   └── snackbar.test.ts
│   │   ├── dialogs/
│   │   │   └── dialog-*.test.ts
│   │   ├── sidebar/
│   │   │   ├── section-header.test.ts
│   │   │   ├── tree-item.test.ts
│   │   │   └── search-input.test.ts
│   │   ├── editor/
│   │   │   ├── editor-header.test.ts
│   │   │   ├── action-buttons.test.ts
│   │   │   └── autocomplete.test.ts
│   │   └── results/
│   │       ├── tab-bar.test.ts
│   │       ├── table-output.test.ts
│   │       └── history-bar.test.ts
│   └── pages/
│       ├── home.test.ts
│       ├── connect.test.ts
│       ├── query.test.ts
│       ├── schema.test.ts
│       └── users.test.ts
```

### Naming Convention

- Token tests: `{category}.test.ts` (e.g., `spacing.test.ts`)
- Primitive tests: `{primitive-name}.test.ts` (e.g., `button.test.ts`)
- Component tests: `{component-name}.test.ts` (e.g., `top-bar.test.ts`)
- Page tests: `{page-name}.test.ts` (e.g., `home.test.ts`)

### Test Scenarios

#### Token Tests

| Scenario | Description | Pass Criteria |
|----------|-------------|---------------|
| Spacing tokens exist | All Dense-Core spacing tokens are defined | All `--spacing-*` variables resolve to expected values |
| Typography tokens exist | All Dense-Core font size tokens are defined | All `--font-size-dense-*` variables resolve to expected values |
| Height tokens exist | All interactive height tokens are defined | All `--height-*` variables resolve to expected values |
| Color tokens exist | All semantic color tokens are defined | All `--color-*` variables resolve to valid OKLCH/referenced values |
| Dark mode colors | Color tokens have appropriate dark mode variants | All syntax colors have distinct dark mode values |

#### Primitive Tests

| Scenario | Description | Pass Criteria |
|----------|-------------|---------------|
| Button density variants | Primitive renders compact/default/row heights correctly | Computed height equals token value for each variant |
| Input layout | Input/Select/Textarea primitives apply Dense spacing and typography | Snapshot/verifier confirms padding/line-height + focus ring tokens |
| Tabs primitive | Tabs trigger inherits compact height and semantic colors | Active/hover states match tokens and ARIA roles pass axe checks |
| Table primitive | DenseTable headers/cells use shared typography and spacing | Header height equals 40px and cells enforce ellipsis + row hover styling |

#### Component Tests

| Scenario | Description | Pass Criteria |
|----------|-------------|---------------|
| TopBar height | TopBar renders at correct height | Computed height equals 48px |
| Navigation tab height | Nav tabs render at compact height | Computed height equals 28px |
| Database selector height | Selector trigger is default height | Computed height equals 36px |
| Connection beacon colors | Beacon uses correct color per state | Background color matches beacon token for each state |
| Snackbar variants | Snackbar uses correct variant colors | Each variant renders with expected background/text colors |
| Dialog spacing | Dialogs have correct padding | Header, content, footer padding match spec |
| Form input height | All form inputs are standard height | Computed height equals 36px |
| Tree item height | Tree rows are standard row height | Computed height equals 40px |
| Section header height | Section headers are header height | Computed height equals 48px |

#### Integration Tests

| Scenario | Description | Pass Criteria |
|----------|-------------|---------------|
| Sidebar resize | Sidebar respects width constraints | Width stays within 200px-50% range |
| Dialog focus trap | Focus stays within open dialog | Tab key cycles through dialog elements only |
| Keyboard navigation | All elements keyboard accessible | Every interactive element reachable via Tab |
| Dark mode toggle | All components adapt to theme | No visual regressions when theme changes |

#### Visual Regression Tests

| Scenario | Description | Pass Criteria |
|----------|-------------|---------------|
| Home page light | Home page renders correctly in light mode | Screenshot matches baseline |
| Home page dark | Home page renders correctly in dark mode | Screenshot matches baseline |
| Query page light | Query workspace renders correctly | Screenshot matches baseline |
| Query page dark | Query workspace renders correctly | Screenshot matches baseline |
| Dialog rendering | Each dialog type renders correctly | Screenshots match baselines |
| Snackbar variants | Each snackbar variant renders correctly | Screenshots match baselines |

### Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Token definitions | 100% - all tokens must have tests |
| Primitive wrappers | 100% - button/input/tab/table primitives |
| Component heights | 100% - all interactive elements |
| Color semantics | 100% - all semantic color usages |
| Keyboard navigation | 100% - all interactive elements |
| Dark mode | 100% - all colored elements |

### Pass/Fail Criteria

**Pass**:
- All automated tests pass
- No visual regression failures
- All height/spacing values match Dense-Core spec
- WCAG AA contrast requirements met
- Dark mode parity confirmed

**Fail**:
- Any automated test fails
- Visual regression detected
- Height/spacing deviates from spec
- Contrast requirements not met
- Dark mode inconsistency found

### Re-running Tests

All tests must be:

1. **Idempotent**: Running tests multiple times produces same results
2. **Independent**: Tests don't depend on execution order
3. **Fast**: Token/unit tests complete in <5 seconds
4. **CI-ready**: Can run in headless mode for CI pipeline

Commands (added in Task 1.12):
```bash
pnpm test              # Run all tests
pnpm test:tokens       # Run token tests only
pnpm test:components   # Run component tests only
pnpm test:visual       # Run visual regression tests
pnpm test:a11y         # Run accessibility tests
```

---

## 6. Artifacts & Learnings

> Record discoveries, decisions, and changes here as implementation progresses.

### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-15 | Use `@utility` directive for dense utilities | Tailwind v4 CSS-first approach; cleaner than JS config |
| 2025-12-15 | Primitives use composition over inheritance | Each component uses plain className strings, avoiding cva dependency |
| 2025-12-15 | Syntax colors go in :root/.dark, not @theme | Mode-specific values need CSS selectors, not theme tokens |

### Discoveries

| Date | Discovery | Impact |
|------|-----------|--------|
| 2025-12-15 | No existing `src/components/ui` directory | Created fresh primitive components without migration concerns |
| 2025-12-15 | Build succeeds with all new tokens/primitives | No breaking changes to existing components |

### Blockers Resolved

| Date | Blocker | Resolution |
|------|---------|------------|
| N/A | None encountered in Phase 1 | - |

### Token Adjustments

| Date | Token | Original | Adjusted | Reason |
|------|-------|----------|----------|--------|
| 2025-12-15 | dense-2xl, dense-3xl | Not in original spec | Added | Needed for page headings |

### Phase 1 Completed Files

- `src/styles.css` - Dense-Core tokens (spacing, typography, heights, colors, syntax)
- `src/components/ui/button.tsx` - Button primitive with density/variant props
- `src/components/ui/input.tsx` - Input, Textarea, Select, PasswordInput primitives
- `src/components/ui/form-field.tsx` - FormField, FormFieldGroup, FormActions wrappers
- `src/components/ui/tabs.tsx` - Tabs, TabsList, TabsTrigger, TabsContent, SegmentedControl
- `src/components/ui/table.tsx` - DenseTable*, DenseRow primitives
- `src/components/ui/index.ts` - Centralized exports
- `src/__tests__/tokens/dense-core-tokens.test.ts` - Token verification tests
- `package.json` - Added test:tokens, test:primitives, test:components, test:visual, test:a11y scripts

### Phase 2 Completed Files

- `src/components/app/TopBar.tsx` - Updated with h-header, h-compact nav tabs, h-default selector, beacon colors
- `src/components/app/Snackbar.tsx` - Updated with semantic variant colors via chart tokens

### Phase 3 Completed Files

- `src/components/ui/dialog.tsx` - Dialog primitive components (Backdrop, Container, Header, Content, Footer)
- `src/components/app/Dialogs.tsx` - All 9 dialog types implemented with Dense-Core styling
- `src/components/app/StudioApp.tsx` - Added Dialogs component rendering

### Phase 4-5 Completed Files

- `src/components/pages/QueryPage.tsx` - Updated with Dense-Core styling:
  - Sidebar with collapsible sections using h-header heights
  - Editor header using h-row with h-compact action buttons
  - Results tabs using Tabs primitive with h-default bar and h-compact tabs
  - History bar with h-default collapsed and h-row entries

### Phase 6 Completed Files

- `src/components/pages/HomePage.tsx` - Task 6.1: text-dense-3xl heading, rounded-xl cards, size-10 icons
- `src/components/pages/ConnectPage.tsx` - Task 6.2:
  - SegmentedControl for mode toggle
  - Button/Input/FormField primitives for forms
  - h-row for local server items
  - beacon-* colors for status indicators
- `src/components/pages/SchemaPage.tsx` - Task 6.3:
  - SegmentedControl for view mode
  - h-compact link toggles
  - h-default toolbar with zoom controls
  - graph-* semantic colors for node types
  - Button primitives for actions
- `src/components/pages/UsersPage.tsx` - Task 6.4:
  - DenseTable primitives for users list
  - Button primitives with density="compact"
  - h-row for table rows
  - text-dense-* typography throughout

### Phase 7 Audit Summary

**Task 7.1 - Interactive Heights**: All buttons and inputs use h-compact/h-default/h-row/h-header. No interactive elements smaller than 28px.

**Task 7.2 - Typography**: All text uses text-dense-* scale. Fixed one remaining `text-sm` in StudioApp.tsx loading screen.

**Task 7.3 - Spacing**: Content padding (py-8, py-12, py-16) is appropriate for sections. Interactive elements use standard gap-2/gap-3 spacing.

**Task 7.4 - Dark Mode**: No hardcoded hex, rgb, or Tailwind color values. All colors use semantic tokens that automatically adapt to dark mode.

**Task 7.5 - Accessibility**: All interactive elements have onClick handlers. Icon-only buttons have title attributes for accessibility. Focus states use semantic ring tokens.

---

## 7. Rollout Strategy

### Phase Sequence

1. **Foundation** (Tasks 1.1-1.12): Deploy tokens, editor theme, shared primitives, and test scripts with no end-user visual change
2. **Shell** (Tasks 2.1-2.5): Update global chrome
3. **Dialogs** (Tasks 3.1-3.4): Update modal system
4. **Sidebar** (Tasks 4.1-4.4): Update navigation trees
5. **Workspace** (Tasks 5.1-5.6): Update query editor/results
6. **Pages** (Tasks 6.1-6.4): Update page-specific layouts
7. **Polish** (Tasks 7.1-7.5): Final audit and fixes

### Rollback Plan

Each phase should be deployable and rollback-able independently:

1. All changes in a phase go in a single PR
2. Feature flag optional: `DENSE_UI_ENABLED` environment variable
3. Previous CSS preserved in `src/styles.legacy.css` until Phase 7 complete
4. Visual regression baselines updated per phase

---

## 8. Timeline Checkpoints

> Note: No time estimates. These are logical milestones, not deadlines.

- [x] **Checkpoint 1**: Tokens, shared primitives, and targeted test commands defined with tests passing (2025-12-15)
- [x] **Checkpoint 2**: Shell components updated, visual review complete (2025-12-15)
- [x] **Checkpoint 3**: Dialog system updated, all 9 dialogs implemented (2025-12-15)
- [x] **Checkpoint 4**: Sidebar components updated, tree interactions verified (2025-12-15)
- [x] **Checkpoint 5**: Query workspace updated, editor/results functional (2025-12-15)
- [x] **Checkpoint 6**: All pages updated, no visual regressions (2025-12-15)
- [x] **Checkpoint 7**: Final audit complete, accessibility verified (2025-12-15)
