/* ========================================================
   ChemHub — Background Particle Animation (theme-aware)
   ======================================================== */

function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let time = 0;
    
    // Config
    const ORBIT_COUNT = 3;
    const BASE_RADIUS = 120;
    const DOT_RADIUS = 2.5;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function isLight() {
        return document.documentElement.getAttribute('data-theme') === 'light';
    }

    function drawCenterpiece() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const light = isLight();
        /* Dynamic colors based on theme */
        const coreColor = 'rgba(200, 0, 106, ';
        const bgCenter = light ? 'rgba(255, 255, 255, 0.5)' : 'rgba(6, 6, 14, 0)';
        const bgEdge = light ? 'rgba(240, 244, 248, 1)' : 'rgba(6, 6, 14, 1)';

        // Background gradient
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.35; 
        
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.6);
        grad.addColorStop(0, bgCenter);
        grad.addColorStop(1, bgEdge);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw glowing nucleus
        ctx.beginPath();
        const nGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
        nGrad.addColorStop(0, coreColor + '0.8)');
        nGrad.addColorStop(1, coreColor + '0)');
        ctx.fillStyle = nGrad;
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = coreColor + '1)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = coreColor + '1)';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw orbits and electrons
        for (let i = 0; i < ORBIT_COUNT; i++) {
            const angleOffset = (Math.PI / ORBIT_COUNT) * i + (time * 0.0001);
            const radiusX = BASE_RADIUS + (i * 20);
            const radiusY = radiusX * 0.3;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleOffset);

            // Orbit path
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = coreColor + '0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Electron
            const eAngle = time * (0.0005 + (i * 0.0001)) + (i * Math.PI / 2);
            const ex = Math.cos(eAngle) * radiusX;
            const ey = Math.sin(eAngle) * radiusY;

            ctx.beginPath();
            ctx.arc(ex, ey, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = coreColor + '0.9)';
            ctx.shadowBlur = 6;
            ctx.shadowColor = coreColor + '0.8)';
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // Ambient elements
        drawDust(ctx, light);
        drawChemicals(ctx, light);
        drawMolecules(ctx, light);

        time += 16;
        requestAnimationFrame(drawCenterpiece);
    }

    // A small subset of scattered particles for depth
    const dustCount = 30;
    const dust = Array.from({length: dustCount}, () => ({
        x: Math.random(),
        y: Math.random(),
        speed: Math.random() * 0.0002 + 0.00005
    }));

    // Chemistry symbols setup
    const chemSymbols = ['H', 'C', 'N', 'O', 'S', 'P', 'Fe', 'Cu', 'Cl', 'Br'];
    const chems = Array.from({length: 12}, () => ({
        x: Math.random(),
        y: Math.random(),
        symbol: chemSymbols[Math.floor(Math.random() * chemSymbols.length)],
        size: Math.floor(Math.random() * 8) + 14,
        speed: Math.random() * 0.00008 + 0.00002,
        opacity: Math.random() * 0.15 + 0.08
    }));

    // Skeletal fragments setup
    const molFragments = Array.from({length: 6}, () => ({
        x: Math.random(),
        y: Math.random(),
        type: Math.floor(Math.random() * 3),
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        speed: Math.random() * 0.00006 + 0.00002,
        opacity: Math.random() * 0.15 + 0.08
    }));

    function drawDust(ctx, light) {
        const color = light ? 'rgba(200, 0, 106, 0.25)' : 'rgba(200, 0, 106, 0.22)';
        ctx.fillStyle = color;
        dust.forEach(d => {
            const px = (d.x * canvas.width + time * d.speed * canvas.width) % canvas.width;
            const py = (d.y * canvas.height - time * d.speed * canvas.height * 0.5) % canvas.height;
            const y = py < 0 ? py + canvas.height : py;
            ctx.beginPath();
            ctx.arc(px, y, 1.8, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawChemicals(ctx, light) {
        const color = 'rgba(200, 0, 106, ';
        chems.forEach(c => {
            ctx.font = `bold ${c.size}px "JetBrains Mono", monospace`;
            const px = (c.x * canvas.width + time * c.speed * canvas.width) % canvas.width;
            const py = (c.y * canvas.height - time * c.speed * canvas.height * 0.8) % canvas.height;
            const y = py < 0 ? py + canvas.height : py;
            
            ctx.fillStyle = color + c.opacity + ')';
            ctx.fillText(c.symbol, px, y);
        });
    }

    function drawMolecules(ctx, light) {
        const color = 'rgba(200, 0, 106, ';
        molFragments.forEach(m => {
            const px = (m.x * canvas.width + time * m.speed * canvas.width * 0.7) % canvas.width;
            const py = (m.y * canvas.height - time * m.speed * canvas.height * 0.4) % canvas.height;
            const y = py < 0 ? py + canvas.height : py;
            
            ctx.save();
            ctx.translate(px, y);
            ctx.rotate(m.angle + time * m.rotationSpeed);
            ctx.strokeStyle = color + m.opacity + ')';
            ctx.lineWidth = 1.5;

            const scale = 1.5;

            if (m.type === 0) { // Benzene ring
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const ang = (i * Math.PI) / 3;
                    const x = 15 * scale * Math.cos(ang);
                    const y = 15 * scale * Math.sin(ang);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (m.type === 1) { // Branched structure
                ctx.beginPath();
                ctx.moveTo(0,0); ctx.lineTo(0, -15 * scale);
                ctx.moveTo(0,0); ctx.lineTo(12 * scale, 9 * scale);
                ctx.moveTo(0,0); ctx.lineTo(-12 * scale, 9 * scale);
                ctx.stroke();
            } else { // Single bond pair
                ctx.beginPath();
                ctx.moveTo(-15 * scale, 0); ctx.lineTo(15 * scale, 0);
                ctx.stroke();
                ctx.fillStyle = color + m.opacity + ')';
                ctx.beginPath(); ctx.arc(-15 * scale, 0, 3 * scale, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(15 * scale, 0, 3 * scale, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        });
    }

    resize();
    drawCenterpiece();
    window.addEventListener('resize', resize);
}

document.addEventListener('DOMContentLoaded', () => {
    initBackground();

    const exploreToolsLink = document.querySelector('.hero-cta[href="#tool-grid"]');
    const toolGrid = document.getElementById('tool-grid');
    if (exploreToolsLink && toolGrid) {
        exploreToolsLink.addEventListener('click', event => {
            event.preventDefault();
            toolGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Toast close
    const toastClose = document.getElementById('toast-close');
    if (toastClose) {
        toastClose.addEventListener('click', () => {
            const toast = document.getElementById('error-toast');
            toast.classList.remove('visible');
            setTimeout(() => toast.classList.add('hidden'), 400);
        });
    }
});
