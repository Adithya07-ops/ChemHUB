import os

files = [
    'index.html',
    'tools/adme/index.html',
    'tools/chemcalc/index.html',
    'tools/docking/index.html',
    'tools/elements/index.html',
    'tools/enthalpy/index.html',
    'tools/viewer/index.html'
]

for f in files:
    if not os.path.exists(f):
        print(f"File not found: {f}")
        continue
        
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    is_root = f == 'index.html'
    prefix = '' if is_root else '../../'
    
    js_node = f'    <script src="{prefix}shared/transitions.js" defer></script>'
    css_node = f'    <link rel="stylesheet" href="{prefix}shared/transitions.css">'
    
    # Inject before </head>
    if js_node not in content:
        content = content.replace('</head>', f'{js_node}\n</head>')
    if css_node not in content:
        content = content.replace('</head>', f'{css_node}\n</head>')
        
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print("Injected transition scripts and styles into all HTML files.")
