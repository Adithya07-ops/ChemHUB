/* ========================================================
   ChemCalc — Application Logic
   ======================================================== */

const elems = {
    // Mole Calc
    moleMass: document.getElementById('mole-mass'),
    moleMolarMass: document.getElementById('mole-molar-mass'),
    resMoles: document.getElementById('res-moles'),

    // Molarity Calc
    molMoles: document.getElementById('molarity-moles'),
    molVol: document.getElementById('molarity-volume'),
    resMolarity: document.getElementById('res-molarity'),

    // Mass Conv
    massMg: document.getElementById('mass-mg'),
    massG: document.getElementById('mass-g'),
    massKg: document.getElementById('mass-kg'),

    // Vol Conv
    volMl: document.getElementById('vol-ml'),
    volL: document.getElementById('vol-l'),

    // Temp Conv
    tempC: document.getElementById('temp-c'),
    tempK: document.getElementById('temp-k'),
    tempF: document.getElementById('temp-f'),

    // Toast
    errorToast: document.getElementById('error-toast'),
    errorMessage: document.getElementById('error-message'),
    toastClose: document.getElementById('toast-close'),
    bgCanvas: document.getElementById('bg-canvas')
};

let toastTimer = null;

// ════════════════════════════════════════════════════════════
// 1. ANIMATED BACKGROUND
// ════════════════════════════════════════════════════════════
function initBackground() {
    const canvas = elems.bgCanvas;
    if (!canvas) return;
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
        const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
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
            ctx.fillStyle = `rgba(16, 185, 129, ${p.opacity})`; // Using green accent here
            ctx.fill();
        }

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${0.03 * (1 - dist / 150)})`;
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

// ════════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════════
function showError(message) {
    clearTimeout(toastTimer);
    elems.errorMessage.textContent = message;
    elems.errorToast.classList.remove('hidden');
    void elems.errorToast.offsetHeight;
    elems.errorToast.classList.add('visible');
    toastTimer = setTimeout(hideError, 4000);
}

function hideError() {
    elems.errorToast.classList.remove('visible');
    setTimeout(() => elems.errorToast.classList.add('hidden'), 400);
}

function formatResult(val) {
    if (isNaN(val) || !isFinite(val)) return '0.000';
    // Format to 4 decimals max, avoiding scientific notation clutter for most uses
    return parseFloat(val.toFixed(5)).toString();
}

function isValidNum(str) {
    if (!str.trim()) return false;
    const num = Number(str);
    return !isNaN(num);
}

// ════════════════════════════════════════════════════════════
// CALCULATORS
// ════════════════════════════════════════════════════════════

// 1. Mole Calculator
function calcMoles() {
    const m = elems.moleMass.value;
    const mm = elems.moleMolarMass.value;
    if (isValidNum(m) && isValidNum(mm)) {
        if (Number(mm) === 0) {
            showError("Molar mass cannot be zero");
            elems.resMoles.textContent = '0.000';
            return;
        }
        elems.resMoles.textContent = formatResult(Number(m) / Number(mm));
    } else {
        elems.resMoles.textContent = '0.000';
    }
}
elems.moleMass.addEventListener('input', calcMoles);
elems.moleMolarMass.addEventListener('input', calcMoles);

// 2. Molarity Calculator
function calcMolarity() {
    const m = elems.molMoles.value;
    const v = elems.molVol.value;
    if (isValidNum(m) && isValidNum(v)) {
        if (Number(v) === 0) {
            showError("Volume cannot be zero");
            elems.resMolarity.textContent = '0.000';
            return;
        }
        elems.resMolarity.textContent = formatResult(Number(m) / Number(v));
    } else {
        elems.resMolarity.textContent = '0.000';
    }
}
elems.molMoles.addEventListener('input', calcMolarity);
elems.molVol.addEventListener('input', calcMolarity);

// 3. Mass Conversion
let massLock = false;
elems.massMg.addEventListener('input', (e) => {
    if(massLock) return; massLock = true;
    if(isValidNum(e.target.value)) {
        const val = Number(e.target.value);
        elems.massG.value = val / 1000;
        elems.massKg.value = val / 1000000;
    } else {
        elems.massG.value = elems.massKg.value = '';
    }
    massLock = false;
});
elems.massG.addEventListener('input', (e) => {
    if(massLock) return; massLock = true;
    if(isValidNum(e.target.value)) {
        const val = Number(e.target.value);
        elems.massMg.value = val * 1000;
        elems.massKg.value = val / 1000;
    } else {
        elems.massMg.value = elems.massKg.value = '';
    }
    massLock = false;
});
elems.massKg.addEventListener('input', (e) => {
    if(massLock) return; massLock = true;
    if(isValidNum(e.target.value)) {
        const val = Number(e.target.value);
        elems.massMg.value = val * 1000000;
        elems.massG.value = val * 1000;
    } else {
        elems.massMg.value = elems.massG.value = '';
    }
    massLock = false;
});

// 4. Volume Conversion
let volLock = false;
elems.volMl.addEventListener('input', (e) => {
    if(volLock) return; volLock = true;
    if(isValidNum(e.target.value)) {
        elems.volL.value = Number(e.target.value) / 1000;
    } else {
        elems.volL.value = '';
    }
    volLock = false;
});
elems.volL.addEventListener('input', (e) => {
    if(volLock) return; volLock = true;
    if(isValidNum(e.target.value)) {
        elems.volMl.value = Number(e.target.value) * 1000;
    } else {
        elems.volMl.value = '';
    }
    volLock = false;
});

// 5. Temperature Conversion
let tempLock = false;
elems.tempC.addEventListener('input', (e) => {
    if(tempLock) return; tempLock = true;
    if(isValidNum(e.target.value)) {
        const c = Number(e.target.value);
        elems.tempK.value = parseFloat((c + 273.15).toFixed(3));
        elems.tempF.value = parseFloat(((c * 9/5) + 32).toFixed(3));
    } else {
        elems.tempK.value = elems.tempF.value = '';
    }
    tempLock = false;
});
elems.tempK.addEventListener('input', (e) => {
    if(tempLock) return; tempLock = true;
    if(isValidNum(e.target.value)) {
        const k = Number(e.target.value);
        if(k < 0) showError("Kelvin cannot be negative");
        elems.tempC.value = parseFloat((k - 273.15).toFixed(3));
        elems.tempF.value = parseFloat(((k - 273.15) * 9/5 + 32).toFixed(3));
    } else {
        elems.tempC.value = elems.tempF.value = '';
    }
    tempLock = false;
});
elems.tempF.addEventListener('input', (e) => {
    if(tempLock) return; tempLock = true;
    if(isValidNum(e.target.value)) {
        const f = Number(e.target.value);
        elems.tempC.value = parseFloat(((f - 32) * 5/9).toFixed(3));
        elems.tempK.value = parseFloat(((f - 32) * 5/9 + 273.15).toFixed(3));
    } else {
        elems.tempC.value = elems.tempK.value = '';
    }
    tempLock = false;
});

// ════════════════════════════════════════════════════════════
// URL PARAMETERS & INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initBackground();
    
    elems.toastClose.addEventListener('click', hideError);

    // Read URL params for Viewer integration
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('molarmass')) {
        const mm = urlParams.get('molarmass');
        if(isValidNum(mm)) {
            elems.moleMolarMass.value = mm;
            // Optionally set focus to mass input so user can type mass directly
            elems.moleMass.focus();
        }
    }
});
