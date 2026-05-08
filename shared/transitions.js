/**
 * ChemHub — Premium Transition Logic
 * Handles smooth intercepted navigation and entering animations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Wrapper
    const body = document.body;
    const main = document.querySelector('main') || body;
    main.classList.add('page-transition-wrapper', 'page-enter');

    // 2. Add Loading Overlay to DOM
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    overlay.innerHTML = `
        <div class="atomic-loader">
            <div class="atom-nucleus"></div>
            <div class="atom-orbit orbit-1"></div>
            <div class="atom-orbit orbit-2"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    // 3. Trigger Enter Animation
    setTimeout(() => {
        requestAnimationFrame(() => {
            main.classList.add('page-enter-active');
        });
    }, 50);

    // 4. Intercept Links
    const handleNavigation = (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Only transition internal links that aren't anchors or same-page
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !link.hasAttribute('target')) {
            e.preventDefault();
            
            const targetUrl = link.href;
            const isToolCard = link.classList.contains('tool-card');

            // Start Exit Sequence
            document.documentElement.classList.add('is-transitioning');
            body.classList.add('is-exiting');
            
            if (isToolCard) {
                link.classList.add('card-clicking');
            }

            // Show overlay slightly before redirect
            setTimeout(() => {
                overlay.classList.add('show');
            }, 100);

            // Exit animation on the main content
            main.classList.remove('page-enter-active');
            main.classList.add('page-exit');

            // Hard redirect after animation duration (match CSS transition)
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 650);
        }
    };

    document.addEventListener('click', handleNavigation);
});
