# Computational Chemistry 3D Viewer

This project is a web-based tool that lets you visualize molecular structures in 3D. You can enter the name of a compound or a SMILES string, and the application will fetch real data and display the molecule interactively.

The idea behind this project was to combine basic computational chemistry concepts with a clean and interactive interface that anyone can use.

---

## What it can do

* Search molecules using common names (like *ethanol* or *caffeine*)
* Accept SMILES input for more advanced use
* Display molecules in 3D with full interaction (rotate, zoom, move)
* Switch between different display styles (stick, sphere, ball-and-stick)
* Show basic molecular information:

  * Name
  * Molecular formula
  * Molecular weight
  * SMILES notation

---

## How it works

The app takes your input and sends a request to the PubChem database. Once it gets the molecular data, it uses a 3D rendering library to display the structure on screen.

Everything runs directly in the browser — no installation required.

---

## Tech used

* HTML, CSS, JavaScript
* 3Dmol.js for rendering molecules
* PubChem API for real chemical data

---

## Project structure

```
index.html   → layout and structure  
style.css    → design and UI  
script.js    → logic and API handling  
```

---

## Running the project

You can either:

* Open `index.html` directly in a browser
  or
* Use the live version hosted with GitHub Pages

---

## Why I made this

This project is part of a computational chemistry assignment. Instead of making a basic calculator-type program, I wanted to build something more interactive and visual that actually feels useful.

---

## Possible improvements

* Show bond angles and molecular geometry
* Add support for saving or exporting structures
* Improve performance for larger molecules

---

## Author

Adithya S
