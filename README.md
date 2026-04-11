# Regex Automata

A full-stack web application that converts a regular expression into:

- an NFA
- an equivalent DFA
- an interactive DFA input simulation

The project is built for learning and visualization. It lets users enter a regex, generate automata, inspect graph-based state diagrams, and test whether a string is accepted by the generated DFA.

## Live Deployment

Frontend deployment:

[https://regex-automata-mcft3as2u-editxruns-projects.vercel.app/](https://regex-automata-mcft3as2u-editxruns-projects.vercel.app/)

## Features

- Convert a regular expression into an NFA
- Convert the NFA into a DFA
- Visualize both automata as interactive graphs
- Simulate an input string on the DFA
- View DFA state aliases like `A`, `B`, `C`, `D`
- Switch between light and dark theme
- Responsive layout for desktop and mobile screens

## Project Approach

The application follows a split frontend-backend approach:

- The **backend** is responsible for regex parsing, NFA construction, and DFA construction.
- The **frontend** is responsible for collecting user input, rendering diagrams, and simulating input strings using the returned DFA.

This separation keeps the theory and automata construction logic independent from the UI layer.

## Construction Methods Used

### 1. Regex Parsing

The backend first converts the user-provided infix regular expression into postfix notation.

This is done in two stages:

- implicit concatenation operators are inserted
- the expression is converted from infix to postfix using a shunting-yard style approach

Supported operators:

- `|`
- concatenation
- `*`
- `+`
- `?`
- `()`

### 2. NFA Construction

The NFA is built using **Thompson's Construction**.

This method creates small NFA fragments for literals and combines them using:

- concatenation
- union
- Kleene star
- one-or-more
- optional

The result is an NFA with epsilon transitions.

### 3. DFA Construction

The DFA is built from the NFA using **Subset Construction**.

This includes:

- epsilon-closure computation
- move operation for each input symbol
- generation of DFA states from sets of NFA states
- marking accept states when a DFA state contains an NFA accept state

### 4. Input Simulation

The frontend simulates a user-entered string against the returned DFA by:

- starting at the DFA start state
- following transitions symbol by symbol
- stopping when no transition exists
- reporting acceptance or rejection

## Tech Stack

### Frontend

- React
- Vite
- Axios
- D3.js
- CSS

### Backend

- Node.js
- Express
- CORS

## Directory Structure

```text
regex-automata/
├── backend/
│   ├── logic/
│   │   ├── parser.js
│   │   ├── thompson.js
│   │   └── nfaToDfa.js
│   ├── routes/
│   │   └── convert.js
│   ├── package.json
│   └── server.js
├── frontend/
│   └── my-react-app/
│       ├── public/
│       │   └── favicon.svg
│       ├── src/
│       │   ├── components/
│       │   │   ├── GraphView.jsx
│       │   │   └── RegexInput.jsx
│       │   ├── api.js
│       │   ├── app.css
│       │   ├── app.jsx
│       │   ├── index.css
│       │   └── main.jsx
│       ├── .env.example
│       ├── .env.local
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
└── README.md
```

## Important Files

### Backend

- `backend/server.js`
  Starts the Express server and mounts API routes.

- `backend/routes/convert.js`
  Exposes the `/convert` endpoint that returns generated NFA and DFA data.

- `backend/logic/parser.js`
  Parses regex expressions and converts infix regex to postfix.

- `backend/logic/thompson.js`
  Builds the NFA using Thompson's construction.

- `backend/logic/nfaToDfa.js`
  Converts the generated NFA into a DFA using subset construction.

### Frontend

- `frontend/my-react-app/src/app.jsx`
  Main UI container and simulation logic.

- `frontend/my-react-app/src/components/RegexInput.jsx`
  Input form for regex submission.

- `frontend/my-react-app/src/components/GraphView.jsx`
  Graph renderer for NFA and DFA using D3.

- `frontend/my-react-app/src/api.js`
  Frontend API layer for calling the backend.

- `frontend/my-react-app/src/app.css`
  Main app styling, theming, and responsive layout rules.

## API

### `POST /convert`

Request body:

```json
{
  "regex": "(a|b)*abb"
}
```

Response:

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
  }
}
```

## Local Development

### 1. Install dependencies

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

### 2. Environment variable

Create or use:

`frontend/my-react-app/.env.local`

```env
VITE_API_URL=http://localhost:5000
```

### 3. Run the backend

```bash
cd backend
node server.js
```

### 4. Run the frontend

```bash
cd frontend/my-react-app
npm run dev
```

## Deployment Setup

This project is designed to be deployed with:

- frontend on **Vercel**
- backend on **Render**

### Frontend environment variable

In Vercel, configure:

```env
VITE_API_URL=https://your-backend-name.onrender.com
```

### Backend deployment notes

The backend listens on:

```js
const PORT = process.env.PORT || 5000;
```

This allows it to run locally and on hosting providers like Render.

## Responsive Design

The frontend includes responsive behavior for:

- stacked graph layout on smaller screens
- full-width action buttons on mobile
- wrapped simulator metadata and trace content
- compact graph controls on narrow devices

## Future Improvements

- add formal regex validation messages
- highlight active DFA state during simulation on the graph
- support export of graph images
- add automated tests for parsing and conversion logic
- add trap state visualization for rejected transitions

## Author

Bhudev Bhanwar
