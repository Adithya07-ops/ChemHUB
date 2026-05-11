# ChemHub

ChemHub is a browser-based computational chemistry platform built for students and educational research. The project combines molecular visualization, ADME analysis, chemistry utilities, and interactive chemistry tools into a single modern web application.

The goal of the project was to create a platform that feels closer to real scientific software rather than a basic student project, while still remaining lightweight and accessible through the browser.

---

## Features

### 3D Molecular Visualizer

* Visualize molecules in interactive 3D
* Search using molecule names or SMILES strings
* Rotate, zoom, and inspect structures
* Multiple render styles:

  * Stick
  * Sphere
  * Ball-and-stick

### ADME Analyzer

* Basic drug-likeness analysis inspired by SwissADME
* Lipinski Rule of Five checks
* Molecular property visualization
* Bioavailability-related metrics

### Docking Explorer

* Explore protein-ligand structures in 3D
* Integration with RCSB PDB data
* Interactive molecular inspection

### ChemCalc

Chemistry utility toolkit containing:

* Mass conversion
* Volume conversion
* Temperature conversion
* Mole calculator
* Molarity calculator

### Periodic Table Explorer

* Search chemical elements
* View atomic properties and information
* Educational chemistry reference tool

### Enthalpy Calculator

* Calculate standard enthalpy of calculation
* Uses Hess's Law
* NIST Data + PubChem

---

## Tech Stack

* HTML5
* CSS3
* Vanilla JavaScript
* 3Dmol.js
* PubChem API
* RCSB PDB API

---

## Project Structure

```text
ChemHub/
│
├── index.html
├── shared/
│   ├── shared.css
│   ├── theme.js
│   └── animations.css
│
├── tools/
│   ├── viewer/
│   ├── adme/
│   ├── docking/
│   ├── chemcalc/
│   └── elements/
│
└── assets/
```

---

## APIs & Libraries Used

* PubChem API — molecular and compound data
* RCSB Protein Data Bank — protein structure data
* 3Dmol.js — molecular rendering engine

---

## Running the Project

The project can be:

* Run locally in a browser
* Hosted using GitHub Pages

---

## Objective

This project was developed as part of a computational chemistry project with the aim of combining chemistry concepts, visualization, and interactive web technologies into a single unified platform.

---

## Future Improvements

* Advanced molecular property prediction
* Better docking simulations
* Export options for structures and reports
* Expanded chemistry utilities
* Improved molecular interaction analysis

---

## Author

Adithya S
Aldorn K Joetreson
Aaliya Alias

---

## Live Website

https://adithya07-ops.github.io/-3D-Molecular-Viewer/
