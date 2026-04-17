# Regex-Automata

Regex-Automata is a full-stack automata theory visualizer that converts a regular expression into an `ε-NFA`, a `DFA`, and a minimized `DFA`.

The project is built as a complete educational tool. It lets users enter a regex, read theory summaries, view the regex context in plain English, inspect interactive state diagrams, run simulation step-by-step directly over the tape strings, and even test their knowledge in a dynamic Regex Quiz Mode!

## Live Deployment

Frontend:

[https://regex-automata-mcft3as2u-editxruns-projects.vercel.app/](https://regex-automata-mcft3as2u-editxruns-projects.vercel.app/)

## What The App Does

- Converts a regex into an `ε-NFA`
- Builds an equivalent `DFA`
- Minimizes the `DFA`
- Draws all three automata as interactive diagrams
- Provides a **Quiz Mode**, where users test their regex knowledge against randomly generated Mystery DFAs.
- Shows transition tables for `ε-NFA`, `DFA`, and minimized `DFA`
- Simulates any input string on all three machines simultaneously or individually
- Supports step execution, auto-run pacing, and reset tracking
- Highlights active states and transitions dynamically during simulation
- Translates simple regex patterns into semantic plain English descriptions
- Exports rendered interactive diagrams as high-quality PNGs
- Features robust responsive layouts alongside Light/Dark modes

## Theory

### Regular Expressions

A regular expression describes a pattern over an alphabet. In this project, operators such as union, concatenation, repetition, optional choice, and grouping are used to define a language.

Supported operators:
- `|` (Union)
- concatenation
- `*` (Kleene Star)
- `+` (One or more)
- `?` (Optional)
- `()` (Grouping)

### ε-NFA

An `ε-NFA` is a nondeterministic finite automaton that may move between states without consuming an input symbol. Those empty moves are represented with `ε`.

### DFA

A `DFA` is a deterministic finite automaton. For each state and each symbol in the alphabet, there is at most one next state.

### DFA Minimization

Minimization merges equivalent DFA states without changing the accepted language. This results in a smaller automaton that behaves identically to the original DFA.

## Construction Approach

This tool relies on a dedicated Node backend algorithm engine.
The backend performs the formal automata construction while the React frontend processes and displays the structural output.

### 1. Regex Parsing
The backend prepares the user-entered regex by inserting explicit concatenation where needed and converting the infix regex into postfix form using a shunting-yard style algorithm.

### 2. Thompson's Construction
The postfix regex is cleanly mapped to basic `ε-NFA` structures.

### 3. Subset Construction
The computed `ε-NFA` is passed through subset construction (`ε`-closures, multiform moves) to eliminate nondeterminism, generating a `DFA`.

### 4. DFA Minimization
Using Hopcroft's state-partition framework, equivalence classes are processed so equivalent states merge and reduce the state table optimally.

## UI Overview

### Main Sections

- Header with Quiz/Explorer modes and Theme toggles
- Theory summary and educational explanations
- Smart Regex input form with syntax badge rendering
- Side-by-side interactive D3.js diagrams alongside their respective Machine Simulator modules
- Comprehensive Transition State Tables

### Simulation Features

Each machine (NFA, DFA, minDFA) contains a dedicated simulation runner featuring:
- Step-by-step tape traversal
- Active symbol tracking
- Fluid animated status tags (`ACCEPTED` / `REJECTED`)
- Clear tracking of currently traversed states

## Tech Stack

### Frontend
- React
- Vite
- D3.js
- Vanilla CSS (Responsive Flex/Grid structure)

### Backend
- Node.js
- Express
- CORS

## Project Structure

```text
regex-automata/
|-- server/
|   |-- logic/
|   |   |-- nfaToDfa.js
|   |   |-- parser.js
|   |   `-- thompson.js
|   |-- routes/
|   |   `-- convert.js
|   |-- package-lock.json
|   |-- package.json
|   `-- server.js
|-- frontend/
|   `-- my-react-app/
|       |-- dist/
|       |-- public/
|       |   |-- favicon.svg
|       |   `-- icons.svg
|       |-- src/
|       |   |-- components/
|       |   |   |-- GraphView.jsx
|       |   |   |-- RegexInput.jsx
|       |   |   `-- QuizMode.jsx
|       |   |-- api.js
|       |   |-- app.css
|       |   |-- app.jsx
|       |   |-- index.css
|       |   `-- main.jsx
|       |-- .gitignore
|       |-- eslint.config.js
|       |-- index.html
|       |-- package.json
|       `-- vite.config.js
`-- README.md
```

## Local Development

### 1. Install Dependencies

Backend:
```bash
cd server
npm install
```

Frontend:
```bash
cd frontend/my-react-app
npm install
```

### 2. Run The Backend

```bash
cd server
node server.js
```

### 3. Run The Frontend

```bash
cd frontend/my-react-app
npm run dev
```

## Deployment

The backend expects standard hosting routing (e.g. Render/Heroku) under `process.env.PORT`.
The frontend strictly hooks into `VITE_API_URL` to locate the active node conversion process for both Explorer and Quiz modes.

## Current Highlights

- **Interactive D3 Diagramming:** Live physics processing and panning
- **Quiz Mode Module:** Fully integrated learning tests
- **One-click PNG Exports:** Instantly snapshot the compiled topologies
- `ε`-transition support
- Plain English translation tool
- Clean and optimized step-through simulation UI tape
- Responsive split-view geometry

## Future Improvements

- automated backend and frontend tests
- trap/dead-state visual representation toggles
- exportable transitions lists
- deeper semantic interpretations for extremely complex patterns

## Author

Bhudev Bhanwar
