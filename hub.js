/* ========================================================
   ChemHub — Background Particle Animation (theme-aware)
   ======================================================== */

function initBackground() {
    const canvas = document.getElementById('bg-canvas');
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

    function isLight() {
        return document.documentElement.getAttribute('data-theme') === 'light';
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const light = isLight();

        /* Vignette gradient */
        const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        if (light) {
            grad.addColorStop(0, 'rgba(255, 245, 250, 0)');
            grad.addColorStop(1, 'rgba(240, 225, 235, 0.12)');
        } else {
            grad.addColorStop(0, 'rgba(10, 10, 40, 0)');
            grad.addColorStop(1, 'rgba(6, 6, 14, 0.4)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        /* Particle colour */
        const particleColor = light
            ? [200, 0, 106]   /* deep rose-pink on light */
            : [0, 229, 255];  /* cyan on dark */

        for (const p of particles) {
            p.x += p.dx; p.y += p.dy;
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${particleColor[0]}, ${particleColor[1]}, ${particleColor[2]}, ${light ? p.opacity * 0.55 : p.opacity})`;
            ctx.fill();
        }

        /* Connection lines */
        const [r, g, b] = particleColor;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const alpha = (light ? 0.018 : 0.03) * (1 - dist / 150);
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

document.addEventListener('DOMContentLoaded', () => {
    initBackground();

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
