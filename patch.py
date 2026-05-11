import os

files = [
    'tools/adme/index.html',
    'tools/chemcalc/index.html',
    'tools/docking/index.html',
    'tools/elements/index.html',
    'tools/enthalpy/index.html',
    'tools/viewer/index.html'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if '<script src="../../theme.js"></script>' not in content:
        content = content.replace('</head>', '    <script src="../../theme.js"></script>\n</head>')
    
    if 'id="theme-toggle"' not in content:
        # Some files might have id="back-btn" or just class="back-link"
        if '<a href="../../index.html" class="back-link" id="back-btn">' in content:
            content = content.replace('<a href="../../index.html" class="back-link" id="back-btn">', 
                '<div style="display:flex; align-items:center; gap:12px;"><button id="theme-toggle" class="btn-ghost" style="border-radius: 50%; padding: 6px; display: inline-flex; width: 32px; height: 32px; cursor: pointer;"></button><a href="../../index.html" class="back-link" id="back-btn">')
            content = content.replace('← Back to Hub</a>', '← Back to Hub</a></div>')
        else:
            content = content.replace('<a href="../../index.html" class="back-link">', 
                '<div style="display:flex; align-items:center; gap:12px;"><button id="theme-toggle" class="btn-ghost" style="border-radius: 50%; padding: 6px; display: inline-flex; width: 32px; height: 32px; cursor: pointer;"></button><a href="../../index.html" class="back-link">')
            content = content.replace('← ChemHub</a>', '← ChemHub</a></div>')

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print('Done!')
