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
    errorToast:     document.getElementById('error-toast'),
    errorMessage:   document.getElementById('error-message'),
    toastClose:     document.getElementById('toast-close'),
    bgCanvas:       document.getElementById('bg-canvas'),
};

const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

// ── State ──
const state = { isLoading: false, toastTimer: null };

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
        const res = await fetch(`${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(trimmed)}/cids/JSON`);
        if (!res.ok) throw new Error(`No compound found for SMILES: "${trimmed}"`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error('No results for this SMILES.');
        cid = data.IdentifierList.CID[0];
    } else {
        const res = await fetch(`${PUBCHEM_BASE}/compound/name/${encodeURIComponent(trimmed)}/cids/JSON`);
        if (!res.ok) throw new Error(`Compound "${trimmed}" not found.`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error(`No results for "${trimmed}".`);
        cid = data.IdentifierList.CID[0];
    }

    const propsUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,HeavyAtomCount,Complexity,MolecularFormula,IUPACName,CanonicalSMILES,IsomericSMILES,SMILES,ConnectivitySMILES/JSON`;
    const res = await fetch(propsUrl);
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
    } catch (err) {
        console.error(err);
        showError(err.message || 'Unable to load molecule.');
        el.propsPlaceholder.classList.remove('hidden');
    } finally {
        setLoading(false);
    }
}

// ── Event Listeners ──
document.addEventListener('DOMContentLoaded', () => {
    initBackground();

    el.analyzeBtn.addEventListener('click', analyze);
    el.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); analyze(); } });
    document.querySelectorAll('.chip[data-molecule]').forEach(chip =>
        chip.addEventListener('click', () => { el.input.value = chip.dataset.molecule; analyze(); })
    );
    el.toastClose.addEventListener('click', hideError);
});
