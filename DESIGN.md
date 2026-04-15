# Design System Strategy: The Digital Curator

 

## 1. Overview & Creative North Star

This design system is built upon the "Creative North Star" of **The Digital Curator**. It is a visual language that lives at the intersection of a heritage archive and a high-tech laboratory. We are moving away from the "disposable web" and toward a permanent, editorial experience that feels both organic and synthesized.

 

To achieve this, we reject the standard "grid-of-boxes" layout. Instead, we embrace **Intentional Asymmetry** and **Tonal Depth**. By layering surfaces of varying "weights" and using high-contrast typography scales, we create an interface that feels like a curated collection of specimens rather than a generic software application. Every element must feel heavy, intentional, and permanent.

 

---

 

## 2. Colors & Tonal Architecture

The palette is rooted in the tension between the organic `surface` (#fbf9f3) and the synthetic `primary` (#022448).

 

*   **The "No-Line" Rule:** We strictly prohibit the use of 1px solid borders for sectioning or containment. Boundaries must be defined solely through background color shifts. Use `surface_container_low` (#f5f3ee) for large secondary sections and `surface_container` (#f0eee8) for nested utility areas.

*   **Surface Hierarchy & Nesting:** Treat the UI as a physical stack. The base of the application is `surface`. To draw the eye inward, nest elements using `surface_container_low`. To bring an element "closer" to the user, use `surface_container_lowest` (#ffffff). This creates a soft, tactile depth that feels like layered vellum.

*   **The "Glass & Gradient" Rule:** Floating elements (modals, menus, or overlays) must use Glassmorphism. Apply `surface_variant` (#e4e2dd) at 60% opacity with a `12px` backdrop-blur. 

*   **Signature Textures:** For high-impact CTAs, do not use flat colors. Use a **135-degree linear gradient** starting from `primary` (#022448) to `primary_container` (#1e3a5f). This provides a "liquid ink" depth that communicates premium authority.

 

---

 

## 3. Typography: The Modern Archive

We utilize two distinct voices to represent the "Synthetic Naturalist" identity.

 

*   **The Archive Voice (Public Sans):** Used for `display`, `headline`, `title`, and `body`. Public Sans provides a neutral, authoritative, and timeless foundation. Use high-contrast sizing (e.g., `display-lg` at 3.5rem) against `body-md` to create an editorial rhythm.

*   **The Synthetic Voice (Work Sans):** Reserved exclusively for `label` and technical data. This font must be set in **UPPERCASE** with a letter-spacing (tracking) of **0.05rem to 0.1rem**. This communicates precision, as if the data were being stamped onto an archival specimen card by a machine.

 

---

 

## 4. Elevation & Depth

Traditional drop shadows are forbidden. We define depth through **Tonal Layering** and **Ambient Light**.

 

*   **The Layering Principle:** Softness is strength. Place a `surface_container_lowest` card on a `surface_container_low` background to create a "natural lift." The lack of a border forces the user to perceive depth through color value alone.

*   **Ambient "Natural Ink" Shadows:** When an element must float (e.g., a primary action button or a glass modal), use an ultra-diffused shadow. 

    *   **Blur:** 32px – 64px.

    *   **Opacity:** 6% – 10%.

    *   **Color:** Tint the shadow with `primary` (#022448) rather than pure black. This mimics the way ink bleeds into paper, creating a "Natural Ink" effect.

*   **The "Ghost Border" Fallback:** If a layout absolutely requires a boundary for accessibility, use a "Ghost Border." Use the `outline_variant` (#c4c6cf) token at **15% opacity**. It should be felt, not seen.

 

---

 

## 5. Components

 

### Buttons & Interaction

*   **Primary CTA:** `rounded-full` (9999px). Background: 135deg gradient (`primary` to `primary_container`). Label: `label-md` in `on_primary` (#ffffff).

*   **Secondary/Tertiary:** `rounded-full`. Use `surface_container_high` (#eae8e2) for the container. Text should be `primary`.

*   **Shapes:** All buttons must be `rounded-full`. All cards and containers must be **Squircles** (`md` / 1.5rem / 24px).

 

### Cards & Lists

*   **Containers:** Use the squircle shape with `surface_container_low`. 

*   **The "No-Divider" Rule:** In lists, do not use horizontal lines. Separate items using `16px` or `24px` of vertical white space or by alternating background tones between `surface` and `surface_container_low`.

*   **Chips:** Use `secondary` (#006a68) with `on_secondary` (#ffffff) for active states. Use `rounded-full` exclusively.

 

### Inputs & Forms

*   **Fields:** Background should be `surface_container_highest` (#e4e2dd). No bottom border. Use `md` (24px) squircle corners.

*   **Labels:** Always use the "Synthetic Voice" (Work Sans, Uppercase, Tracked).

 

---

 

## 6. Do's and Don'ts

 

### Do:

*   **Do** use extreme white space. Let the parchment-toned `surface` breathe.

*   **Do** overlap elements. Let a glassmorphic card partially obscure a headline to create a sense of physical layers.

*   **Do** use `secondary` (Oxidized Teal) sparingly as a "scientific highlight" for data visualizations or status indicators.

 

### Don't:

*   **Don't** use 1px solid borders. This is the quickest way to break the "Digital Curator" aesthetic.

*   **Don't** use standard grey shadows. They feel "dirty" against the `surface` parchment tone.

*   **Don't** use Public Sans for technical labels. It lacks the "synthetic" precision required for data.

*   **Don't** use sharp 90-degree corners. Everything must feel tumbled, organic, and worn smooth.