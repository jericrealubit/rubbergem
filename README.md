
# RubberGem Production Tracking System

A fast-entry mobile web terminal and manufacturing audit logging solution built with Next.js, React, Tailwind CSS, and shadcn/ui. This system provides press operators with an optimized mobile viewport to quickly enter cycle logs, calculate durations, and generate strict single-page print/PDF audit sheets in landscape orientation.

---
Live: https://waai.au/rubbergem
---

<img width="50%" height="50%" alt="image" src="https://github.com/user-attachments/assets/1c17b4e4-5a39-41c9-ab72-1ecd815845e5" />

---
## 🚀 Technical Stack

- **Framework:** Next.js (App Router Architecture)
- **Library:** React 19 (Hooks, local storage caching context states)
- **Styling:** Tailwind CSS v4 & custom print stylesheet overrides
- **Icons:** Lucide React
- **UI Components:** Built following shadcn/ui structural primitives (Card, Button, Label, Input, Select, Checkbox, RadioGroup)



## 🛠️ Main Application Features

### 1. Mobile Fast-Entry Terminal (`/components/PressForm.tsx`)
- **Dynamic Header Switcher:** Dropdown menu allowing operators to seamlessly toggle configuration modes on-the-fly between **Press #1** and **Press #2**.
- **Collapsible Shift Card:** Keeps general operational variables compact on smaller screens. Includes a real-time inline summary string context preview (*Operator Name • Shift Group • Current Date*) visible even when collapsed.
- **Table Setup Matrix:** Input module built into the collapsible panel tracking specific product mat designations (`DF`, `DD`, `CF`, `CD`, `SG`) uniquely logged exactly **once** per shift frame.
- **Smart Timestamps Calculator:** Fast-touch "TAP TO START" and "TAP TO END" timestamp indicators with automated duration interval parsing. Built-in **midnight-crossover protection** logic (e.g., cycle starting at 23:55 and ending at 00:20 logs precisely as 25 minutes runtime instead of throwing a negative error).
- **Tables Short Molding Pattern Matrix:** Interactive grid tracking 4 independent production modules. Replicates physical grid checklists using custom square layout radio options mapped in an absolute coordinate geometric X-pattern alignment.
- **Bubbles Position Grid Mapping:** 3 distinct multi-select checkbox indicators tracking positional micro-defects (**L**eft, **M**iddle, **R**ight) for every single table module, complete with companion size dimension selection keys (`Big` or `Small`).

### 2. Single-Page Audit Dashboard Sheet (`/app/ProductionTable.tsx`)
- **Shift Parameter Extraction Header:** Aggregates shift parameters (Operator, Shift Group, Press number, and Table Setup Mat Types) inside a dedicated parameters card above the main matrix grid layout so they appear exactly **once** per shift sheet.
- **15-Row Immutable Frame Grid:** Guarantees a clean layout representation by fixing exactly 15 indexed rows. Populates active cycle records sequentially and defaults to neat, aligned filler slots if less than 15 cycles have been run during the logged shift.
- **Dynamic Analytics Footer Calculations:** Real-time production efficiency reporting:
  - *Total Mats Produced:* Total active cycles × 4 tables.
  - *Faulty Mats Produced:* Scans the matrix columns and computes cumulative reject rates, enforcing a strict boundary constraint of **maximum 1 reject count per table per cycle frame** regardless of whether a table possesses a short mold defect, multi-point positional bubble markings, or both.
- **Landscape Print Automation Engine:** Complete layout optimization wrapping the form matrix structure inside specific CSS media print rules. Strips away browser UI widgets, responsive navigation controls, block spacing, and scales column cells to cleanly force-fit the complete 15-cycle history grid perfectly onto **one single landscape sheet** when printing or exporting to PDF.

### 3. Shell State Navigation Router (`/app/page.tsx`)
- Implements a modern slide-out **Burger Menu navigation drawer** with an integrated visual layer background overlay filter.
- Orchestrates smooth, persistent client-side transition routing without causing data loss across separate entry form pages or production log dashboards.

---

## 📦 Getting Started & Development Installation

Follow these steps to spin up the local instance development environment client:

### 1. Extract Project and Clone Dependencies
Ensure you have Node.js installed on your machine. Install the required Node packages specified in your `package.json` file:

```bash
npm install

```

### 2. Run the Development Server

Launch the local client engine instance framework:

```bash
npm run dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) inside your web client browser or mobile emulator frame terminal to preview the system interface layout.

### 3. Create Production Builds

To build a highly optimized deployment compilation artifact ready for industrial plant terminals:

```bash
npm run build
npm run start

```

---

## 🗂️ Project Directory Topology

```text
rubbergem/
├── app/
│   ├── page.tsx               # Main Core Router & Shell Frame Sidebar Wrapper Layout
│   ├── ProductionTable.tsx    # Landscape Single-Page Print Layout Engine & Audit Table
│   ├── layout.tsx             # Global Structural Viewport Configuration File
│   └── globals.css            # Custom Styling & CSS Base Layer Injectors
├── components/
│   ├── PressForm.tsx          # Fast-Entry Operator Terminal Form (Calculators, Matrices)
│   └── ui/                    # Base Atom components (Card, Button, Input, Select, etc.)
├── package.json               # Node Package Dependencies Management Script
└── README.md                  # System Setup Documentation Profile


```
