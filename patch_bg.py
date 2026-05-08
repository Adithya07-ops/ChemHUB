import os

files = [
    'tools/adme/script.js',
    'tools/chemcalc/script.js',
    'tools/docking/script.js',
    'tools/elements/script.js',
    'tools/enthalpy/script.js',
    'tools/viewer/script.js'
]

for f in files:
    if not os.path.exists(f): 
        continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Check if grad exists
    if "grad.addColorStop(0, 'rgba(10, 10, 40, 0)')" in content:
        content = content.replace(
            "grad.addColorStop(0, 'rgba(10, 10, 40, 0)');",
            "const isLight = document.documentElement.classList.contains('light-theme');\n        grad.addColorStop(0, isLight ? 'rgba(255, 255, 255, 0)' : 'rgba(10, 10, 40, 0)');"
        )
        content = content.replace(
            "grad.addColorStop(1, 'rgba(6, 6, 14, 0.4)');",
            "grad.addColorStop(1, isLight ? 'rgba(240, 244, 248, 1)' : 'rgba(6, 6, 14, 0.4)');"
        )
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print('Done patching backgrounds in local scripts!')
