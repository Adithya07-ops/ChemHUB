# ChemHub — Agent Build Instructions
> **Purpose:** This file contains full context and step-by-step implementation instructions so any agent (or fresh session) can continue building ChemHub without any prior context.

---

## Project Overview

**ChemHub** is a chemistry student platform — a hub website that provides multiple specialized tools, all sharing the same glassmorphism dark aesthetic. It is built purely in **HTML + CSS + Vanilla JavaScript** with no framework, no build step, and no backend.

The project lives at:
```
C:\Users\Administrator\Desktop\Chem\-3D-Molecular-Viewer\
```

### Tools to Build

| # | Tool | Status | Notes |
|---|------|--------|-------|
| 1 | **Hub / Landing Page** | 🔲 TODO | `index.html` — replaces current viewer index |
| 2 | **3D Molecular Visualizer** | ✅ EXISTS | Move to `tools/viewer/` |
| 3 | **ADME Analyzer** | 🔲 TODO | `tools/adme/` |
| 4 | **Docking Explorer** | 🔲 TODO | `tools/docking/` — PDB viewer, WASM engine reserved |

---

## Current File State

```
-3D-Molecular-Viewer/
├── index.html          ← EXISTING viewer (MOVE to tools/viewer/index.html)
├── script.js           ← EXISTING viewer JS (MOVE to tools/viewer/script.js)
├── style.css           ← EXISTING viewer CSS (MOVE to tools/viewer/style.css)
├── shared.css          ← CREATE — shared design tokens for all pages
├── CHEMHUB_AGENT_INSTRUCTIONS.md  ← this file
```

**After restructure:**
```
-3D-Molecular-Viewer/
├── index.html                    ← NEW hub page
├── hub.css                       ← NEW hub page styles
├── hub.js                        ← NEW hub page JS (particle bg only)
├── shared.css                    ← NEW shared design tokens
├── tools/
│   ├── viewer/
│   │   ├── index.html            ← MOVED from root
│   │   ├── style.css             ← MOVED from root
│   │   └── script.js             ← MOVED from root
│   ├── adme/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── docking/
│       ├── index.html
│       ├── style.css
│       └── script.js
```

---

## Design System (MUST MATCH EXACTLY)

All pages must use these exact values — they are the existing viewer's design tokens.

### CSS Custom Properties
```css
:root {
    /* Backgrounds */
    --bg-deep:    #06060e;
    --bg-mid:     #0c0c1e;
    --bg-surface: rgba(16, 16, 36, 0.65);

    /* Glass cards */
    --glass-border: rgba(120, 200, 255, 0.10);
    --glass-bg:     rgba(18, 18, 44, 0.55);
    --glass-hover:  rgba(24, 24, 56, 0.7);

    /* Accent colors */
    --accent:             #00e5ff;
    --accent-dim:         rgba(0, 229, 255, 0.15);
    --accent-glow:        rgba(0, 229, 255, 0.35);
    --accent-purple:      #a855f7;
    --accent-purple-dim:  rgba(168, 85, 247, 0.15);

    /* Text */
    --text-primary:   #e8ecf4;
    --text-secondary: #8892a8;
    --text-muted:     #515b70;

    /* Danger */
    --danger:    #ff4d6a;
    --danger-bg: rgba(255, 77, 106, 0.12);

    /* Typography */
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    /* Border radii */
    --radius-sm: 8px;
    --radius-md: 14px;
    --radius-lg: 20px;
    --radius-xl: 28px;

    /* Transitions */
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --duration: 0.3s;
}
```

### Google Fonts (include in every page `<head>`)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Animated Particle Background (shared JS — copy to every page)
Every page has a `<canvas id="bg-canvas">` at the top and runs this initBackground() function.
The canvas is `position: fixed; z-index: 0; pointer-events: none;` and the app container is `position: relative; z-index: 1;`.

```javascript
function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 60;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.5,
                dx: (Math.random() - 0.5) * 0.3,
                dy: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.3 + 0.05,
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width*0.7);
        grad.addColorStop(0, 'rgba(10, 10, 40, 0)');
        grad.addColorStop(1, 'rgba(6, 6, 14, 0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
            p.x += p.dx; p.y += p.dy;
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 255, ${p.opacity})`;
            ctx.fill();
        }

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 229, 255, ${0.03*(1-dist/150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(drawParticles);
    }
    resize(); createParticles(); drawParticles();
    window.addEventListener('resize', () => { resize(); createParticles(); });
}
```

### Standard Page Header HTML (adapt title per page)
```html
<header class="app-header">
    <div class="header-glow"></div>
    <div class="header-content">
        <div class="logo-group">
            <div class="logo-icon"> <!-- SVG here --> </div>
            <div>
                <h1 class="app-title">ChemHub</h1>
                <p class="app-subtitle">Chemistry Research Platform</p>
            </div>
        </div>
        <!-- Optional: Back to Hub link -->
        <a href="../../index.html" class="back-link">← Hub</a>
    </div>
</header>
```

### Standard Page Footer
```html
<footer class="app-footer">
    <p>Built with <span class="heart">♥</span> using
        <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener">PubChem</a> &amp;
        <a href="https://www.rcsb.org/" target="_blank" rel="noopener">RCSB PDB</a>
    </p>
    <p class="footer-sub">ChemHub © 2026</p>
</footer>
```

### Glass Card Component CSS
```css
.glass-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 22px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
    transition: border-color var(--duration) var(--ease-out), box-shadow var(--duration) var(--ease-out);
}
.glass-card:hover { border-color: rgba(120, 200, 255, 0.18); }
```

---

## Step 1 — shared.css (CREATE FIRST)

Create `shared.css` in the project root. It contains:
- All CSS custom properties (design tokens above)
- CSS reset (`*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }`)
- `body` base styles
- `#bg-canvas` styles
- `.app-container` base
- `.app-header`, `.header-glow`, `.header-content`, `.logo-group`, `.logo-icon` styles
- `.app-title`, `.app-subtitle` styles
- `.glass-card` and hover styles
- `.card-title`, `.card-icon` styles
- `.btn`, `.btn-primary`, `.btn-ghost` styles
- `.btn-loader` and `@keyframes spin`
- `.chip` styles
- `.toast`, `.toast.visible`, `.toast.hidden`, toast child styles
- `.app-footer` and `.heart` styles
- `.hidden { display: none !important; }`
- `@keyframes logoPulse`, `@keyframes heartbeat`, `@keyframes shimmer`
- Responsive breakpoints (960px, 600px)

> Copy all relevant shared rules from the existing `tools/viewer/style.css`.
> The viewer's own layout-specific rules (`.main-layout`, `.side-panel`, `.viewer-*`) stay in `tools/viewer/style.css`.

---

## Step 2 — Hub Page (index.html + hub.css + hub.js)

### index.html structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChemHub — Chemistry Research Platform</title>
    [Google Fonts links]
    <link rel="stylesheet" href="shared.css">
    <link rel="stylesheet" href="hub.css">
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    <div class="app-container">
        [Header with ChemHub branding]
        <main class="hub-main">
            [Hero section: tagline + subtitle]
            [Tool cards grid: 3 cards]
        </main>
        [Footer]
    </div>
    <script src="hub.js"></script>
</body>
</html>
```

### Tool Cards (3 total)
Each card is a `.tool-card.glass-card` with:
- A colorful icon/emoji or SVG
- Tool name (h3)
- Short description (p)
- Status badge: "Active" (green) or "Coming Soon" (amber)
- "Launch →" button that links to the tool's folder

**Card 1 — ADME Analyzer**
- Icon: ⚗️ or a flask SVG
- Accent color: `--accent` (cyan)
- Link: `tools/adme/`
- Description: "Predict drug-likeness, ADME properties, and bioavailability from a molecule name or SMILES string. Based on Lipinski's Rule of Five and Veber rules."

**Card 2 — Docking Explorer**
- Icon: 🔬 or a protein SVG
- Accent color: `--accent-purple`
- Link: `tools/docking/`
- Description: "Explore protein-ligand binding interactions. Load a PDB structure and visualize how small molecules sit in binding pockets."

**Card 3 — 3D Molecular Visualizer**
- Icon: ⚙️ or atom SVG (same as existing viewer)
- Accent color: gradient cyan→purple
- Link: `tools/viewer/`
- Description: "Render any molecule in interactive 3D from its name or SMILES string. Switch between stick, sphere, and ball-and-stick representations."

### hub.css key styles
```css
.hub-main { ... } /* centered content */
.hero { text-align: center; padding: 60px 0 48px; }
.hero-title { font-size: 3rem; font-weight: 800; /* gradient text */ }
.hero-subtitle { font-size: 1.1rem; color: var(--text-secondary); max-width: 540px; margin: 0 auto; }
.tool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    max-width: 1100px;
    margin: 0 auto;
    padding-bottom: 60px;
}
.tool-card { /* extends glass-card */ cursor: pointer; position: relative; overflow: hidden; }
.tool-card:hover { transform: translateY(-4px); box-shadow: 0 12px 48px rgba(0,0,0,0.5); }
/* Card glow on hover varies per card color */
.tool-card-icon { font-size: 2.5rem; margin-bottom: 16px; }
.tool-card-name { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
.tool-card-desc { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px; }
.tool-card-badge { /* pill badge */ }
.tool-card-launch { /* styled link button */ }
```

---

## Step 3 — Move Existing Viewer

1. Create folder: `tools/viewer/`
2. Copy `index.html` → `tools/viewer/index.html`
3. Copy `style.css` → `tools/viewer/style.css`
4. Copy `script.js` → `tools/viewer/script.js`
5. In `tools/viewer/index.html`:
   - Add `<link rel="stylesheet" href="../../shared.css">` before the viewer's own stylesheet
   - Update title to "Molecular Visualizer | ChemHub"
   - Add back link to hub: `<a href="../../index.html" class="back-link">← ChemHub</a>` in header
6. In `tools/viewer/style.css`:
   - Remove all rules that will exist in shared.css (design tokens, glass-card, btn, chip, toast, footer, etc.)
   - Keep only viewer-specific rules: `.main-layout`, `.side-panel`, `.viewer-section`, `.viewer-card`, `.viewer-container`, `.viewer-empty`, orbit animations, `.mol-viewer-div`, `.viewer-loading`, `.atom-tooltip`, `.info-*` rows, `.smiles-*`, `.style-btn`, `.control-*`, `.quick-picks`

---

## Step 4 — ADME Analyzer (tools/adme/)

### What it does
1. User enters molecule name or SMILES
2. Fetch from **PubChem API**: `MolecularWeight, XLogP, HBondDonorCount, HBondAcceptorCount, RotatableBondCount, TPSA, HeavyAtomCount, Complexity, MolecularFormula, IUPACName, CanonicalSMILES`
   - Endpoint: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,HeavyAtomCount,Complexity,MolecularFormula,IUPACName,CanonicalSMILES,IsomericSMILES/JSON`
3. Compute and display:
   - **Properties Table**: MW, LogP, HBD, HBA, RotBonds, TPSA, HeavyAtoms, Complexity
   - **Drug-likeness Filters**: Each as a pass/fail row with colored badge
     - Lipinski RO5: MW≤500, LogP≤5, HBD≤5, HBA≤10
     - Veber: RotBonds≤10, TPSA≤140
     - Ghose: MW 160-480, LogP -0.4 to 5.6, Atoms 20-70, MR 40-130 (MR = 0.5 * HeavyAtomCount estimate or skip MR)
     - Lead-likeness: MW≤350, LogP≤3.5, RotBonds≤7
   - **Bioavailability Radar** — drawn on `<canvas>` — hexagonal radar chart with 6 axes:
     - LIPO (LogP), SIZE (MW), POLAR (TPSA), INSATU (unused bonds), INSOLU (estimated), FLEX (RotBonds)
     - Normalize each axis to 0-1 vs ideal drug range, draw the molecule's polygon filled with accent color
   - **Pharmacokinetics predictions**:
     - GI Absorption: "High" if TPSA<140 and HBD≤5, else "Low"
     - BBB Permeation: "Yes" if TPSA<90 and MW<400, else "No"
     - Oral Bioavailability: passes Lipinski → "Likely", else "Unlikely"
     - P-gp substrate: if MW>400 and LogP>4 → "Yes", else "No"
   - **SMILES display** (same style as viewer)

### ADME Layout
```
[search card — same style as viewer]
                    [Properties grid — 2 col]
                    [Filter badges — scrollable rows]
                    [Radar canvas — right side]
                    [Pharmacokinetics table]
```

### Bioavailability Radar Chart (Canvas)
Draw a hexagon with 6 axes. For each property, normalize:
- LIPO: 0=LogP<-2, 1=LogP>5 (ideal 0-5 range → score = clamp(LogP/5, 0, 1))  
- SIZE: score = MW/500 (ideal ≤500)
- POLAR: score = 1 - (TPSA/140) (ideal TPSA<140 → higher score when lower TPSA)
- FLEX: score = 1 - (RotBonds/10) (ideal ≤10)
- INSOL: estimate from LogP (higher logP → less soluble) score = 1-(clamp(LogP+2,0,7)/7)
- INSATU: HeavyAtomCount ratio approximation

Plot clockwise from top, fill with `rgba(0,229,255,0.25)`, stroke with `#00e5ff`.
Also draw the ideal drug-space polygon in `rgba(168,85,247,0.1)`.

---

## Step 5 — Docking Explorer (tools/docking/)

### What it does
1. User enters a **PDB ID** (e.g., `6LU7`)
2. Fetch protein structure: `https://files.rcsb.org/download/{PDBID}.pdb`
3. Load into **3Dmol.js** viewer (same as existing viewer — use CDN `https://3Dmol.org/build/3Dmol-min.js`)
4. Use RCSB Data API to get protein metadata: name, organism, resolution, ligands bound
   - `https://data.rcsb.org/rest/v1/core/entry/{PDBID}`
5. Display ligands found in the structure (from HETATM records or API)
6. User can optionally search for a **second molecule** (ligand) by name/SMILES via PubChem → get SDF → load alongside protein
7. Features:
   - Protein rendered as **cartoon** style colored by secondary structure (`cartoon: { color: 'spectrum' }`)
   - Ligand rendered as `stick` with `colorscheme: 'Jmol'`
   - Toggle surface view (molecular surface of protein)
   - Show/hide water molecules
   - Highlight binding pocket (residues within 5Å of ligand)
   - Info panel: protein name, organism, resolution, experimental method, chain count
   - **"WASM Engine Coming Soon" badge** — placeholder UI for future AutoDock Vina integration

### Docking Layout (two panels)
```
LEFT PANEL (360px):
  [PDB Search card]  → PDB ID input + "Load Protein" button
  [Ligand card]      → molecule search for ligand
  [Protein Info card]→ name, organism, resolution
  [Rendering card]   → style controls (cartoon, surface toggle)

RIGHT PANEL (flex: 1):
  [3Dmol.js viewer — same viewer-card style as visualizer]
```

### RCSB PDB API Endpoints
- Protein metadata: `https://data.rcsb.org/rest/v1/core/entry/{PDBID}`
- Download PDB: `https://files.rcsb.org/download/{PDBID}.pdb`
- Download CIF: `https://files.rcsb.org/download/{PDBID}.cif`
- Ligand info: `https://data.rcsb.org/rest/v1/core/nonpolymer_entity/{PDBID}/{entity_id}`

### 3Dmol.js styles for docking
```javascript
// Protein
viewer.setStyle({ hetflag: false }, { cartoon: { color: 'spectrum' } });
// Ligand (HETATM, non-water)
viewer.setStyle({ hetflag: true, resn: ['HOH', 'WAT'], invert: true }, {
    stick: { radius: 0.15, colorscheme: 'Jmol' },
    sphere: { scale: 0.25, colorscheme: 'Jmol' }
});
// Binding pocket highlight (after getting residues near ligand)
viewer.setStyle({ resi: pocketResidues }, {
    cartoon: { color: '#00e5ff', opacity: 0.85 }
});
```

---

## APIs Reference

### PubChem PUG-REST
```
Base: https://pubchem.ncbi.nlm.nih.gov/rest/pug

# Resolve name to CID
GET /compound/name/{name}/cids/JSON

# Resolve SMILES to CID  
GET /compound/smiles/{smiles}/cids/JSON

# Get properties by CID
GET /compound/cid/{CID}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,HeavyAtomCount,Complexity,MolecularFormula,IUPACName,CanonicalSMILES,IsomericSMILES,SMILES,ConnectivitySMILES/JSON

# Get 3D SDF
GET /compound/cid/{CID}/SDF?record_type=3d

# Get 2D SDF (fallback)
GET /compound/cid/{CID}/SDF?record_type=2d
```

**IMPORTANT:** PubChem API may return SMILES under keys `CanonicalSMILES`, `IsomericSMILES`, `SMILES`, or `ConnectivitySMILES`. Always check all four:
```javascript
const smiles = props.CanonicalSMILES || props.IsomericSMILES || props.SMILES || props.ConnectivitySMILES || null;
```

### RCSB PDB
```
# Download PDB file
GET https://files.rcsb.org/download/{PDBID}.pdb

# Entry metadata
GET https://data.rcsb.org/rest/v1/core/entry/{PDBID}
Returns: struct.title, rcsb_entry_info.resolution_combined, rcsb_entry_info.experimental_method,
         rcsb_entry_info.deposited_polymer_entity_instance_count (chains),
         rcsb_entry_info.deposited_nonpolymer_entity_instance_count (ligands)
```

---

## External Libraries (CDN — no npm)

```html
<!-- 3Dmol.js for molecular visualization (viewer + docking pages) -->
<script src="https://3Dmol.org/build/3Dmol-min.js"></script>
```

No other external JS libraries needed. Radar chart drawn with Canvas API. All data from PubChem + RCSB REST APIs.

---

## Navigation & Relative Paths

| Page | Path | Link to Hub | Link to Tools |
|------|------|-------------|---------------|
| Hub | `index.html` | — | `tools/viewer/`, `tools/adme/`, `tools/docking/` |
| Viewer | `tools/viewer/index.html` | `../../index.html` | — |
| ADME | `tools/adme/index.html` | `../../index.html` | — |
| Docking | `tools/docking/index.html` | `../../index.html` | — |

`shared.css` is at root. Reference from tools as `../../shared.css`.

---

## Build Order (Recommended)

1. **Create `shared.css`** — extract all shared styles from existing `style.css`
2. **Create `tools/viewer/`** folder, move/copy files, update paths
3. **Create `hub.css` + `hub.js` + `index.html`** (new hub page)
4. **Test hub → viewer navigation works**
5. **Create `tools/adme/`** — ADME Analyzer
6. **Create `tools/docking/`** — Docking Explorer
7. **Final pass:** update all back-to-hub links, verify all tool cards on hub work

---

## Key Design Notes

- **Hover on tool cards**: `transform: translateY(-4px)` + glowing border matching card accent color
- **Back link style**: small pill button top-right of header, `< ChemHub`, links to `../../index.html`
- **Card status badges**: `.badge-active { background: rgba(0,229,255,0.1); color: var(--accent); border: 1px solid var(--accent); }` and `.badge-soon { background: rgba(168,85,247,0.1); color: var(--accent-purple); border: 1px solid var(--accent-purple); }`
- **All tools share the same particle background** — use shared `initBackground()` function in each page's JS
- **Error handling**: each tool must have the same toast notification pattern as the existing viewer

---

## Progress Checklist

- [ ] `shared.css` created
- [ ] `tools/viewer/` created, files moved, paths updated
- [ ] New `index.html` hub page created
- [ ] `hub.css` created
- [ ] `hub.js` created (particle bg + any hub interactions)
- [ ] Hub → Viewer navigation tested
- [ ] `tools/adme/index.html` created
- [ ] `tools/adme/style.css` created
- [ ] `tools/adme/script.js` created (PubChem fetch + radar chart + drug filters)
- [ ] ADME tool tested with "aspirin", "penicillin"
- [ ] `tools/docking/index.html` created
- [ ] `tools/docking/style.css` created
- [ ] `tools/docking/script.js` created (PDB fetch + 3Dmol)
- [ ] Docking tool tested with PDB ID "6LU7"
- [ ] All pages link back to hub correctly
- [ ] Responsive layout verified at 960px and 600px
