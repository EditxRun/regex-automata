# Regex-Automata

Regex-Automata is a full-stack automata theory visualizer that converts a regular expression into an `ε-NFA`, a `DFA`, and a minimized `DFA`.

The project is built as an educational tool. It lets users enter a regex, read a short theory summary, view the regex in plain English, inspect interactive state diagrams, run input simulation step-by-step, and compare transition tables for all generated machines.

## Live Deployment

Frontend:

[https://regex-automata-mcft3as2u-editxruns-projects.vercel.app/](https://regex-automata-mcft3as2u-editxruns-projects.vercel.app/)

## What The App Does

- Converts a regex into an `ε-NFA`
- Builds an equivalent `DFA`
- Minimizes the `DFA`
- Draws all three automata as interactive diagrams
- Shows transition tables for `ε-NFA`, `DFA`, and minimized `DFA`
- Simulates the same input string on all three machines
- Supports step run, auto run, and reset controls
- Highlights active states and transitions during simulation
- Uses `q0`, `q1`, `q2`, ... labels for the `ε-NFA` and alphabetic aliases for DFA-based machines
- Includes light and dark themes
- Adapts to desktop and mobile layouts

## Theory

### Regular Expressions

A regular expression describes a pattern over an alphabet. In this project, operators such as union, concatenation, repetition, optional choice, and grouping are used to define a language.

Supported operators:

- `|`
- concatenation
- `*`
- `+`
- `?`
- `()`

### ε-NFA

An `ε-NFA` is a nondeterministic finite automaton that may move between states without consuming an input symbol. Those empty moves are represented with `ε`.

### DFA

A `DFA` is a deterministic finite automaton. For each state and each symbol in the alphabet, there is at most one next state.

### DFA Minimization

Minimization merges equivalent DFA states without changing the accepted language. This gives a smaller automaton that behaves exactly like the original DFA.

## Construction Approach

The backend performs the formal automata construction, while the frontend focuses on visualization and interaction.

### 1. Regex Parsing

The backend prepares the user-entered regex by:

- inserting explicit concatenation where needed
- converting infix regex into postfix form using a shunting-yard style algorithm

### 2. Thompson's Construction

The postfix regex is converted into an `ε-NFA` using Thompson's construction.

This step builds NFA fragments for:

- literal characters
- union
- concatenation
- Kleene star
- one-or-more
- optional

### 3. Subset Construction

The `ε-NFA` is converted into a `DFA` using subset construction.

This includes:

- `ε`-closure calculation
- move calculation for each symbol
- DFA state generation from NFA state sets
- accept-state detection

### 4. DFA Minimization

The generated DFA is minimized using state-partition refinement so equivalent states are merged into a smaller deterministic machine.

## UI Overview

### Main Sections

- Header with theme toggle
- Theory and construction cards
- Regex input form with examples
- Regex-to-English explanation
- Shared input simulator for all machines
- Interactive diagrams
- Transition tables
- Footer

### Simulation Features

Each machine has its own runner with:

- step execution
- auto run
- reset
- current-state display
- tape visualization
- step trace
- acceptance or rejection summary

## Tech Stack

### Frontend

- React
- Vite
- D3.js
- Axios
- CSS

### Backend

- Node.js
- Express
- CORS

## Project Structure

```text
regex-automata/
|-- backend/
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
|       |   |   `-- RegexInput.jsx
|       |   |-- api.js
|       |   |-- app.css
|       |   |-- app.jsx
|       |   |-- index.css
|       |   `-- main.jsx
|       |-- .gitignore
|       |-- eslint.config.js
|       |-- index.html
|       |-- package-lock.json
|       |-- package.json
|       `-- vite.config.js
`-- README.md
```

## Important Files

### Backend

- `backend/server.js` starts the Express server
- `backend/routes/convert.js` exposes the regex conversion API
- `backend/logic/parser.js` handles regex parsing and postfix conversion
- `backend/logic/thompson.js` builds the `ε-NFA`
- `backend/logic/nfaToDfa.js` builds the `DFA` and minimized `DFA`

### Frontend

- `frontend/my-react-app/src/app.jsx` contains the main UI, machine simulation logic, and transition table rendering
- `frontend/my-react-app/src/components/GraphView.jsx` renders automata diagrams using D3
- `frontend/my-react-app/src/components/RegexInput.jsx` contains the regex form and examples
- `frontend/my-react-app/src/api.js` handles frontend API calls
- `frontend/my-react-app/src/app.css` contains theme, layout, and component styling

## API

### `POST /convert`

Request body:

```json
{
  "regex": "(a|b)*abb"
}
```

Response shape:

```json
{
  "nfa": {
    "states": [],
    "alphabet": [],
    "transitions": [],
    "start": "",
    "accept": []
  },
  "dfa": {
    "states": [],
    "alphabet": [],
    "transitions": [],
    "start": "",
    "accept": []
  },
  "minDfa": {
    "states": [],
    "alphabet": [],
    "transitions": [],
    "start": "",
    "accept": []
  }
}
```

## Local Development

### 1. Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend/my-react-app
npm install
```

### 2. Run The Backend

```bash
cd backend
node server.js
```

### 3. Run The Frontend

```bash
cd frontend/my-react-app
npm run dev
```

### 4. Optional Checks

```bash
cd frontend/my-react-app
npm run lint
npm run build
```

## Deployment

This project is set up for:

- frontend deployment on Vercel
- backend deployment on Render

The backend uses:

```js
const PORT = process.env.PORT || 5000;
```

For production, the frontend should point to the hosted backend URL through `VITE_API_URL`.

## Current Highlights

- interactive D3 diagrams
- `ε`-transition support
- minimized DFA view
- plain-English regex explanation
- state aliasing for readability
- responsive layout
- theme toggle

## Future Improvements

- stronger regex validation feedback
- export diagram as image
- automated backend and frontend tests
- trap/dead-state visualization improvements
- downloadable simulation traces

## Author

Bhudev Bhanwar
