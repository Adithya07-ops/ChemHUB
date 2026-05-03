/* ========================================================
   Computational Chemistry 3D Viewer — Application Logic
   ======================================================== */

// ── DOM References ──
const elements = {
    input:          document.getElementById('molecule-input'),
    visualizeBtn:   document.getElementById('visualize-btn'),
    btnLoader:      document.getElementById('btn-loader'),
    viewerContainer:document.getElementById('viewer-container'),
    viewerEmpty:    document.getElementById('viewer-empty'),
    infoPlaceholder:document.getElementById('info-placeholder'),
    infoLoading:    document.getElementById('info-loading'),
    infoContent:    document.getElementById('info-content'),
    infoName:       document.getElementById('info-name'),
    infoFormula:    document.getElementById('info-formula'),
    infoWeight:     document.getElementById('info-weight'),
    infoSmiles:     document.getElementById('info-smiles'),
    resetBtn:       document.getElementById('reset-view-btn'),
    spinBtn:        document.getElementById('spin-btn'),
    styleSwitcher:  document.getElementById('style-switcher'),
    errorToast:     document.getElementById('error-toast'),
    errorMessage:   document.getElementById('error-message'),
    toastClose:     document.getElementById('toast-close'),
    bgCanvas:       document.getElementById('bg-canvas'),
};

// ── Application State ──
const state = {
    viewer: null,           // 3Dmol viewer instance
    currentStyle: 'stick',  // stick | sphere | ball-and-stick
    isSpinning: false,
    isLoading: false,
    currentMolData: null,
    toastTimer: null,
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
        grad.addColorStop(0, 'rgba(10, 10, 40, 0)');
        grad.addColorStop(1, 'rgba(6, 6, 14, 0.4)');
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
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Molecule not found for SMILES: "${trimmed}"`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error('No results found for this SMILES.');
        cid = data.IdentifierList.CID[0];
    } else {
        const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(trimmed)}/cids/JSON`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Molecule "${trimmed}" not found. Check spelling or try a SMILES string.`);
        const data = await res.json();
        if (!data.IdentifierList?.CID?.[0]) throw new Error(`No results for "${trimmed}".`);
        cid = data.IdentifierList.CID[0];
    }

    // Step 2: Fetch properties
    const propsUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES/JSON`;
    const propsRes = await fetch(propsUrl);
    if (!propsRes.ok) throw new Error('Failed to fetch molecule properties.');
    const propsData = await propsRes.json();
    const props = propsData.PropertyTable?.Properties?.[0];
    if (!props) throw new Error('No property data returned.');

    // Step 3: Fetch 3D SDF structure
    const sdfUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=3d`;
    const sdfRes = await fetch(sdfUrl);
    let sdf = null;
    if (sdfRes.ok) {
        sdf = await sdfRes.text();
    } else {
        // Fallback: try 2D SDF
        const sdf2dUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=2d`;
        const sdf2dRes = await fetch(sdf2dUrl);
        if (sdf2dRes.ok) {
            sdf = await sdf2dRes.text();
        }
    }

    if (!sdf) throw new Error('3D structure data unavailable for this molecule.');

    return {
        name: props.IUPACName || trimmed,
        formula: props.MolecularFormula || '—',
        weight: props.MolecularWeight ? `${props.MolecularWeight} g/mol` : '—',
        smiles: props.CanonicalSMILES || '—',
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

    state.viewer = $3Dmol.createViewer(viewerDiv, {
        backgroundColor: 'rgba(0,0,0,0)',
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
    viewer.zoomTo();
    viewer.render();

    // Re-apply spin state
    if (state.isSpinning) {
        viewer.spin(true);
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

    try {
        const data = await fetchMoleculeData(query);
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
