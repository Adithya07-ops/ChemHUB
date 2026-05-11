/* ========================================================
   ChemHub — ADME Analyzer Logic
   ======================================================== */

// ── DOM References ──
const el = {
    input:          document.getElementById('molecule-input'),
    analyzeBtn:     document.getElementById('analyze-btn'),
    btnLoader:      document.getElementById('btn-loader'),
    propsPlaceholder: document.getElementById('props-placeholder'),
    propsLoading:   document.getElementById('props-loading'),
    propsContent:   document.getElementById('props-content'),
    molName:        document.getElementById('mol-name'),
    propGrid:       document.getElementById('prop-grid'),
    filtersPlaceholder: document.getElementById('filters-placeholder'),
    filtersContent: document.getElementById('filters-content'),
    radarPlaceholder: document.getElementById('radar-placeholder'),
    radarContainer: document.getElementById('radar-container'),
    radarCanvas:    document.getElementById('radar-canvas'),
    pkPlaceholder:  document.getElementById('pk-placeholder'),
    pkGrid:         document.getElementById('pk-grid'),
    eggPlaceholder: document.getElementById('egg-placeholder'),
    eggContainer:   document.getElementById('egg-container'),
    eggCanvas:      document.getElementById('egg-canvas'),
    errorToast:     document.getElementById('error-toast'),
    errorMessage:   document.getElementById('error-message'),
    toastClose:     document.getElementById('toast-close'),
    bgCanvas:       document.getElementById('bg-canvas'),
    drawBtn:        document.getElementById('draw-btn'),
    drawModal:      document.getElementById('draw-modal'),
    drawClose:      document.getElementById('draw-close'),
    drawCancel:     document.getElementById('draw-cancel'),
    drawSubmit:     document.getElementById('draw-submit'),
    drawClear:      document.getElementById('draw-clear'),
    drawBackdrop:   document.getElementById('draw-backdrop'),
    smilesPreview:  document.getElementById('smiles-preview-value'),
    smilesCopyBtn:  document.getElementById('smiles-copy-btn'),
    statusAtoms:    document.getElementById('status-atoms'),
    statusBonds:    document.getElementById('status-bonds'),
};

const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PUBCHEM_TIMEOUT_MS = 10000;
const PUBCHEM_RETRY_DELAY_MS = 700;

// ── State ──
const state = { isLoading: false, toastTimer: null };

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PUBCHEM_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('PubChem request timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchWithRetry(url, options = {}) {
    try {
        const response = await fetchWithTimeout(url, options);
        if (response.ok) return response;
    } catch (firstError) {
        await wait(PUBCHEM_RETRY_DELAY_MS);
        try {
            return await fetchWithTimeout(url, options);
        } catch (secondError) {
            throw secondError || firstError;
        }
    }
    await wait(PUBCHEM_RETRY_DELAY_MS);
    return fetchWithTimeout(url, options);
}

// ════════════════════════════════════════════════════════════
// 1. BACKGROUND ANIMATION
// ════════════════════════════════════════════════════════════
function initBackground() {
    const canvas = el.bgCanvas;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const COUNT = 60;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    function create() {
        particles = [];
        for (let i = 0; i < COUNT; i++) particles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.3 + 0.05,
        });
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const g = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width*0.7);
        g.addColorStop(0, 'rgba(10,10,40,0)'); g.addColorStop(1, 'rgba(6,6,14,0.4)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            p.x += p.dx; p.y += p.dy;
            if (p.x < -10) p.x = canvas.width + 10; if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10; if (p.y > canvas.height + 10) p.y = -10;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,229,255,${p.opacity})`; ctx.fill();
        }
        for (let i = 0; i < particles.length; i++) {
            for (let j = i+1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 150) {
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0,229,255,${0.03*(1-dist/150)})`; ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    resize(); create(); draw();
    window.addEventListener('resize', () => { resize(); create(); });
}

// ════════════════════════════════════════════════════════════
// 2. PUBCHEM API
// ════════════════════════════════════════════════════════════
function looksLikeSMILES(input) {
    return /[=#@\[\]\\\/\(\)]/.test(input) ||
        (/^[A-Za-z0-9\+\-\.#%\(\)\[\]\\\/=@]+$/.test(input) && /[A-Z]/.test(input) && input.length <= 200 && !/\s/.test(input));
}

async function fetchMoleculeData(query) {
    const trimmed = query.trim();
    if (!trimmed) throw new Error('Please enter a molecule name or SMILES string.');

    let cid;
    const isSMILES = looksLikeSMILES(trimmed);

    if (isSMILES) {
        const res = await fetchWithRetry(`${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(trimmed)}/cids/JSON`);
        if (!res.ok) throw new Error(`No compound found for SMILES: "${trimmed}"`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error('No results for this SMILES.');
        cid = data.IdentifierList.CID[0];
    } else {
        const res = await fetchWithRetry(`${PUBCHEM_BASE}/compound/name/${encodeURIComponent(trimmed)}/cids/JSON`);
        if (!res.ok) throw new Error(`Compound "${trimmed}" not found.`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error(`No results for "${trimmed}".`);
        cid = data.IdentifierList.CID[0];
    }

    const propsUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,HeavyAtomCount,Complexity,MolecularFormula,IUPACName,CanonicalSMILES,IsomericSMILES,SMILES,ConnectivitySMILES/JSON`;
    const res = await fetchWithRetry(propsUrl);
    if (!res.ok) throw new Error('Failed to fetch molecular properties.');
    const data = await res.json();
    const p = data.PropertyTable?.Properties?.[0];
    if (!p) throw new Error('No property data returned.');

    return {
        name:       p.IUPACName || trimmed,
        formula:    p.MolecularFormula || '—',
        mw:         parseFloat(p.MolecularWeight) || null,
        logP:       p.XLogP ?? null,
        hbd:        p.HBondDonorCount ?? null,
        hba:        p.HBondAcceptorCount ?? null,
        rotBonds:   p.RotatableBondCount ?? null,
        tpsa:       p.TPSA ?? null,
        heavyAtoms: p.HeavyAtomCount ?? null,
        complexity: p.Complexity ?? null,
        smiles:     p.CanonicalSMILES || p.IsomericSMILES || p.SMILES || p.ConnectivitySMILES || '—',
    };
}

// ════════════════════════════════════════════════════════════
// 3. DRUG-LIKENESS CALCULATIONS
// ════════════════════════════════════════════════════════════
function computeFilters(d) {
    const rules = [];

    // Lipinski Rule of Five
    const lipinskiRules = [
        { name: 'MW ≤ 500 Da',   pass: d.mw  !== null && d.mw  <= 500, val: d.mw  !== null ? `${d.mw.toFixed(1)} Da` : '—' },
        { name: 'LogP ≤ 5',      pass: d.logP !== null && d.logP <= 5,  val: d.logP !== null ? d.logP.toFixed(2) : '—' },
        { name: 'HBD ≤ 5',       pass: d.hbd  !== null && d.hbd  <= 5,  val: d.hbd  !== null ? String(d.hbd) : '—' },
        { name: 'HBA ≤ 10',      pass: d.hba  !== null && d.hba  <= 10, val: d.hba  !== null ? String(d.hba) : '—' },
    ];
    const lipinskiViolations = lipinskiRules.filter(r => !r.pass).length;
    const lipinskiPass = lipinskiViolations <= 1;

    // Veber Rules
    const veberRules = [
        { name: 'RotBonds ≤ 10', pass: d.rotBonds !== null && d.rotBonds <= 10, val: d.rotBonds !== null ? String(d.rotBonds) : '—' },
        { name: 'TPSA ≤ 140 Å²', pass: d.tpsa     !== null && d.tpsa     <= 140, val: d.tpsa     !== null ? `${d.tpsa} Å²` : '—' },
    ];
    const veberPass = veberRules.every(r => r.pass);

    // Ghose Filter
    const ghoseRules = [
        { name: 'MW 160–480',      pass: d.mw !== null && d.mw >= 160 && d.mw <= 480, val: d.mw !== null ? `${d.mw.toFixed(1)}` : '—' },
        { name: 'LogP -0.4 to 5.6',pass: d.logP !== null && d.logP >= -0.4 && d.logP <= 5.6, val: d.logP !== null ? d.logP.toFixed(2) : '—' },
        { name: 'Atoms 20–70',     pass: d.heavyAtoms !== null && d.heavyAtoms >= 20 && d.heavyAtoms <= 70, val: d.heavyAtoms !== null ? String(d.heavyAtoms) : '—' },
    ];
    const ghosePass = ghoseRules.every(r => r.pass);

    // Lead-likeness
    const leadRules = [
        { name: 'MW ≤ 350 Da',   pass: d.mw   !== null && d.mw   <= 350, val: d.mw   !== null ? `${d.mw.toFixed(1)} Da` : '—' },
        { name: 'LogP ≤ 3.5',    pass: d.logP !== null && d.logP <= 3.5,  val: d.logP !== null ? d.logP.toFixed(2) : '—' },
        { name: 'RotBonds ≤ 7',  pass: d.rotBonds !== null && d.rotBonds <= 7, val: d.rotBonds !== null ? String(d.rotBonds) : '—' },
    ];
    const leadPass = leadRules.every(r => r.pass);

    return {
        lipinski: { rules: lipinskiRules, pass: lipinskiPass, violations: lipinskiViolations },
        veber:    { rules: veberRules,    pass: veberPass },
        ghose:    { rules: ghoseRules,    pass: ghosePass },
        lead:     { rules: leadRules,     pass: leadPass },
    };
}

function computePK(d) {
    const giHigh = d.tpsa !== null && d.tpsa < 140 && d.hbd !== null && d.hbd <= 5;
    const bbb     = d.tpsa !== null && d.tpsa < 90 && d.mw !== null && d.mw < 400;
    const oralBio = d.mw !== null && d.mw <= 500 && d.logP !== null && d.logP <= 5 && d.hbd !== null && d.hbd <= 5 && d.hba !== null && d.hba <= 10;
    const pgp     = d.mw !== null && d.mw > 400 && d.logP !== null && d.logP > 4;

    return [
        { label: 'GI Absorption', value: giHigh ? 'High' : 'Low', cls: giHigh ? 'high' : 'low',
          note: 'Based on TPSA < 140 Å² & HBD ≤ 5' },
        { label: 'BBB Permeation', value: bbb ? 'Likely' : 'Unlikely', cls: bbb ? 'yes' : 'no',
          note: 'Based on TPSA < 90 Å² & MW < 400 Da' },
        { label: 'Oral Bioavailability', value: oralBio ? 'Favorable' : 'Unfavorable', cls: oralBio ? 'yes' : 'no',
          note: 'Lipinski RO5 compliance' },
        { label: 'P-gp Substrate', value: pgp ? 'Likely' : 'Unlikely', cls: pgp ? 'low' : 'yes',
          note: 'MW > 400 & LogP > 4 heuristic' },
    ];
}

// ════════════════════════════════════════════════════════════
// 4. BIOAVAILABILITY RADAR CHART (Canvas)
// ════════════════════════════════════════════════════════════
function drawRadar(d) {
    const canvas = el.radarCanvas;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2 - 10;
    const R = Math.min(W, H) * 0.38;
    const N = 6;
    const labels = ['LIPO', 'SIZE', 'POLAR', 'INSOLU', 'FLEX', 'INSATU'];

    // Normalize scores 0–1 (higher = more drug-like)
    const clamp = (v, lo, hi) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    const scores = [
        // LIPO: LogP 0–5 ideal → score peaks at LogP=2
        d.logP !== null ? 1 - Math.abs((d.logP - 2) / 5) : 0.5,
        // SIZE: MW 150–500 ideal
        d.mw !== null ? 1 - clamp(d.mw, 150, 600) : 0.5,
        // POLAR: TPSA 20–130 (low TPSA = better for oral)
        d.tpsa !== null ? 1 - clamp(d.tpsa, 20, 160) : 0.5,
        // INSOLU: high LogP = less soluble (bad)
        d.logP !== null ? 1 - clamp(Math.max(d.logP, 0), 0, 6) : 0.5,
        // FLEX: fewer rot bonds better
        d.rotBonds !== null ? 1 - clamp(d.rotBonds, 0, 12) : 0.5,
        // INSATU: heavy atoms proxy
        d.heavyAtoms !== null ? clamp(d.heavyAtoms, 10, 50) : 0.5,
    ];

    // Ideal drug-space polygon (all ~0.6–0.75)
    const ideal = [0.7, 0.7, 0.65, 0.65, 0.7, 0.65];

    ctx.clearRect(0, 0, W, H);

    // Draw grid rings
    for (let ring = 1; ring <= 4; ring++) {
        const r = R * ring / 4;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
            const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
            const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < N; i++) {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw ideal polygon (purple)
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const r = R * ideal[i];
        const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(168,85,247,0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw molecule polygon (cyan)
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const r = R * Math.max(0.02, Math.min(1, scores[i]));
        const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,229,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw vertices
    for (let i = 0; i < N; i++) {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const r = R * Math.max(0.02, Math.min(1, scores[i]));
        const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
    }

    // Labels
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < N; i++) {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const lx = cx + (R + 28) * Math.cos(angle);
        const ly = cy + (R + 28) * Math.sin(angle);
        ctx.fillStyle = '#8892a8';
        ctx.fillText(labels[i], lx, ly);

        // Score value
        ctx.font = '500 10px JetBrains Mono, monospace';
        ctx.fillStyle = '#00e5ff';
        ctx.fillText(scores[i].toFixed(2), lx, ly + 14);
        ctx.font = '600 12px Inter, sans-serif';
    }
}

// ════════════════════════════════════════════════════════════
// 4b. BOILED-EGG PLOT (Canvas)
// ════════════════════════════════════════════════════════════
function drawBoiledEgg(d) {
    const canvas = el.eggCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Data limits
    const minTPSA = -10, maxTPSA = 200;
    const minWLOGP = -3, maxWLOGP = 7;

    const mapX = (tpsa) => ((tpsa - minTPSA) / (maxTPSA - minTPSA)) * W;
    const mapY = (wlogp) => H - ((wlogp - minWLOGP) / (maxWLOGP - minWLOGP)) * H;

    ctx.clearRect(0, 0, W, H);

    // Draw Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X-axis (TPSA)
    for (let t = 0; t <= 150; t += 50) {
        const x = mapX(t);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.fillText(t, x, H - 15);
    }
    // Y-axis (WLOGP)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let l = -2; l <= 6; l += 2) {
        const y = mapY(l);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillText(l, 20, y);
    }

    // Axes Labels
    ctx.fillStyle = '#8892a8';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TPSA', W / 2, H - 4);
    ctx.save();
    ctx.translate(10, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('WLOGP', 0, 0);
    ctx.restore();

    // Helper function to draw an ellipse
    function drawEllipse(xCtr, yCtr, a, b, angle, fillColor) {
        const cx = mapX(xCtr);
        const cy = mapY(yCtr);
        // We need to scale a and b to pixel coordinates
        const pxA = (a / (maxTPSA - minTPSA)) * W;
        const pxB = (b / (maxWLOGP - minWLOGP)) * H;

        ctx.save();
        ctx.translate(cx, cy);
        // Notice angle is negated because Canvas Y is inverted compared to math Y
        ctx.rotate(-angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, pxA, pxB, 0, 0, 2 * Math.PI);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // BOILED-Egg parameters from Daina & Zoete (2016)
    // HIA (White region): Center(71.051, 2.292), a=61.353, b=4.887, angle=-0.17189
    // BBB (Yolk region): Center(38.169, 3.177), a=32.553, b=2.761, angle=-0.16999
    
    // Draw the egg white (HIA)
    drawEllipse(71.051, 2.292, 61.353, 4.887, -0.17189, '#ffffff');

    // Draw the yolk (BBB)
    drawEllipse(38.169, 3.177, 32.553, 2.761, -0.16999, '#fde047');

    // Plot the molecule
    // Fallbacks if data missing
    const tpsaVal = d.tpsa !== null ? d.tpsa : -100;
    const logPVal = d.logP !== null ? d.logP : -100;

    if (tpsaVal >= minTPSA && tpsaVal <= maxTPSA && logPVal >= minWLOGP && logPVal <= maxWLOGP) {
        const x = mapX(tpsaVal);
        const y = mapY(logPVal);

        // Glow
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0,229,255,0.4)';
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

function showBoiledEgg(d) {
    if (!el.eggPlaceholder) return;
    el.eggPlaceholder.classList.add('hidden');
    el.eggContainer.classList.remove('hidden');
    drawBoiledEgg(d);
}

// ════════════════════════════════════════════════════════════
// 5. UI RENDERING
// ════════════════════════════════════════════════════════════
function showProps(d) {
    el.propsPlaceholder.classList.add('hidden');
    el.propsLoading.classList.add('hidden');
    el.propsContent.classList.remove('hidden');

    const name = d.name.charAt(0).toUpperCase() + d.name.slice(1);
    el.molName.textContent = name;

    const items = [
        { label: 'Formula',     value: d.formula,                          hi: false },
        { label: 'Mol. Weight', value: d.mw     !== null ? `${d.mw.toFixed(2)} Da` : '—', hi: true },
        { label: 'LogP (XLogP)',value: d.logP    !== null ? d.logP.toFixed(2) : '—',       hi: false },
        { label: 'TPSA',        value: d.tpsa    !== null ? `${d.tpsa} Å²` : '—',         hi: false },
        { label: 'HBD',         value: d.hbd     !== null ? String(d.hbd) : '—',           hi: false },
        { label: 'HBA',         value: d.hba     !== null ? String(d.hba) : '—',           hi: false },
        { label: 'Rot. Bonds',  value: d.rotBonds !== null ? String(d.rotBonds) : '—',     hi: false },
        { label: 'Heavy Atoms', value: d.heavyAtoms !== null ? String(d.heavyAtoms) : '—', hi: false },
    ];

    el.propGrid.innerHTML = items.map(it => `
        <div class="prop-item">
            <div class="prop-label">${it.label}</div>
            <div class="prop-value ${it.hi ? 'highlight' : ''}">${it.value}</div>
        </div>
    `).join('');
}

function showFilters(d) {
    const f = computeFilters(d);

    const renderSection = (title, data, overall) => {
        const rows = data.rules.map(r => `
            <div class="filter-row">
                <span class="filter-name">${r.name}</span>
                <span class="filter-value">${r.val}</span>
                <span class="badge ${r.pass ? 'badge-pass' : 'badge-fail'}">${r.pass ? '✓' : '✗'}</span>
            </div>
        `).join('');

        return `
            <div class="filter-section">
                <div class="filter-section-title">${title}</div>
                ${rows}
                <div class="filter-overall">
                    <span class="filter-overall-name">${title} Overall</span>
                    <span class="badge ${overall ? 'badge-pass' : 'badge-fail'}">${overall ? 'PASS' : 'FAIL'}</span>
                </div>
            </div>
        `;
    };

    el.filtersPlaceholder.classList.add('hidden');
    el.filtersContent.classList.remove('hidden');
    el.filtersContent.innerHTML =
        renderSection('Lipinski RO5',    f.lipinski, f.lipinski.pass) +
        renderSection('Veber Rules',     f.veber,    f.veber.pass) +
        renderSection('Ghose Filter',    f.ghose,    f.ghose.pass) +
        renderSection('Lead-likeness',   f.lead,     f.lead.pass);
}

function showPK(d) {
    const pk = computePK(d);
    el.pkPlaceholder.classList.add('hidden');
    el.pkGrid.classList.remove('hidden');
    el.pkGrid.innerHTML = pk.map(item => `
        <div class="pk-item">
            <div class="pk-label">${item.label}</div>
            <div class="pk-value ${item.cls}">${item.value}</div>
            <div class="pk-note">${item.note}</div>
        </div>
    `).join('');
}

function showRadar(d) {
    el.radarPlaceholder.classList.add('hidden');
    el.radarContainer.classList.remove('hidden');
    drawRadar(d);
}

function setLoading(loading) {
    state.isLoading = loading;
    if (loading) {
        el.analyzeBtn.classList.add('loading');
        el.analyzeBtn.disabled = true;
        el.propsPlaceholder.classList.add('hidden');
        el.propsLoading.classList.remove('hidden');
    } else {
        el.analyzeBtn.classList.remove('loading');
        el.analyzeBtn.disabled = false;
        el.propsLoading.classList.add('hidden');
    }
}

function showError(msg) {
    clearTimeout(state.toastTimer);
    el.errorMessage.textContent = msg;
    el.errorToast.classList.remove('hidden');
    void el.errorToast.offsetHeight;
    el.errorToast.classList.add('visible');
    state.toastTimer = setTimeout(hideError, 6000);
}

function hideError() {
    el.errorToast.classList.remove('visible');
    setTimeout(() => el.errorToast.classList.add('hidden'), 400);
}

// ════════════════════════════════════════════════════════════
// 6. MAIN FLOW
// ════════════════════════════════════════════════════════════
async function analyze() {
    const query = el.input.value.trim();
    if (!query) { showError('Please enter a molecule name or SMILES.'); return; }
    if (state.isLoading) return;

    setLoading(true);
    try {
        const data = await fetchMoleculeData(query);
        showProps(data);
        showFilters(data);
        showPK(data);
        showRadar(data);
        showBoiledEgg(data);
    } catch (err) {
        console.error(err);
        showError(err.message || 'Unable to load molecule.');
        el.propsPlaceholder.classList.remove('hidden');
    } finally {
        setLoading(false);
    }
}

// ════════════════════════════════════════════════════════════
// 7. JSME DRAW MODAL  ── Premium UX
// ════════════════════════════════════════════════════════════
let jsmeApplet = null;
let smilesPollingTimer = null;
let lastSmiles = '';

window.jsmeOnLoad = function () {
    jsmeApplet = new JSApplet.JSME('jsme_container', '100%', '430px', {
        options: 'newlook,star'
    });
};

// ── Live SMILES preview (poll every 400 ms) ──
function startSmilesPolling() {
    stopSmilesPolling();
    smilesPollingTimer = setInterval(() => {
        if (!jsmeApplet) return;
        try {
            const smiles = jsmeApplet.smiles() || '';
            if (smiles !== lastSmiles) { lastSmiles = smiles; updateSmilesPreview(smiles); }
        } catch (_) { /* JSME may throw before any atoms are drawn */ }
    }, 400);
}
function stopSmilesPolling() {
    if (smilesPollingTimer) { clearInterval(smilesPollingTimer); smilesPollingTimer = null; }
}
function updateSmilesPreview(smiles) {
    if (!el.smilesPreview) return;
    if (smiles) {
        el.smilesPreview.textContent = smiles;
        el.smilesPreview.classList.add('has-value');
        const atoms = (smiles.match(/[BCNOPSFI]|Cl|Br/g) || []).length;
        const bonds = (smiles.match(/[-=#:]/g) || []).length +
                      (smiles.match(/[a-z]/g) || []).length;
        if (el.statusAtoms) el.statusAtoms.textContent = `Atoms: ${atoms}`;
        if (el.statusBonds) el.statusBonds.textContent = `Bonds: ${bonds}`;
    } else {
        el.smilesPreview.textContent = '—';
        el.smilesPreview.classList.remove('has-value');
        if (el.statusAtoms) el.statusAtoms.textContent = 'Atoms: —';
        if (el.statusBonds) el.statusBonds.textContent = 'Bonds: —';
    }
}

// ── Open / Close ──
function openDrawModal() {
    lastSmiles = '';
    updateSmilesPreview('');
    el.drawModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    startSmilesPolling();
    if (jsmeApplet && looksLikeSMILES(el.input.value.trim())) {
        try { jsmeApplet.readMolecule(el.input.value.trim()); } catch (_) { }
    }
}
function closeDrawModal() {
    stopSmilesPolling();
    el.drawModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ── Use Structure ──
function useStructure() {
    if (!jsmeApplet) return;
    const smiles = jsmeApplet.smiles();
    if (!smiles) { showError('Please draw a structure first.'); return; }
    el.input.value = smiles;
    closeDrawModal();
    analyze();
}

// ── Clear canvas ──
function clearDrawing() {
    if (!jsmeApplet) return;
    try { jsmeApplet.reset(); } catch (_) { }
    updateSmilesPreview('');
    lastSmiles = '';
}

// ── Copy SMILES ──
async function copySmiles() {
    const smiles = lastSmiles;
    if (!smiles) { showError('Nothing to copy — draw a molecule first.'); return; }
    try {
        await navigator.clipboard.writeText(smiles);
    } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = smiles; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
    }
    if (el.smilesCopyBtn) {
        el.smilesCopyBtn.classList.add('copied');
        const label = el.smilesCopyBtn.querySelector('.copy-label');
        if (label) label.textContent = 'Copied!';
        setTimeout(() => {
            el.smilesCopyBtn.classList.remove('copied');
            if (label) label.textContent = 'Copy';
        }, 2000);
    }
}

// ── Event Listeners ──
document.addEventListener('DOMContentLoaded', () => {
    initBackground();

    el.drawBtn.addEventListener('click', openDrawModal);
    el.drawClose.addEventListener('click', closeDrawModal);
    el.drawCancel.addEventListener('click', closeDrawModal);
    el.drawSubmit.addEventListener('click', useStructure);
    if (el.drawClear)     el.drawClear.addEventListener('click', clearDrawing);
    if (el.drawBackdrop)  el.drawBackdrop.addEventListener('click', closeDrawModal);
    if (el.smilesCopyBtn) el.smilesCopyBtn.addEventListener('click', copySmiles);

    el.analyzeBtn.addEventListener('click', analyze);
    el.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); analyze(); } });
    document.querySelectorAll('.chip[data-molecule]').forEach(chip =>
        chip.addEventListener('click', () => { el.input.value = chip.dataset.molecule; analyze(); })
    );
    el.toastClose.addEventListener('click', hideError);

    // Global keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !el.drawModal.classList.contains('hidden')) {
            closeDrawModal(); return;
        }
        if ((e.key === 'd' || e.key === 'D') &&
            document.activeElement !== el.input &&
            !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            openDrawModal();
        }
    });
});
