# Orbit EMS — visual research notes

Research was completed before implementation. These pages were reviewed for design direction, not copied as templates or product requirements.

## Primary visual reference

The supplied screenshot and [Employee_Management_System repository](https://github.com/varundev-exe/Employee_Management_System) show a GitHub repository surface: a compact dark global bar, bright content canvas, small navigation and action controls, fine gray dividers, a clear README content area, and contextual details at the side. The EMS interprets that compact, readable hierarchy as a workspace rather than reproducing GitHub's exact brand, navigation, or page components. Orbit's own symbol, role-aware navigation, data tables, metrics, and forms distinguish the product.

## Design inspiration reviewed

- [ThreeUI](https://threeui.com/) — reviewed as a 3D-web interaction reference. Orbit translates that direction into a small, lazily loaded orbital visualization used as an accent, not a full-screen scene.
- [Magnific](https://www.magnific.com/) — reviewed for visual direction around distinctive art/visual polish. Orbit uses a restrained indigo glow and a dark, high-contrast check-in card rather than adding decorative hero imagery to an HR workspace.
- [TasteCode](https://tastecode.dev/) — reviewed for product/interface direction. Orbit prioritizes concise controls, legible compact data and a clear application shell over landing-page spectacle.
- [GSAP](https://gsap.com/) — reviewed as the motion reference. Orbit uses GSAP for short count-up and navigation transitions, and honors reduced-motion preferences.

## Resulting visual system

The chosen style is a repository-inspired bright workspace with a compact graphite navigation rail, pale neutral surfaces, precise hairline borders, restrained glass/depth accents, and a periwinkle-indigo brand color (`#6759E8`). The custom Orbit mark is served from `client/public/orbit-mark.svg`. Charts and displayed trends are tied to saved records; animated numbers change presentation, not the underlying figures. The 3D and PDF code is split into on-demand chunks so it is not needed for the core data workflow.
