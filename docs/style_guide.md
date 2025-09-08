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
-   **Avoid Nesting:** Avoid deep nesting in CSS. A flat structure using BEM classes is preferred.

### 4. Inline Styles

-   **Forbidden:** Inline `style` attributes (`<div style={{ color: 'red' }}>`) are strictly forbidden for static styling. They are difficult to override and violate the separation of concerns.
-   **Exception:** The only acceptable use for inline styles is for dynamic properties that cannot be known ahead of time (e.g., setting `top` and `left` for a context menu based on mouse coordinates).

### 5. Color Palette & Variables

-   **Use CSS Variables:** Always use the defined CSS variables for colors, shadows, and other themeable properties. This is crucial for our light/dark theme implementation.
-   **Location:** Variables are defined at the root of `src/css/main.css`.
    -   Example: `color: var(--color-text-primary);`, `background-color: var(--color-card-bg);`