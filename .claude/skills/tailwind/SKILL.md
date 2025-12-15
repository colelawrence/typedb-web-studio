---
name: tailwind-v4
description: Tailwind CSS v4 styling for this project. Use when writing or modifying component styles, CSS classes, or theme configuration. Provides the project's semantic color system and v4-specific patterns.
---

# Tailwind CSS v4 Styling

This project uses Tailwind CSS v4 with CSS-first configuration. All theme customization is in `src/styles.css` using `@theme inline`.

## Project Color System

Always prefer semantic colors over raw Tailwind colors. These automatically adapt to dark mode.

### Core Semantic Tokens

| Token | Usage | Class Examples |
|-------|-------|----------------|
| `background` / `foreground` | Page background, main text | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | Card surfaces | `bg-card`, `text-card-foreground` |
| `popover` / `popover-foreground` | Dropdowns, tooltips | `bg-popover`, `text-popover-foreground` |
| `primary` / `primary-foreground` | Primary actions, CTAs | `bg-primary`, `text-primary-foreground` |
| `secondary` / `secondary-foreground` | Secondary actions | `bg-secondary`, `text-secondary-foreground` |
| `muted` / `muted-foreground` | Subdued backgrounds, secondary text | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | Highlights, hover states | `bg-accent`, `text-accent-foreground` |
| `destructive` / `destructive-foreground` | Danger, delete actions | `bg-destructive`, `text-destructive` |
| `border` | Default border color | `border-border` |
| `input` | Form input borders | `border-input` |
| `ring` | Focus rings | `ring-ring` |

### Sidebar Colors
Within sidebar components: `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, `sidebar-border`, `sidebar-ring`

### Chart Colors
For data visualization: `chart-1` through `chart-5`

## Styling Patterns

### Semantic Over Raw Colors

```tsx
// GOOD - uses semantic colors, works with dark mode
className="bg-card border-border text-muted-foreground hover:bg-accent"

// AVOID - hardcoded colors don't adapt to theme
className="bg-white border-gray-200 text-gray-500 hover:bg-gray-100"
```

### Opacity Modifiers

Use `/opacity` syntax (NOT deprecated `bg-opacity-*`):

```tsx
className="bg-primary/50 border-border/30 text-foreground/80"
```

### Common Component Patterns

**Button:**
```tsx
className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
```

**Interactive Card:**
```tsx
className="bg-card border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors"
```

**Navigation Item:**
```tsx
className={isActive
  ? "bg-accent text-accent-foreground"
  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
}
```

**Status Badges:**
```tsx
// Success
className="bg-green-500/10 text-green-600 border-green-500/30"
// Warning
className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
// Info
className="bg-blue-500/10 text-blue-600 border-blue-500/30"
```

## Tailwind v4 Specifics

### Deprecated Patterns to Avoid

| Deprecated | Use Instead |
|------------|-------------|
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `bg-opacity-50` | `bg-color/50` |
| `text-opacity-50` | `text-color/50` |
| `flex-grow` / `flex-shrink` | `grow` / `shrink` |
| `shadow-sm` | `shadow-xs` |
| `rounded-sm` | `rounded-xs` |
| `bg-gradient-*` | `bg-linear-*` |
| `@layer utilities` | `@utility` |

### v4 Features

**Container Queries:**
```tsx
<div className="@container">
  <div className="p-4 @lg:p-8 @xl:grid-cols-2">
```

**3D Transforms:**
```tsx
className="perspective-1000 rotate-x-12 transform-3d"
```

**Enhanced Gradients:**
```tsx
className="bg-linear-45 from-primary to-accent"
className="bg-radial from-primary via-secondary to-accent"
```

**New Variants:**
```tsx
className="@starting-style:opacity-0 opacity-100 transition-opacity"
className="not-hover:opacity-50"
className="nth-odd:bg-muted"
```

## Border Radius

Project-defined computed values:
- `rounded-sm` = `calc(var(--radius) - 4px)`
- `rounded-md` = `calc(var(--radius) - 2px)`
- `rounded-lg` = `var(--radius)` (0.625rem)
- `rounded-xl` = `calc(var(--radius) + 4px)`

## Dark Mode

Dark mode uses `.dark` class on parent. Semantic colors auto-adapt—no `dark:` variants needed:

```tsx
// Works in both light and dark mode automatically
className="bg-background text-foreground border-border"
```

## Reference Files

- Theme configuration: `src/styles.css`
- Complete utility reference: [UTILITIES.md](UTILITIES.md)
