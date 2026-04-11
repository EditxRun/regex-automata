import { useEffect, useState } from "react";
import RegexInput from "./components/RegexInput";
import GraphView from "./components/GraphView";
import { convertRegex } from "./api";
import "./app.css";

function getStateAlias(index) {
  let value = index;
  let alias = "";

  do {
    alias = String.fromCharCode(65 + (value % 26)) + alias;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return alias;
}

function toGraphData(automaton) {
  const nodes = automaton.states.map((state) => ({ id: state }));
  const links = automaton.transitions.map((transition) => ({
    source: transition.from,
    target: transition.to,
    label: transition.label,
  }));

  return {
    nodes,
    links,
    start: automaton.start,
    accept: automaton.accept,
  };
}

function simulateDfa(dfa, input) {
  if (!dfa) {
    return null;
  }

  const transitionMap = new Map();
  for (const transition of dfa.transitions) {
    transitionMap.set(`${transition.from}::${transition.label}`, transition.to);
  }

  const steps = [];
  let currentState = dfa.start;

  if (input.length === 0) {
    const accepted = dfa.accept.includes(currentState);
    return {
      accepted,
      finalState: currentState,
      halted: false,
      failedAt: null,
      steps: [],
    };
  }

  for (let index = 0; index < input.length; index += 1) {
    const symbol = input[index];
    const nextState = transitionMap.get(`${currentState}::${symbol}`);

    steps.push({
      index,
      symbol,
      from: currentState,
      to: nextState ?? null,
    });

    if (!nextState) {
      return {
        accepted: false,
        finalState: currentState,
        halted: true,
        failedAt: index,
        steps,
      };
    }

    currentState = nextState;
  }

  return {
    accepted: dfa.accept.includes(currentState),
    finalState: currentState,
    halted: false,
    failedAt: null,
    steps,
  };
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [nfaGraph, setNfaGraph] = useState(null);
  const [dfaGraph, setDfaGraph] = useState(null);
  const [dfaMachine, setDfaMachine] = useState(null);
  const [currentRegex, setCurrentRegex] = useState("");
  const [simulationInput, setSimulationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  const simulationResult = dfaMachine ? simulateDfa(dfaMachine, simulationInput) : null;
  const alphabet = dfaMachine?.alphabet ?? [];
  const dfaAliasMap = dfaMachine
    ? new Map(dfaMachine.states.map((state, index) => [state, getStateAlias(index)]))
    : new Map();

  const handleConvert = async (regex) => {
    setLoading(true);
    setError(null);

    try {
      const result = await convertRegex(regex);
      setCurrentRegex(regex);
      setNfaGraph(toGraphData(result.nfa));
      setDfaGraph(toGraphData(result.dfa));
      setDfaMachine(result.dfa);
      setSimulationInput("");
    } catch (err) {
      console.error(err);
      setError("Backend not reachable or invalid regex. Is the server running on port 5000?");
      setNfaGraph(null);
      setDfaGraph(null);
      setDfaMachine(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  return (
    <div className="app-root" data-theme={theme}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="app-content">
        <header className="app-header">
          <div className="topbar">
            <div className="badge">Automata Theory</div>
            <button className="theme-toggle" type="button" onClick={toggleTheme}>
              <span>{theme === "light" ? "Dark" : "Light"} mode</span>
            </button>
          </div>

          <h1 className="app-title">
            Regex <span className="arrow">-&gt;</span> Automata
          </h1>
          <p className="app-subtitle">
            Build finite automata from a regular expression, inspect the generated
            graphs, and simulate an input string against the DFA.
          </p>
        </header>

        <div className="input-section">
          <RegexInput onConvert={handleConvert} loading={loading} />
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        {dfaMachine && (
          <section className="simulation-card">
            <div className="simulation-header">
              <div>
                <p className="section-label">Input Simulation</p>
                <h2>Run a string through the DFA</h2>
              </div>
              <div className="simulation-meta">
                <span>Regex: {currentRegex}</span>
                <span>Alphabet Σ: {alphabet.length ? alphabet.join(", ") : "none"}</span>
              </div>
            </div>

            <label className="simulation-label" htmlFor="simulation-input">
              Input string
            </label>
            <input
              id="simulation-input"
              className="simulation-input"
              value={simulationInput}
              onChange={(event) => setSimulationInput(event.target.value)}
              placeholder="Type a string to test"
              autoComplete="off"
              spellCheck={false}
            />

            {simulationResult && (
              <div className="simulation-results">
                <div
                  className={`simulation-status ${
                    simulationResult.accepted ? "accepted" : "rejected"
                  }`}
                >
                  <span className="status-pill">
                    {simulationResult.accepted ? "Accepted" : "Rejected"}
                  </span>
                  <span>
                    Ended in state{" "}
                    <strong>
                      {dfaAliasMap.get(simulationResult.finalState) ?? simulationResult.finalState}
                    </strong>
                    {simulationResult.halted
                      ? ` after stopping at symbol ${simulationResult.failedAt + 1}.`
                      : "."}
                  </span>
                </div>

                <div className="trace-grid">
                  {simulationResult.steps.length === 0 ? (
                    <div className="trace-empty">
                      Empty input. The DFA accepts only if the start state is accepting.
                    </div>
                  ) : (
                    simulationResult.steps.map((step) => (
                      <div
                        key={`${step.index}-${step.symbol}-${step.from}`}
                        className={`trace-step ${step.to ? "" : "trace-step-error"}`}
                      >
                        <span className="trace-index">Step {step.index + 1}</span>
                        <span className="trace-symbol">Read "{step.symbol}"</span>
                        <span className="trace-transition">
                          {dfaAliasMap.get(step.from) ?? step.from} -&gt;{" "}
                          {step.to ? dfaAliasMap.get(step.to) ?? step.to : "no transition"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {(nfaGraph || dfaGraph) && (
          <div className="graphs-section">
            {nfaGraph && (
              <div className="graph-card">
                <GraphView data={nfaGraph} title="NFA" theme={theme} />
              </div>
            )}
            {dfaGraph && (
              <div className="graph-card">
                <GraphView data={dfaGraph} title="DFA" theme={theme} />
              </div>
            )}
          </div>
        )}

        {!nfaGraph && !dfaGraph && !loading && (
          <div className="empty-state">
            <div className="empty-icon">S</div>
            <p>Your automata diagrams will appear here.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Computing automata...</p>
          </div>
        )}

        <footer className="app-footer">
          <p>
            Copyright © 2026 Bhudev Bhanwar. Regex Automata Explorer.
          </p>
          <p>Built for visualizing automata and simulating strings.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
