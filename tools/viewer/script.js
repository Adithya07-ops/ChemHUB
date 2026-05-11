/* ========================================================
   Computational Chemistry 3D Viewer — Application Logic
   ======================================================== */

// ── DOM References ──
const elements = {
    input: document.getElementById('molecule-input'),
    visualizeBtn: document.getElementById('visualize-btn'),
    btnLoader: document.getElementById('btn-loader'),
    viewerContainer: document.getElementById('viewer-container'),
    viewerEmpty: document.getElementById('viewer-empty'),
    infoPlaceholder: document.getElementById('info-placeholder'),
    infoLoading: document.getElementById('info-loading'),
    infoContent: document.getElementById('info-content'),
    infoName: document.getElementById('info-name'),
    infoFormula: document.getElementById('info-formula'),
    infoWeight: document.getElementById('info-weight'),
    infoSmiles: document.getElementById('info-smiles'),
    infoAtoms: document.getElementById('info-atoms'),     // NEW
    infoBonds: document.getElementById('info-bonds'),     // NEW
    resetBtn: document.getElementById('reset-view-btn'),
    spinBtn: document.getElementById('spin-btn'),
    styleSwitcher: document.getElementById('style-switcher'),
    errorToast: document.getElementById('error-toast'),
    errorMessage: document.getElementById('error-message'),
    toastClose: document.getElementById('toast-close'),
    sendChemcalcBtn: document.getElementById('send-chemcalc-btn'),
    labelsBtn: document.getElementById('labels-btn'),
    downloadBtn: document.getElementById('download-btn'),
    smilesCopyBtn: document.getElementById('smiles-copy-btn'),
    bgCanvas: document.getElementById('bg-canvas'),
    viewerLoading: document.getElementById('viewer-loading'), // NEW
    atomTooltip: document.getElementById('atom-tooltip'),   // NEW
};

// ── Application State ──
const state = {
    viewer: null,           // 3Dmol viewer instance
    currentStyle: 'stick',  // stick | sphere | ball-and-stick
    isSpinning: false,
    isLoading: false,
    showLabels: false,      // NEW: atom labels toggle
    currentMolData: null,
    toastTimer: null,
    tooltipTrackingReady: false,
};

// ── Atomic Number Lookup (NEW) ──
const ATOMIC_NUMBERS = {
    H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
    Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
    K: 19, Ca: 20, Sc: 21, Ti: 22, V: 23, Cr: 24, Mn: 25, Fe: 26,
    Co: 27, Ni: 28, Cu: 29, Zn: 30, Ga: 31, Ge: 32, As: 33, Se: 34,
    Br: 35, Kr: 36, Rb: 37, Sr: 38, Y: 39, Zr: 40, Nb: 41, Mo: 42,
    I: 53, Xe: 54, Pt: 78, Au: 79, Hg: 80, Pb: 82
};

// ════════════════════════════════════════════════════════════
// 1. ANIMATED BACKGROUND (Subtle Particle Field)
// ════════════════════════════════════════════════════════════

/**
 * Creates an ambient particle animation on the background canvas.
 * Uses lightweight rendering to avoid impacting main viewer performance.
 */
function initBackground() {
    const canvas = elements.bgCanvas;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;
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

        // Subtle gradient overlay
        const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        grad.addColorStop(0, isLight ? 'rgba(255, 255, 255, 0)' : 'rgba(10, 10, 40, 0)');
        grad.addColorStop(1, isLight ? 'rgba(240, 244, 248, 1)' : 'rgba(6, 6, 14, 0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw particles
        for (const p of particles) {
            p.x += p.dx;
            p.y += p.dy;

            // Wrap around
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 255, ${p.opacity})`;
            ctx.fill();
        }

        // Draw faint connections between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 229, 255, ${0.03 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        animId = requestAnimationFrame(drawParticles);
    }

    resize();
    createParticles();
    drawParticles();

    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });
}

// ════════════════════════════════════════════════════════════
// 2. PUBCHEM API INTEGRATION
// ════════════════════════════════════════════════════════════

const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PUBCHEM_TIMEOUT_MS = 10000;
const PUBCHEM_RETRY_DELAY_MS = 700;

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

function parseSdfCounts(sdf) {
    const countsLine = sdf.split(/\r?\n/)[3] || '';
    const atoms = Number.parseInt(countsLine.slice(0, 3), 10);
    const bonds = Number.parseInt(countsLine.slice(3, 6), 10);
    return {
        atoms: Number.isFinite(atoms) ? atoms : null,
        bonds: Number.isFinite(bonds) ? bonds : null,
    };
}

/**
 * Determines if the input looks like a SMILES string.
 * Heuristic: contains special chars common in SMILES but not in names.
 */
function looksLikeSMILES(input) {
    return /[=#@\[\]\\\/\(\)]/.test(input) || /^[A-Za-z0-9\+\-\.\#\%\(\)\[\]\\\/\=\@]+$/.test(input) && /[A-Z]/.test(input) && input.length <= 200 && !/\s/.test(input);
}

/**
 * Fetches molecular data from PubChem.
 * Supports both molecule names and SMILES strings.
 * Returns { name, formula, weight, smiles, sdf }
 */
async function fetchMoleculeData(query) {
    const trimmed = query.trim();
    if (!trimmed) throw new Error('Please enter a molecule name or SMILES string.');

    let cid;
    const isSMILES = looksLikeSMILES(trimmed);

    // Step 1: Resolve CID
    if (isSMILES) {
        const url = `${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(trimmed)}/cids/JSON`;
        const res = await fetchWithRetry(url);
        if (!res.ok) throw new Error(`Molecule not found for SMILES: "${trimmed}"`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error('No results found for this SMILES.');
        cid = data.IdentifierList.CID[0];
    } else {
        const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(trimmed)}/cids/JSON`;
        const res = await fetchWithRetry(url);
        if (!res.ok) throw new Error(`Molecule "${trimmed}" not found. Check spelling or try a SMILES string.`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error(`No results for "${trimmed}".`);
        cid = data.IdentifierList.CID[0];
    }

    // Step 2: Fetch properties and 3D SDF in parallel
    const propsUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES/JSON`;
    const sdfUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=3d`;

    const [propsRes, sdfRes] = await Promise.all([
        fetchWithRetry(propsUrl),
        fetchWithRetry(sdfUrl),
    ]);

    if (!propsRes.ok) throw new Error('Failed to fetch molecule properties.');
    const propsData = await propsRes.json();
    const props = propsData.PropertyTable?.Properties?.[0];
    if (!props) throw new Error('No property data returned.');

    // Prefer CanonicalSMILES, fall back to IsomericSMILES, SMILES, or ConnectivitySMILES
    const smiles = props.CanonicalSMILES || props.IsomericSMILES || props.SMILES || props.ConnectivitySMILES || null;

    // Step 3: Resolve SDF (3D preferred, 2D fallback)
    let sdf = null;
    if (sdfRes.ok) {
        sdf = await sdfRes.text();
    } else {
        const sdf2dRes = await fetchWithRetry(`${PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=2d`);
        if (sdf2dRes.ok) sdf = await sdf2dRes.text();
    }

    if (!sdf) throw new Error('3D structure data unavailable for this molecule.');

    return {
        name: props.IUPACName || trimmed,
        formula: props.MolecularFormula || '—',
        weight: props.MolecularWeight ? `${props.MolecularWeight} g/mol` : '—',
        rawWeight: props.MolecularWeight || null,
        smiles: smiles || '—',
        sdf,
    };
}

// ════════════════════════════════════════════════════════════
// 3. 3DMOL VIEWER MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * Initializes or resets the 3Dmol.js viewer in the container.
 */
function initViewer() {
    if (typeof $3Dmol === 'undefined') {
        throw new Error('3Dmol.js failed to load. Check your internet connection and reload the page.');
    }

    // Clear previous viewer if it exists
    if (state.viewer) {
        state.viewer.clear();
        state.viewer = null;
    }

    // Remove any existing canvas from previous viewer
    const existingCanvases = elements.viewerContainer.querySelectorAll('canvas:not(#bg-canvas)');
    existingCanvases.forEach(c => {
        if (c.id !== 'bg-canvas') c.remove();
    });

    // Remove any previous viewer div
    const oldDiv = elements.viewerContainer.querySelector('.mol-viewer-div');
    if (oldDiv) oldDiv.remove();

    // Create a dedicated div for 3Dmol
    const viewerDiv = document.createElement('div');
    viewerDiv.className = 'mol-viewer-div';
    viewerDiv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    elements.viewerContainer.appendChild(viewerDiv);

    const theme = window.ChemHubTheme ? window.ChemHubTheme.getTheme() : 'dark';
    const bgColor = theme === 'light' ? '#ffffff' : 'rgba(0,0,0,0)';

    state.viewer = $3Dmol.createViewer(viewerDiv, {
        backgroundColor: bgColor,
        antialias: true,
    });

    return state.viewer;
}

/**
 * Applies the current render style to the model in the viewer.
 */
function applyStyle(styleName) {
    if (!state.viewer) return;
    state.viewer.setStyle({}, {}); // Clear styles

    switch (styleName) {
        case 'stick':
            state.viewer.setStyle({}, {
                stick: { radius: 0.15, colorscheme: 'Jmol' },
            });
            break;
        case 'sphere':
            state.viewer.setStyle({}, {
                sphere: { scale: 0.3, colorscheme: 'Jmol' },
            });
            break;
        case 'ball-and-stick':
            state.viewer.setStyle({}, {
                stick: { radius: 0.1, colorscheme: 'Jmol' },
                sphere: { scale: 0.22, colorscheme: 'Jmol' },
            });
            break;
    }

    state.viewer.render();
}

/**
 * Loads SDF data into the viewer and renders it.
 */
function loadMolecule(sdf) {
    const viewer = initViewer();

    viewer.addModel(sdf, 'sdf');
    applyStyle(state.currentStyle);

    // NEW: Re-apply labels if they were on
    if (state.showLabels) {
        addAtomLabels();
    }

    // NEW: Set up atom hover handler
    setupAtomHover(viewer);

    viewer.zoomTo();
    viewer.render();

    // Re-apply spin state
    if (state.isSpinning) {
        viewer.spin(true);
    }
}

// ════════════════════════════════════════════════════════════
// 3b. ATOM HOVER TOOLTIP (NEW)
// ════════════════════════════════════════════════════════════

/**
 * Attaches hover callbacks to the viewer so hovering over an atom
 * shows a lightweight tooltip with element symbol + atomic number.
 */
function setupAtomHover(viewer) {
    viewer.setHoverable(
        {},   // select all atoms
        true, // hoverable
        // on hover
        function (atom, _viewer, _event, container) {
            if (!atom) return;
            const elem = atom.elem || '?';
            const num = ATOMIC_NUMBERS[elem] || '?';
            elements.atomTooltip.innerHTML = `<strong>${elem}</strong> &middot; #${num}`;
            elements.atomTooltip.classList.remove('hidden');
        },
        // on unhover
        function () {
            elements.atomTooltip.classList.add('hidden');
        }
    );

    if (state.tooltipTrackingReady) return;
    state.tooltipTrackingReady = true;

    // Track mouse to position tooltip inside viewer container
    elements.viewerContainer.addEventListener('mousemove', (e) => {
        if (elements.atomTooltip.classList.contains('hidden')) return;
        const rect = elements.viewerContainer.getBoundingClientRect();
        elements.atomTooltip.style.left = (e.clientX - rect.left + 14) + 'px';
        elements.atomTooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    });
}

// ════════════════════════════════════════════════════════════
// 3c. ATOM LABELS (NEW)
// ════════════════════════════════════════════════════════════

/**
 * Adds element-symbol labels to every atom in the current model.
 */
function addAtomLabels() {
    if (!state.viewer) return;
    state.viewer.removeAllLabels();
    
    const theme = window.ChemHubTheme ? window.ChemHubTheme.getTheme() : 'dark';
    const isLight = theme === 'light';
    
    const atoms = state.viewer.getModel()?.selectedAtoms({}) || [];
    for (const atom of atoms) {
        state.viewer.addLabel(atom.elem, {
            position: { x: atom.x, y: atom.y, z: atom.z },
            fontSize: 11,
            fontColor: isLight ? '#1a1a3a' : 'white',
            backgroundOpacity: isLight ? 0.8 : 0.35,
            backgroundColor: isLight ? '#f0f4f8' : '#1a1a3a',
            borderColor: isLight ? '#e91e8c' : '#00e5ff',
            borderThickness: 0.8,
            padding: 2,
        });
    }
    state.viewer.render();
}

/**
 * Removes all atom labels.
 */
function removeAtomLabels() {
    if (!state.viewer) return;
    state.viewer.removeAllLabels();
    state.viewer.render();
}

// ════════════════════════════════════════════════════════════
// 3d. EXPORT AS IMAGE (NEW)
// ════════════════════════════════════════════════════════════

/**
 * Captures the current viewer canvas and triggers a PNG download.
 */
function downloadViewerImage() {
    if (!state.viewer) {
        showError('Load a molecule first before downloading.');
        return;
    }
    try {
        const imgData = state.viewer.pngURI();
        const link = document.createElement('a');
        link.download = 'molecule-3d.png';
        link.href = imgData;
        link.click();
    } catch (err) {
        console.error('Download error:', err);
        showError('Failed to capture image. Please try again.');
    }
}

// ════════════════════════════════════════════════════════════
// 4. UI UPDATE HELPERS
// ════════════════════════════════════════════════════════════

/**
 * Shows/hides the loading state for the info panel.
 */
function setInfoLoading(loading) {
    elements.infoPlaceholder.classList.add('hidden');
    if (loading) {
        elements.infoLoading.classList.remove('hidden');
        elements.infoContent.classList.add('hidden');
    } else {
        elements.infoLoading.classList.add('hidden');
    }
}

/**
 * Populates the info panel with molecule data.
 */
function showInfo(data) {
    elements.infoLoading.classList.add('hidden');
    elements.infoContent.classList.remove('hidden');
    elements.infoPlaceholder.classList.add('hidden');

    // Capitalize first letter of IUPAC name
    const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    elements.infoName.textContent = name;
    elements.infoFormula.textContent = data.formula;
    elements.infoWeight.textContent = data.weight;
    elements.infoSmiles.textContent = data.smiles;
    elements.infoSmiles.title = data.smiles; // Show full SMILES on hover
    elements.infoAtoms.textContent = data.atoms ?? '—';
    elements.infoBonds.textContent = data.bonds ?? '—';

    if (data.rawWeight) {
        elements.sendChemcalcBtn.classList.remove('hidden');
        elements.sendChemcalcBtn.dataset.weight = data.rawWeight;
    } else {
        elements.sendChemcalcBtn.classList.add('hidden');
    }

    if (data.smiles && data.smiles !== '—') {
        elements.smilesCopyBtn.classList.remove('hidden');
    } else {
        elements.smilesCopyBtn.classList.add('hidden');
    }
}

/**
 * Sets the loading state on the Visualize button.
 */
function setButtonLoading(loading) {
    state.isLoading = loading;
    if (loading) {
        elements.visualizeBtn.classList.add('loading');
        elements.visualizeBtn.disabled = true;
    } else {
        elements.visualizeBtn.classList.remove('loading');
        elements.visualizeBtn.disabled = false;
    }
}

/**
 * Displays an error toast message.
 */
function showError(message) {
    clearTimeout(state.toastTimer);
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.remove('hidden');

    // Force reflow, then add visible class for animation
    void elements.errorToast.offsetHeight;
    elements.errorToast.classList.add('visible');

    state.toastTimer = setTimeout(hideError, 6000);
}

function hideError() {
    elements.errorToast.classList.remove('visible');
    setTimeout(() => elements.errorToast.classList.add('hidden'), 400);
}

/**
 * Updates active style button in the switcher.
 */
function updateStyleButtons(activeStyle) {
    elements.styleSwitcher.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.style === activeStyle);
    });
}

// ════════════════════════════════════════════════════════════
// 5. MAIN VISUALIZE FLOW
// ════════════════════════════════════════════════════════════

/**
 * Main handler: fetches data and renders the molecule.
 */
async function visualizeMolecule() {
    const query = elements.input.value.trim();
    if (!query) {
        showError('Please enter a molecule name or SMILES string.');
        return;
    }
    if (state.isLoading) return;

    setButtonLoading(true);
    setInfoLoading(true);

    // NEW: Show viewer loading overlay
    elements.viewerLoading.classList.remove('hidden');

    try {
        const data = await fetchMoleculeData(query);
        const counts = parseSdfCounts(data.sdf);
        data.atoms = counts.atoms;
        data.bonds = counts.bonds;
        state.currentMolData = data;

        // Hide empty state
        elements.viewerEmpty.classList.add('hidden');

        // Load into viewer
        loadMolecule(data.sdf);

        // Show info
        showInfo(data);
    } catch (err) {
        console.error('Visualization error:', err);
        showError(err.message || 'Unable to load molecule. Please try again.');
        setInfoLoading(false);
        elements.infoPlaceholder.classList.remove('hidden');
    } finally {
        setButtonLoading(false);
        // NEW: Hide viewer loading overlay
        elements.viewerLoading.classList.add('hidden');
    }
}

// ════════════════════════════════════════════════════════════
// 6. EVENT LISTENERS
// ════════════════════════════════════════════════════════════

function initEventListeners() {
    // Visualize button
    elements.visualizeBtn.addEventListener('click', visualizeMolecule);

    // Enter key in input
    elements.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            visualizeMolecule();
        }
    });

    // Quick pick chips
    document.querySelectorAll('.chip[data-molecule]').forEach(chip => {
        chip.addEventListener('click', () => {
            elements.input.value = chip.dataset.molecule;
            visualizeMolecule();
        });
    });

    // Style switcher
    elements.styleSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.style-btn');
        if (!btn) return;
        state.currentStyle = btn.dataset.style;
        updateStyleButtons(state.currentStyle);
        applyStyle(state.currentStyle);
    });

    // Reset view
    elements.resetBtn.addEventListener('click', () => {
        if (!state.viewer) return;
        state.viewer.zoomTo();
        state.viewer.render();
    });

    // Toggle spin
    elements.spinBtn.addEventListener('click', () => {
        if (!state.viewer) return;
        state.isSpinning = !state.isSpinning;
        state.viewer.spin(state.isSpinning);
        elements.spinBtn.classList.toggle('active', state.isSpinning);
    });

    // Toast close
    elements.toastClose.addEventListener('click', hideError);

    // Handle window resize for viewer
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (state.viewer) {
                state.viewer.resize();
                state.viewer.render();
            }
        }, 200);
    });

    // Send to ChemCalc
    elements.sendChemcalcBtn.addEventListener('click', () => {
        const weight = elements.sendChemcalcBtn.dataset.weight;
        if (weight) {
            window.location.href = '../chemcalc/index.html?molarmass=' + encodeURIComponent(weight);
        }
    });

    elements.labelsBtn.addEventListener('click', () => {
        if (!state.viewer) {
            showError('Load a molecule first before toggling labels.');
            return;
        }
        state.showLabels = !state.showLabels;
        elements.labelsBtn.classList.toggle('active', state.showLabels);
        if (state.showLabels) addAtomLabels();
        else removeAtomLabels();
    });

    elements.downloadBtn.addEventListener('click', downloadViewerImage);

    // Sync with ChemHub Theme Changes
    if (window.ChemHubTheme) {
        window.ChemHubTheme.onThemeChange((theme) => {
            if (state.viewer) {
                const bgColor = theme === 'light' ? '#ffffff' : 'rgba(0,0,0,0)';
                state.viewer.setBackgroundColor(bgColor);
                
                // Update labels if visible
                if (state.showLabels) addAtomLabels();
                
                state.viewer.render();
            }
        });
    }

    elements.smilesCopyBtn.addEventListener('click', async () => {
        const smiles = state.currentMolData?.smiles;
        if (!smiles || smiles === '—') return;
        try {
            await navigator.clipboard.writeText(smiles);
            elements.smilesCopyBtn.classList.add('copied');
            elements.smilesCopyBtn.textContent = 'Copied';
            setTimeout(() => {
                elements.smilesCopyBtn.classList.remove('copied');
                elements.smilesCopyBtn.textContent = 'Copy';
            }, 1400);
        } catch {
            showError('Clipboard access was blocked by the browser.');
        }
    });
}

// ════════════════════════════════════════════════════════════
// 7. INITIALIZATION
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initBackground();
    initEventListeners();

    // Focus input on load
    elements.input.focus();
});
