/**
 * ChemHub — Premium Transition Logic
 * Handles smooth intercepted navigation and entering animations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Wrapper
    const body = document.body;
    const main = document.querySelector('main') || body;
    
    // Function to initialize/reset page state
    const initPageTransitions = () => {
        const skipEnter = sessionStorage.getItem('chemhub-skip-enter') === 'true';
        if (skipEnter) {
            sessionStorage.removeItem('chemhub-skip-enter');
        }

        // Reset global transition states
        document.documentElement.classList.remove('is-transitioning');
        body.classList.remove('is-exiting');
        
        // Remove any individual card animation states
        document.querySelectorAll('.tool-card.card-clicking').forEach(card => {
            card.classList.remove('card-clicking');
        });
        
        main.classList.add('page-transition-wrapper');
        main.classList.remove('page-exit');
        
        if (!skipEnter) {
            main.classList.add('page-enter');
            main.classList.remove('page-enter-active');
            
            setTimeout(() => {
                requestAnimationFrame(() => {
                    main.classList.add('page-enter-active');
                });
            }, 50);
        } else {
            main.classList.remove('page-enter');
            main.classList.add('page-enter-active');
        }
    };

    // 2. Add Loading Overlay to DOM if it doesn't exist
    let overlay = document.querySelector('.transition-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'transition-overlay';
        overlay.innerHTML = `
            <div class="atomic-loader">
                <div class="atom-nucleus"></div>
                <div class="atom-orbit orbit-1"></div>
                <div class="atom-orbit orbit-2"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // 3. Initial execution
    initPageTransitions();

    // 4. Handle BFCache (Back-Forward Cache) restoration
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            overlay.classList.remove('show');
            initPageTransitions();
        }
    });

    // 5. Intercept Links
    const handleNavigation = (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Skip if it's a hash link, mailto, tel, or opens in new tab
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || link.hasAttribute('target')) {
            return;
        }

        // Only transition internal links
        // Check if it's the same origin
        try {
            const url = new URL(link.href);
            if (url.origin !== window.location.origin) return;
        } catch (err) {
            return;
        }

        // Back-to-hub navigation detection
        // We only trigger this if we are in a subfolder (href contains ..)
        // to avoid the logo on the home page accidentally triggering a history.back()
        const isBackToHub = href.includes('index.html') && href.includes('..');
        
        if (isBackToHub && window.history.length > 1) {
            e.preventDefault();
            sessionStorage.setItem('chemhub-skip-enter', 'true');
            
            // Start exit sequence for visual feedback before history.back()
            document.documentElement.classList.add('is-transitioning');
            body.classList.add('is-exiting');
            main.classList.add('page-exit');
            
            setTimeout(() => {
                window.history.back();
            }, 150); // Shorter delay for back navigation
            return;
        }

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
    };

    document.addEventListener('click', handleNavigation);
});
