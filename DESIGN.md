# Design System Strategy: The Synthetic Naturalist

 

## 1. Overview & Creative North Star

**Creative North Star: The Digital Specimen Archive**

 

This design system is built at the intersection of 18th-century botanical journals and futuristic laboratory interfaces. It rejects the "app-like" sterility of modern SaaS in favor of a high-end editorial experience. We achieve this through "The Digital Specimen" approach: treating content as precious artifacts laid out on a physical surface. 

 

To break the "template" look, designers must embrace **intentional asymmetry**. Avoid perfectly centered grids; instead, let narrative text breathe in wide margins while technical data clusters in high-density modules. Overlap images across background shifts to create a sense of tactile depth, ensuring the UI feels like a curated exhibition rather than a standard software interface.

 

---

 

## 2. Colors & Surface Logic

The palette is a dialogue between the organic (`Warm Parchment`) and the synthetic (`Deep Navy` & `Oxidized Teal`).

 

### The "No-Line" Rule

**Borders are strictly prohibited for sectioning.** To define space, you must use tonal shifts between surface tokens.

*   **Sectioning:** Transition from `surface` (#faf8f2) to `surface_container_low` to mark a change in content.

*   **Depth:** Use `surface_container` for nested modules. The eye should perceive a change in "paper weight" or "material depth" rather than a stroke.

 

### Surface Hierarchy & Nesting

Treat the UI as a series of stacked, fine-milled papers:

1.  **Base Layer:** `surface` (The parchment canvas).

2.  **Structural Zones:** `surface_container_low` (Subtle indentations for grouping).

3.  **Active Modules:** `surface_container_highest` (The most prominent content "cards").

 

### The Glass & Gradient Rule

For elements that exist "above" the page (modals, floating menus, navigation bars), use **Glassmorphism**:

*   **Fill:** `surface_variant` at 60% opacity.

*   **Effect:** `backdrop-blur: 12px`.

*   **CTA Soul:** For primary actions, use a subtle linear gradient from `primary` (#1e3a5f) to a supporting shade at a 135-degree angle. This adds a "lithographic" ink depth that flat hex codes cannot replicate.

 

---

 

## 3. Typography

The system utilizes a dual-personality typographic scale to distinguish between narrative storytelling and technical observation, emphasizing clarity and modern precision.

 

*   **Public Sans (The Modern Archive):** Used for all `headline` and `body` roles. This sans-serif provides a contemporary, clear entry point to sections and maintains high legibility for long-form narrative content, moving away from traditional serifs for a cleaner digital aesthetic.

*   **Work Sans (The Synthetic):** Used for all `label` roles and technical data. This grotesque sans-serif represents the "Synthetic"—precise, engineered, and functional.

    *   *Usage:* Always use `label-md` or `label-sm` in uppercase with +5% letter-spacing when denoting categories or metadata.

 

---

 

## 4. Elevation & Depth

In this system, elevation is a product of light and material, not CSS shadows.

 

*   **The Layering Principle:** Depth is achieved by placing `surface_container_lowest` elements onto `surface_dim` backgrounds. The contrast creates a natural "lift."

*   **Ambient Shadows:** If a floating element requires a shadow (e.g., a dropdown), use a "Natural Ink" shadow: `box-shadow: 0 12px 32px rgba(30, 58, 95, 0.06)`. This uses a Navy tint rather than Grey to maintain the color story.

*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline_variant` at **15% opacity**. This should feel like a faint pencil mark, not a digital line.

*   **Pill-Shaped Squircles:** All containers must use the **Maximum** (roundedness: 3) setting, applied as **Squircles** (continuous curvature) to mimic smooth river stones or high-tech molded components.

 

---

 

## 5. Components

 

### Buttons

*   **Primary:** `primary` background, `on_primary` (Public Sans, Bold). Maximum-radius pill shape.

*   **Secondary:** `surface_container_highest` background with `on_surface` text. No border.

*   **Tertiary:** `Work Sans` uppercase label with an `Oxidized Teal` underline (2px) that expands on hover.

 

### Input Fields

*   **Styling:** No bottom line or box. Use `surface_container_low` as a subtle recessed block. 

*   **Labels:** Use `Work Sans` (label-sm) positioned top-left, floating outside the input area.

 

### Cards & Lists

*   **The No-Divider Rule:** Explicitly forbid `

` tags or `border-bottom`.



*   **Separation:** We utilize **Normal Spacing** (spacing: 2) to maintain a professional, balanced density. Use vertical whitespace or a toggle between `surface` and `surface_container_low` backgrounds for separation.

*   **Specimen Chips:** Use `secondary_container` (#2ca6a4) with `on_secondary_container` text. These should look like small, synthetic tags pinned to a page.

 

### Floating Navigation (The "Specimen Bar")

A bottom-docked navigation bar using the Glassmorphism rule (`backdrop-blur`) and a `surface_variant` semi-transparent fill. Icons should be thin-stroke (1px) to match the technical precision of Work Sans.

 

---

 

## 6. Do’s and Don’ts

 

### Do:

*   **Do** embrace the clean look of Public Sans across both headers and body text for a unified, modern-scholarly feel.

*   **Do** use asymmetrical margins. Allow the narrative text to be offset to the left or right to create white space for "marginalia" (technical notes).

*   **Do** use `Oxidized Teal` (#2ca6a4) sparingly as a "highlighter" for interactive technical data.

 

### Don't:

*   **Don't** use pure black (#000000) for text. Use `on_surface` to maintain the "ink-on-parchment" softness.

*   **Don't** use standard "Drop Shadows" from component libraries. If it doesn't look like ambient light hitting paper, it’s too heavy.

*   **Don't** use sharp or moderate corners. The system requires the smoothness of **maximum roundedness** to bridge the gap between organic soft stones and ergonomic technology.