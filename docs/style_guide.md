# Style Guide

This document outlines the styling conventions and CSS methodology for the Umamusume Parent Tracker application. Adhering to these guidelines ensures our codebase remains consistent, maintainable, and scalable.

## CSS Methodology

We use a component-based approach to styling, heavily influenced by the **BEM (Block, Element, Modifier)** naming convention.

### 1. File Structure

-   **One Component, One CSS File:** Every React component that requires unique styles should have its own corresponding `.css` file in the same directory (e.g., `SettingsModal.tsx` and `SettingsModal.css`).
-   **Global Imports:** Component CSS files should be imported into `src/index.css` to be included in the final build.

### 2. BEM Naming Convention

BEM provides a structured, semantic way to name CSS classes, which helps avoid style conflicts and makes the relationship between markup and styles clear.

-   **Block:** The outermost parent element of a component. This is the component's name.
    -   Example: `.settings-modal`, `.card`, `.header`

-   **Element:** A part of a block that has no standalone meaning. Elements are delimited by two underscores (`__`).
    -   Example: `.settings-modal__option`, `.card__title`, `.header__actions`

-   **Modifier:** A flag on a block or element used to change its appearance or state. Modifiers are delimited by two hyphens (`--`).
    -   Example: `.settings-modal__option--selected`, `.card--important`, `.button--danger`

**Putting it all together:**

```html
<!-- BEM structure for a card component -->
<div class="card card--highlighted">
  <h2 class="card__title">Top Breeding Pair</h2>
  <div class="card__body">
    ...
  </div>
</div>
```

### 3. Selectors and Specificity

-   **Classes Only:** Use classes exclusively for styling. This keeps specificity low and predictable.
-   **Avoid ID Selectors:** Do **not** use ID selectors (e.g., `#my-id`) for styling. They have high specificity and can make overriding styles difficult. IDs should only be used for JavaScript hooks or fragment identifiers.
-   **Avoid Nesting:** Avoid deep nesting in CSS. A flat structure using BEM classes is preferred. A maximum nesting level of 1 is acceptable for pseudo-classes (e.g., `.button:hover`).

### 4. Inline Styles

-   **Forbidden:** Inline `style` attributes (`<div style={{ color: 'red' }}>`) are strictly forbidden for static styling. They are difficult to override and violate the separation of concerns.
-   **Exception:** The only acceptable use for inline styles is for dynamic properties that cannot be known ahead of time (e.g., setting `top` and `left` for a context menu based on mouse coordinates).

## Color Palette & Theming

Our application supports both a light and a dark theme. The entire color system is managed through CSS variables defined in `src/css/main.css`.

### 1. Using CSS Variables

**Always** use the defined CSS variables for colors, shadows, and other themeable properties. This is crucial for our light/dark theme implementation.

-   **Correct:** `color: var(--color-text-primary);`
-   **Incorrect:** `color: #44403c;`

### 2. Light & Dark Mode Design

When creating or modifying components, you must verify they look correct in both themes. The use of CSS variables should handle most cases, but pay special attention to:

-   **Contrast:** Ensure text is easily readable against its background. Use `--color-text-primary` for main text, `--color-text-secondary` for supporting text, and `--color-text-muted` for hints.
-   **Backgrounds:** Use `--color-bg` for the main page background and `--color-card-bg` for elevated surfaces like cards and modals. Use `--color-card-bg-hover` for hover states.
-   **Borders:** Use `--color-border` for standard borders and `--color-border-input` for form inputs. Use `--color-border-active` for focused or selected states.

### 3. Core Color Variables

The following table documents the primary color variables and their intended use.

| Variable Name                 | Light Theme Value (Stone/Amber) | Dark Theme Value (Stone/Amber) | Usage                                            |
| :---------------------------- | :------------------------------ | :----------------------------- | :----------------------------------------------- |
| `--color-bg`                  | `#fafaf9` (stone-50)            | `#1c1917` (stone-900)           | Main page background                             |
| `--color-card-bg`             | `white`                         | `#292524` (stone-800)           | Cards, modals, dropdowns                         |
| `--color-card-bg-hover`       | `#f5f5f4` (stone-100)           | `#44403c` (stone-700)           | Hover states for cards, list items               |
| `--color-text-header`         | `#292524` (stone-800)           | `#f5f5f4` (stone-100)           | Main page and modal titles                       |
| `--color-text-primary`        | `#44403c` (stone-700)           | `#d6d3d1` (stone-300)           | Primary text content                             |
| `--color-text-secondary`      | `#57534e` (stone-600)           | `#a8a29e` (stone-400)           | Secondary text, descriptions                     |
| `--color-text-muted`          | `#78716c` (stone-500)           | `#78716c` (stone-500)           | Muted text, placeholders, hints                  |
| `--color-text-link`           | `#4f46e5` (indigo-600)          | `#818cf8` (indigo-400)          | Hyperlinks                                       |
| `--color-text-danger`         | `#dc2626` (red-600)             | `#f87171` (red-400)             | Destructive action text (e.g., "Delete")         |
| `--color-border`              | `#e7e5e4` (stone-200)           | `#44403c` (stone-700)           | Standard borders, dividers                       |
| `--color-border-input`        | `#d6d3d1` (stone-300)           | `#57534e` (stone-600)           | Form input borders                               |
| `--color-border-active`       | `#6366f1` (indigo-500)          | `#818cf8` (indigo-400)          | Focused inputs, selected items                   |
| `--color-button-primary-bg`   | `#4f46e5` (indigo-600)          | `#4f46e5` (indigo-600)          | Primary action buttons                           |
| `--color-button-danger-bg`    | `#dc2626` (red-600)             | `#dc2626` (red-600)             | Destructive action buttons                       |
| `--color-score`               | `#d97706` (amber-600)           | `#fcd34d` (amber-400)           | Score text, important highlights                 |