/**
 * Periodic Table Interactive Prototype Script
 */

document.addEventListener('DOMContentLoaded', () => {

    // UI Elements
    const gridContainer = document.getElementById('periodic-grid');
    const input = document.getElementById('element-input');
    const searchBtn = document.getElementById('search-btn');

    // Display Elements (Left Panel)
    const dNum = document.getElementById('d-num');
    const dSym = document.getElementById('d-sym');
    const dMass = document.getElementById('d-mass');
    const dName = document.getElementById('d-name');
    const dGroup = document.getElementById('d-group');
    const mainElBox = document.getElementById('main-el-box');

    const props = {
        state: document.getElementById('p-state'),
        density: document.getElementById('p-density'),
        mp: document.getElementById('p-mp'),
        bp: document.getElementById('p-bp'),
        en: document.getElementById('p-en'),
        year: document.getElementById('p-year')
    };
    const cCore = document.getElementById('c-core');
    const cVal = document.getElementById('c-val');

    let activeCell = null;
    let lockedData = null;

    // Build the grid map
    function renderGrid() {
        gridContainer.innerHTML = '';
        
        elementsData.forEach(el => {
            const cell = document.createElement('div');
            cell.className = `p-cell ${el.c}`;
            cell.style.gridColumn = el.x;
            cell.style.gridRow = el.y;
            
            cell.innerHTML = `
                <span class="c-num">${el.num}</span>
                <span class="c-sym">${el.sym}</span>
            `;

            cell.addEventListener('mouseenter', () => {
                if (!lockedData) updateDisplayFast(el, false);
            });
            
            cell.addEventListener('click', () => {
                if (lockedData === el) {
                    // Unlock if clicking the already locked element
                    lockedData = null;
                    cell.classList.remove('active');
                    activeCell = null;
                } else {
                    // Lock onto new element
                    if (activeCell) activeCell.classList.remove('active');
                    lockedData = el;
                    activeCell = cell;
                    cell.classList.add('active');
                    updateDisplay(el);
                }
            });

            gridContainer.appendChild(cell);
            
            // Store cell reference in data for search to lock it
            el.domNode = cell;
        });
    }

    // Update display without heavy animations (for hover)
    function updateDisplayFast(data, triggerPulse = true) {
        dNum.textContent = data.num;
        dSym.textContent = data.sym;
        dMass.textContent = data.mass;
        dName.textContent = data.name;
        dGroup.textContent = data.group;

        props.state.textContent = data.props.state;
        props.density.textContent = data.props.density + (data.props.density !== '-' ? ' g/cm³' : '');
        props.mp.textContent = data.props.mp;
        props.bp.textContent = data.props.bp;
        props.en.textContent = data.props.en;
        props.year.textContent = data.props.year;

        cCore.textContent = data.core;
        cVal.textContent = data.val;

        // Apply theme color
        const colorClass = data.c;
        const colorMap = {
            'g-alkali': '#f87171', 'g-alkaline': '#fbbf24', 'g-transition': '#f472b6', 
            'g-post': '#a78bfa', 'g-metalloid': '#34d399', 'g-nonmetal': '#60a5fa', 
            'g-halogen': '#38bdf8', 'g-noble': '#c084fc', 'g-lanthanide': '#fb923c', 'g-actinide': '#a3e635'
        };
        const themeColor = colorMap[colorClass] || '#ffffff';
        mainElBox.style.color = themeColor;
        dGroup.style.color = themeColor;
        
        if (triggerPulse) {
            mainElBox.style.transform = 'scale(1.05)';
            setTimeout(() => mainElBox.style.transform = 'scale(1)', 150);
        }
    }

    // Full update sequence
    function updateDisplay(data) {
        updateDisplayFast(data, true);
        input.value = data.name;
    }

    // Search
    searchBtn.addEventListener('click', () => {
        const val = input.value.trim().toLowerCase();
        const match = elementsData.find(d => 
            d.name.toLowerCase() === val || 
            d.sym.toLowerCase() === val || 
            d.num.toString() === val
        );
        if (match) {
            // Trigger cell click logic to lock it visually and fundamentally
            if (activeCell) activeCell.classList.remove('active');
            lockedData = match;
            activeCell = match.domNode;
            if (activeCell) activeCell.classList.add('active');
            updateDisplay(match);
        } else {
            alert('Element not found. Please try a valid atomic symbol or name (e.g., C, Oxygen, 79).');
        }
    });

    input.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') searchBtn.click();
    });

    // Initialize
    renderGrid();
    if(elementsData[10]) {
        // Start by locking Gold
        lockedData = elementsData[10];
        activeCell = lockedData.domNode;
        if(activeCell) activeCell.classList.add('active');
        updateDisplay(lockedData);
    }

});
