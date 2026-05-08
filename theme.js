/* ========================================================
   ChemHub — Global Design System & Ambient Glow
   ======================================================== */

// Always enforce Dark Mode on load
(function() {
    localStorage.removeItem('chemhub-theme');
    document.documentElement.classList.remove('light-theme');
})();

window.toggleTheme = function() {
    console.log('ChemHub: Theme is locked to Dark Mode for scientific clarity.');
};

// Initialization after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Set up ambient cursor glow (Desktop Only)
    if (window.matchMedia("(pointer: fine)").matches) {
        const glowElement = document.createElement('div');
        glowElement.id = 'desktop-cursor-glow';
        document.body.appendChild(glowElement);

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
});
