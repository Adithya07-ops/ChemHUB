/* ========================================================
   ChemHub — Theme Manager & Ambient Glow
   Handles dark/light toggle with localStorage persistence and ambient cursor effects.
   ======================================================== */

(function () {
    const STORAGE_KEY = 'chemhub-theme';
    const GITHUB_URL = 'https://github.com/Adithya07-ops/-3D-Molecular-Viewer.git';
    const THEME_TRANSITION_MS = 1800;
    const DARK = 'dark';
    const LIGHT = 'light';
    const listeners = [];

    /* ── Read saved preference or system default ── */
    function getSavedTheme() {
        const saved = readStoredTheme();
        if (saved === DARK || saved === LIGHT) return saved;
        return window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT : DARK;
    }

    function readStoredTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch {
            return null;
        }
    }

    function writeStoredTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* Storage can be unavailable in restricted browser contexts. */
        }
    }

    /* ── Apply theme to <html> ── */
    function applyTheme(theme, animate) {
        const html = document.documentElement;

        const commitTheme = () => {
            html.setAttribute('data-theme', theme);
            html.classList.toggle('light-theme', theme === LIGHT);
            writeStoredTheme(theme);
            updateToggleIcon(theme);
            listeners.forEach(fn => fn(theme));
        };

        if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            runThemeCrossfade(commitTheme);
            return;
        }

        if (animate) {
            html.classList.add('theme-transitioning');
            setTimeout(() => html.classList.remove('theme-transitioning'), THEME_TRANSITION_MS);
        }
        commitTheme();
    }

    function runThemeCrossfade(commitTheme) {
        const html = document.documentElement;
        const snapshot = document.createElement('div');
        const originalCanvases = Array.from(document.querySelectorAll('canvas'));

        snapshot.className = 'theme-crossfade-snapshot';
        snapshot.setAttribute('aria-hidden', 'true');
        Array.from(document.body.children).forEach(child => {
            if (!child.classList?.contains('theme-crossfade-snapshot')) {
                snapshot.appendChild(child.cloneNode(true));
            }
        });

        document.body.appendChild(snapshot);

        const clonedCanvases = Array.from(snapshot.querySelectorAll('canvas'));
        clonedCanvases.forEach((canvas, index) => {
            const source = originalCanvases[index];
            if (!source) return;
            try {
                canvas.width = source.width;
                canvas.height = source.height;
                canvas.getContext('2d')?.drawImage(source, 0, 0);
            } catch {
                /* Cross-origin or WebGL canvases may not be readable. */
            }
        });

        html.classList.add('theme-transitioning');
        commitTheme();

        requestAnimationFrame(() => {
            snapshot.classList.add('theme-crossfade-out');
        });

        setTimeout(() => {
            snapshot.remove();
            html.classList.remove('theme-transitioning');
        }, THEME_TRANSITION_MS);
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

    function initGitHubLinks() {
        document.querySelectorAll('.header-controls').forEach(controls => {
            if (controls.querySelector('.github-link')) return;

            const link = document.createElement('a');
            link.className = 'github-link';
            link.href = GITHUB_URL;
            link.target = '_blank';
            link.rel = 'noopener';
            link.setAttribute('aria-label', 'Open GitHub repository');
            link.setAttribute('title', 'Open GitHub repository');
            link.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.97c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.59.69.49A10.08 10.08 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/>
                </svg>
            `;

            controls.appendChild(link);
        });
    }

    /* ── Init: apply saved theme immediately (no flash) ── */
    const initialTheme = getSavedTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);
    document.documentElement.classList.toggle('light-theme', initialTheme === LIGHT);

    /* ── Wire up toggle buttons and Ambient Glow ── */
    function init() {
        initGitHubLinks();
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
