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

---

## Color Palette & Theming

Our application supports both light and dark themes. All colors **must** be applied using the CSS variables defined in `src/css/main.css`. This is critical for ensuring components adapt correctly to theme changes.

### Light Theme Palette

| Variable | Value | Description |
| :--- | :--- | :--- |
| `--color-bg` | `#fafaf9` | Main page background |
| `--color-card-bg` | `white` | Card and modal backgrounds |
| `--color-text-header` | `#292524` | Primary headers |
| `--color-text-primary` | `#44403c` | Main text color |
| `--color-text-secondary` | `#57534e` | Secondary text, subtitles |
| `--color-text-muted` | `#78716c` | Muted text, placeholders |
| `--color-border` | `#e7e5e4` | Borders for cards, dividers |
| `--color-score` | `#d97706` | Score text, highlight elements |
| `--color-button-primary-bg` | `#4f46e5` | Primary action buttons |
| `--color-button-secondary-bg` | `#0d9488` | Secondary action buttons |
| `--color-button-danger-bg` | `#dc2626` | Destructive action buttons |

### Dark Theme Palette

| Variable | Value | Description |
| :--- | :--- | :--- |
| `--color-bg` | `#1c1917` | Main page background |
| `--color-card-bg` | `#292524` | Card and modal backgrounds |
| `--color-text-header` | `#f5f5f4` | Primary headers |
| `--color-text-primary` | `#d6d3d1` | Main text color |
| `--color-text-secondary` | `#a8a29e` | Secondary text, subtitles |
| `--color-text-muted` | `#78716c` | Muted text, placeholders |
| `--color-border` | `#44403c` | Borders for cards, dividers |
| `--color-score` | `#fcd34d` | Score text, highlight elements |
| `--color-button-primary-bg` | `#4f46e5` | Primary action buttons |
| `--color-button-secondary-bg` | `#0d9488` | Secondary action buttons |
| `--color-button-danger-bg` | `#dc2626` | Destructive action buttons |

---

## TypeScript Component Structure

To maintain consistency across the codebase, all React components should follow this general structure:

1.  **Imports:** Start with all necessary imports from React, other libraries, and local files.
2.  **Type/Interface Definitions:** Define `Props` and any other component-specific types.
3.  **Component Function:** The main component function.
4.  **Internal Logic Order:** Inside the component, the order of operations should be:
    a. Context Hooks (`useAppContext`)
    b. State Hooks (`useState`)
    c. Refs (`useRef`)
    d. Other Hooks (`useEffect`, `useMemo`, `useCallback`)
    e. Event Handlers and other functions.
    f. The `return` statement with the JSX.
5.  **Default Export:** End the file with `export default ComponentName;`.

### Example Structure

```typescript
// 1. Imports
import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import './MyComponent.css';

// 2. Type Definitions
interface MyComponentProps {
  title: string;
}

// 3. Component Function
const MyComponent = ({ title }: MyComponentProps) => {
  // 4a. Context Hooks
  const { appData } = useAppContext();

  // 4b. State Hooks
  const [isActive, setIsActive] = useState(false);

  // 4d. Other Hooks
  const formattedTitle = useMemo(() => {
    return title.toUpperCase();
  }, [title]);

  // 4e. Event Handlers
  const handleClick = () => {
    setIsActive(!isActive);
  };

  // 4f. Return JSX
  return (
    <div className="my-component">
      <h2 className="my-component__title">{formattedTitle}</h2>
      <button onClick={handleClick} className="my-component__button">
        Toggle
      </button>
    </div>
  );
};

// 5. Default Export
export default MyComponent;
```