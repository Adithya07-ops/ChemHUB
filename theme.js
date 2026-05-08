/* ========================================================
   ChemHub — Theme Manager & Ambient Glow
   Handles dark/light toggle with localStorage persistence and ambient cursor effects.
   ======================================================== */

(function () {
    const STORAGE_KEY = 'chemhub-theme';
    const DARK = 'dark';
    const LIGHT = 'light';
    const listeners = [];

    /* ── Read saved preference or system default ── */
    function getSavedTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === DARK || saved === LIGHT) return saved;
        return window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT : DARK;
    }

    /* ── Apply theme to <html> ── */
    function applyTheme(theme, animate) {
        const html = document.documentElement;
        if (animate) {
            html.classList.add('theme-transitioning');
            setTimeout(() => html.classList.remove('theme-transitioning'), 400);
        }
        html.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        updateToggleIcon(theme);
        listeners.forEach(fn => fn(theme));
    }

    /* ── Update all toggle buttons on the page ── */
    function updateToggleIcon(theme) {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const sunIcon  = btn.querySelector('.icon-sun');
            const moonIcon = btn.querySelector('.icon-moon');
            const label    = btn.querySelector('.theme-toggle-label');
            if (theme === LIGHT) {
                sunIcon  && (sunIcon.style.opacity  = '0');
                moonIcon && (moonIcon.style.opacity = '1');
                label    && (label.textContent = 'Dark');
            } else {
                sunIcon  && (sunIcon.style.opacity  = '1');
                moonIcon && (moonIcon.style.opacity = '0');
                label    && (label.textContent = 'Light');
            }
            btn.setAttribute('aria-label', theme === LIGHT ? 'Switch to dark mode' : 'Switch to light mode');
            btn.setAttribute('title', theme === LIGHT ? 'Switch to dark mode' : 'Switch to light mode');
        });
    }

    /* ── Public: get current theme ── */
    function getTheme() {
        return document.documentElement.getAttribute('data-theme') || DARK;
    }

    /* ── Public: register callback for theme changes ── */
    function onThemeChange(fn) {
        listeners.push(fn);
    }

    /* ── Init: apply saved theme immediately (no flash) ── */
    const initialTheme = getSavedTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);

    /* ── Wire up toggle buttons and Ambient Glow ── */
    function init() {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = getTheme() === DARK ? LIGHT : DARK;
                applyTheme(next, true);
            });
        });
        updateToggleIcon(initialTheme);

        // Ambient Cursor Glow (Desktop Only)
        if (window.matchMedia("(pointer: fine)").matches) {
            let glowElement = document.getElementById('desktop-cursor-glow');
            if (!glowElement) {
                glowElement = document.createElement('div');
                glowElement.id = 'desktop-cursor-glow';
                document.body.appendChild(glowElement);
            }

            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let currentX = mouseX;
            let currentY = mouseY;
            
            window.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            });

            function animateGlow() {
                currentX += (mouseX - currentX) * 0.15;
                currentY += (mouseY - currentY) * 0.15;
                glowElement.style.setProperty('--mouse-x', currentX + 'px');
                glowElement.style.setProperty('--mouse-y', currentY + 'px');
                requestAnimationFrame(animateGlow);
            }
            animateGlow();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* ── Expose API globally ── */
    window.ChemHubTheme = { getTheme, onThemeChange, applyTheme };
})();
