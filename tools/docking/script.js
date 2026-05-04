/* ========================================================
   ChemHub — Docking Explorer Logic
   ======================================================== */

const el = {
    pdbInput:       document.getElementById('pdb-input'),
    loadPdbBtn:     document.getElementById('load-pdb-btn'),
    btnLoader:      document.getElementById('btn-loader'),
    ligandInput:    document.getElementById('ligand-input'),
    loadLigandBtn:  document.getElementById('load-ligand-btn'),
    infoPlaceholder:document.getElementById('info-placeholder'),
    infoContent:    document.getElementById('info-content'),
    viewerContainer:document.getElementById('viewer-container'),
    viewerEmpty:    document.getElementById('viewer-empty'),
    proteinSwitcher:document.getElementById('protein-style-switcher'),
    colorSwitcher:  document.getElementById('color-switcher'),
    resetBtn:       document.getElementById('reset-view-btn'),
    spinBtn:        document.getElementById('spin-btn'),
    errorToast:     document.getElementById('error-toast'),
    errorMessage:   document.getElementById('error-message'),
    toastClose:     document.getElementById('toast-close'),
    bgCanvas:       document.getElementById('bg-canvas'),
};

const state = {
    viewer:        null,
    isLoading:     false,
    isSpinning:    false,
    currentPDB:    null,
    toastTimer:    null,
    proteinStyle:  'cartoon',
    colorScheme:   'spectrum',
    hasLigand:     false,
};

const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PDB_DL_BASE  = 'https://files.rcsb.org/download';
const PDB_API_BASE = 'https://data.rcsb.org/rest/v1/core';

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
            ctx.fillStyle = `rgba(168,85,247,${p.opacity * 0.6})`; ctx.fill();
        }
        for (let i = 0; i < particles.length; i++) {
            for (let j = i+1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 140) {
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(168,85,247,${0.025*(1-dist/140)})`; ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    resize(); create(); draw();
    window.addEventListener('resize', () => { resize(); create(); });
}

// ════════════════════════════════════════════════════════════
// 2. 3DMOL VIEWER
// ════════════════════════════════════════════════════════════
function initViewer() {
    if (state.viewer) { state.viewer.clear(); state.viewer = null; }

    const existing = el.viewerContainer.querySelectorAll('.mol-viewer-div');
    existing.forEach(d => d.remove());

    const div = document.createElement('div');
    div.className = 'mol-viewer-div';
    div.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    el.viewerContainer.appendChild(div);

    state.viewer = $3Dmol.createViewer(div, {
        backgroundColor: 'rgba(0,0,0,0)',
        antialias: true,
    });
    return state.viewer;
}

function applyProteinStyle() {
    if (!state.viewer) return;
    state.viewer.setStyle({ hetflag: false }, {});

    const cs = state.colorScheme === 'spectrum' ? 'spectrum' :
               state.colorScheme === 'chain'    ? 'chainHetatm' : 'ssJmol';

    switch (state.proteinStyle) {
        case 'cartoon':
            state.viewer.setStyle({ hetflag: false }, { cartoon: { color: cs } });
            break;
        case 'surface':
            state.viewer.setStyle({ hetflag: false }, {
                cartoon: { color: cs, opacity: 0.3 },
            });
            state.viewer.addSurface($3Dmol.SurfaceType.MS, {
                opacity: 0.55, color: cs === 'spectrum' ? 'spectrum' : '#4444cc',
            }, { hetflag: false });
            break;
        case 'stick':
            state.viewer.setStyle({ hetflag: false }, { stick: { colorscheme: 'Jmol', radius: 0.1 } });
            break;
    }
    state.viewer.render();
}

function applyLigandStyle() {
    if (!state.viewer) return;
    // Style HETATM non-water residues as glowing sticks
    state.viewer.setStyle(
        { hetflag: true },
        { stick: { radius: 0.18, colorscheme: 'Jmol' }, sphere: { scale: 0.26, colorscheme: 'Jmol' } }
    );
    // Make water invisible
    state.viewer.setStyle({ resn: ['HOH', 'WAT', 'H2O'] }, {});
    state.viewer.render();
}

// ════════════════════════════════════════════════════════════
// 3. PDB LOADING
// ════════════════════════════════════════════════════════════
async function fetchPDBMeta(pdbId) {
    const url = `${PDB_API_BASE}/entry/${pdbId.toUpperCase()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
}

function parseMeta(meta, pdbId) {
    if (!meta) return { title: pdbId, organism: '—', resolution: '—', method: '—', chains: '—', ligands: [] };
    const info = meta.rcsb_entry_info || {};
    const struct = meta.struct || {};
    const polymer = meta.rcsb_entry_container_identifiers || {};

    const title      = struct.title || pdbId;
    const resolution = info.resolution_combined ? `${info.resolution_combined[0]} Å` : 'N/A';
    const method     = info.experimental_method  || '—';
    const chains     = info.deposited_polymer_entity_instance_count || '—';
    const ligandCount= info.deposited_nonpolymer_entity_instance_count || 0;

    // Get organism from the first polymer entity description
    let organism = '—';
    if (meta.polymer_entities?.[0]?.rcsb_entity_source_organism?.[0]?.scientific_name) {
        organism = meta.polymer_entities[0].rcsb_entity_source_organism[0].scientific_name;
    }

    return { title, organism, resolution, method, chains, ligandCount };
}

function showInfo(pdbId, meta) {
    el.infoPlaceholder.classList.add('hidden');
    el.infoContent.classList.remove('hidden');

    const rows = [
        { label: 'PDB ID',     value: pdbId.toUpperCase(), cls: 'accent mono' },
        { label: 'Title',      value: meta.title,          cls: '' },
        { label: 'Organism',   value: meta.organism,       cls: '' },
        { label: 'Resolution', value: meta.resolution,     cls: 'mono' },
        { label: 'Method',     value: meta.method,         cls: '' },
        { label: 'Chains',     value: String(meta.chains), cls: 'mono' },
        { label: 'Ligands',    value: String(meta.ligandCount), cls: 'mono' },
    ];

    el.infoContent.innerHTML = rows.map(r => `
        <div class="info-row">
            <span class="info-label">${r.label}</span>
            <span class="info-value ${r.cls}">${r.value || '—'}</span>
        </div>
    `).join('') + '<div class="info-divider"></div>';
}

async function loadProtein() {
    const pdbId = el.pdbInput.value.trim().toUpperCase();
    if (!pdbId || pdbId.length !== 4) {
        showError('Please enter a valid 4-character PDB ID (e.g., 6LU7).');
        return;
    }
    if (state.isLoading) return;

    setLoading(true);

    try {
        // Fetch PDB file and metadata in parallel
        const [pdbRes, meta] = await Promise.all([
            fetch(`${PDB_DL_BASE}/${pdbId}.pdb`),
            fetchPDBMeta(pdbId),
        ]);

        if (!pdbRes.ok) throw new Error(`PDB structure "${pdbId}" not found. Check the ID.`);
        const pdbText = await pdbRes.text();

        // Init viewer
        const viewer = initViewer();
        viewer.addModel(pdbText, 'pdb');

        // Apply styles
        applyProteinStyle();
        applyLigandStyle();

        viewer.zoomTo();
        viewer.render();

        if (state.isSpinning) viewer.spin(true);

        // Show info
        const parsedMeta = parseMeta(meta, pdbId);
        showInfo(pdbId, parsedMeta);

        // Hide empty state
        el.viewerEmpty.classList.add('hidden');
        state.currentPDB = pdbId;

    } catch (err) {
        console.error(err);
        showError(err.message || 'Failed to load PDB structure.');
    } finally {
        setLoading(false);
    }
}

// ════════════════════════════════════════════════════════════
// 4. LIGAND LOADING (from PubChem)
// ════════════════════════════════════════════════════════════
function looksLikeSMILES(input) {
    return /[=#@\[\]\\\/\(\)]/.test(input) ||
        (/^[A-Za-z0-9\+\-\.#%\(\)\[\]\\\/=@]+$/.test(input) && /[A-Z]/.test(input) && input.length <= 200 && !/\s/.test(input));
}

async function loadLigand() {
    if (!state.viewer) { showError('Load a protein structure first.'); return; }
    const query = el.ligandInput.value.trim();
    if (!query) { showError('Enter a ligand name or SMILES.'); return; }

    try {
        let cid;
        if (looksLikeSMILES(query)) {
            const res = await fetch(`${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(query)}/cids/JSON`);
            if (!res.ok) throw new Error(`No compound found for SMILES: "${query}"`);
            const data = await res.json();
            cid = data.IdentifierList?.CID?.[0];
        } else {
            const res = await fetch(`${PUBCHEM_BASE}/compound/name/${encodeURIComponent(query)}/cids/JSON`);
            if (!res.ok) throw new Error(`Compound "${query}" not found.`);
            const data = await res.json();
            cid = data.IdentifierList?.CID?.[0];
        }
        if (!cid) throw new Error('No compound found.');

        // Try 3D SDF first, fall back to 2D
        let sdf = null;
        const sdf3d = await fetch(`${PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=3d`);
        if (sdf3d.ok) {
            sdf = await sdf3d.text();
        } else {
            const sdf2d = await fetch(`${PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=2d`);
            if (sdf2d.ok) sdf = await sdf2d.text();
        }
        if (!sdf) throw new Error('3D structure unavailable for this ligand.');

        state.viewer.addModel(sdf, 'sdf');
        state.viewer.setStyle(
            { model: state.viewer.getModel() },
            { stick: { radius: 0.2, colorscheme: 'Jmol' }, sphere: { scale: 0.3, colorscheme: 'Jmol' } }
        );
        state.viewer.zoomTo();
        state.viewer.render();
        state.hasLigand = true;

    } catch (err) {
        showError(err.message || 'Failed to load ligand.');
    }
}

// ════════════════════════════════════════════════════════════
// 5. UI HELPERS
// ════════════════════════════════════════════════════════════
function setLoading(loading) {
    state.isLoading = loading;
    if (loading) {
        el.loadPdbBtn.classList.add('loading');
        el.loadPdbBtn.disabled = true;
    } else {
        el.loadPdbBtn.classList.remove('loading');
        el.loadPdbBtn.disabled = false;
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

function updateStyleBtn(switcher, activeStyle) {
    switcher.querySelectorAll('.style-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.style === activeStyle || btn.dataset.color === activeStyle)
    );
}

// ════════════════════════════════════════════════════════════
// 6. EVENT LISTENERS
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initBackground();

    el.loadPdbBtn.addEventListener('click', loadProtein);
    el.pdbInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loadProtein(); } });

    el.loadLigandBtn.addEventListener('click', loadLigand);
    el.ligandInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loadLigand(); } });

    // Quick pick chips
    document.querySelectorAll('.chip[data-pdb]').forEach(chip =>
        chip.addEventListener('click', () => {
            el.pdbInput.value = chip.dataset.pdb;
            loadProtein();
        })
    );

    // Protein style switcher
    el.proteinSwitcher.addEventListener('click', e => {
        const btn = e.target.closest('.style-btn');
        if (!btn) return;
        state.proteinStyle = btn.dataset.style;
        updateStyleBtn(el.proteinSwitcher, state.proteinStyle);
        if (!state.viewer) return;
        // Remove old surface if switching away
        state.viewer.removeAllSurfaces?.();
        applyProteinStyle();
        applyLigandStyle();
    });

    // Color switcher
    el.colorSwitcher.addEventListener('click', e => {
        const btn = e.target.closest('.style-btn');
        if (!btn) return;
        state.colorScheme = btn.dataset.color;
        updateStyleBtn(el.colorSwitcher, state.colorScheme);
        if (!state.viewer) return;
        applyProteinStyle();
        applyLigandStyle();
    });

    // Reset view
    el.resetBtn.addEventListener('click', () => {
        if (!state.viewer) return;
        state.viewer.zoomTo();
        state.viewer.render();
    });

    // Spin
    el.spinBtn.addEventListener('click', () => {
        if (!state.viewer) return;
        state.isSpinning = !state.isSpinning;
        state.viewer.spin(state.isSpinning);
        el.spinBtn.classList.toggle('active', state.isSpinning);
    });

    el.toastClose.addEventListener('click', hideError);

    // Resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (state.viewer) { state.viewer.resize(); state.viewer.render(); }
        }, 200);
    });
});
