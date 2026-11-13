# Dublin Detail — Interactive 3D website

## GitHub Pages upload

1. Unzip the downloaded ZIP. It contains one folder called `car_detailing_3d_site`.
2. Open that folder and upload **all six files inside it** directly to your GitHub repository root (not the containing folder):
   - `index.html`
   - `styles.css`
   - `script.js`
   - `generic-mid-engine-supercar.glb`
   - `stainless-wet-dry-vacuum.glb`
   - `plaggy_cc0-drops-523.glb`
3. In GitHub, go to **Settings → Pages → Deploy from a branch → main → /(root)**.
4. Wait for GitHub Pages to publish, then open its URL. No build step is required.

The three GLB files are **real 3D meshes**, not static photographs. They are loaded from local relative paths, while the Three.js engine and Google fonts use an internet connection (Three.js r160 from unpkg).

## What's included

- One scroll-driven WebGL canvas and animated camera orbit (>360°)
- Real sports-car and wet/dry-vacuum GLB models
- Original GLB water droplet mesh with animated water jet and mist particles
- PBR studio reflections, spot lighting, stage, and drifting paint glints
- Five pinned, scroll-revealed chapters, interactive service hotspots, paint colour switcher
- Mobile responsive interface and service detail drawer
- Mini Valet €90, Full Valet €150 and optional extras

**Important:** The booking and enquiry panel is a demo: it only copies enquiry details to the clipboard. You must add your own business contact details and booking/payment backend before accepting real orders. Service descriptions are examples that should be confirmed before publishing.

The model assets were supplied by the user; verify the applicable licences and attribution requirements for public commercial use.
