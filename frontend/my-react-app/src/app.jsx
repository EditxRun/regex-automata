import { useEffect, useMemo, useRef, useState } from "react";
import RegexInput from "./components/RegexInput";
import GraphView from "./components/GraphView";
import QuizMode from "./components/QuizMode";
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

function buildQStateAliases(machine) {
    if (!machine) {
        return new Map();
    }

    const orderedStates = [machine.start, ...machine.states.filter((state) => state !== machine.start)];
    return new Map(orderedStates.map((state, index) => [state, `q${index}`]));
}

// ---------------------------------------------------------------------------
// Regex â†’ Plain English
// ---------------------------------------------------------------------------
function regexToEnglish(pattern) {
    if (!pattern || pattern.trim() === "") return "";
    let pos = 0;
    const len = pattern.length;

    function peek() {
        return pos < len ? pattern[pos] : null;
    }

    function parseAlternation() {
        const parts = [parseConcatenation()];
        while (peek() === "|") {
            pos++;
            parts.push(parseConcatenation());
        }
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
        return `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
    }

    function parseConcatenation() {
        const parts = [];
        while (pos < len && peek() !== ")" && peek() !== "|") {
            const piece = parseQuantifier();
            if (piece) parts.push(piece);
        }
        if (parts.length === 0) return "nothing";
        if (parts.length === 1) return parts[0];
        return parts.join(", then ");
    }

    function parseQuantifier() {
        const base = parseAtom();
        const q = peek();
        if (q === "*") { pos++; return `zero or more of (${base})`; }
        if (q === "+") { pos++; return `one or more of (${base})`; }
        if (q === "?") { pos++; return `optionally (${base})`; }
        return base;
    }

    function parseAtom() {
        const ch = peek();
        if (ch === null) return "";
        if (ch === "(") {
            pos++;
            const inner = parseAlternation();
            if (peek() === ")") pos++;
            return inner;
        }
        if (ch === ".") { pos++; return "any character"; }
        if (ch === "ε") { pos++; return "the empty string"; }
        if (ch === "\\") {
            pos++;
            const escaped = pattern[pos++] || "";
            const map = {
                d: "a digit (0-9)", D: "a non-digit",
                w: "a word character", W: "a non-word character",
                s: "whitespace", S: "non-whitespace",
                n: "newline", t: "tab",
            };
            return map[escaped] || `"\\${escaped}"`;
        }
        pos++;
        return `"${ch}"`;
    }

    try {
        const result = parseAlternation();
        if (!result || result === "nothing") return "";
        return result.charAt(0).toUpperCase() + result.slice(1);
    } catch {
        return "";
    }
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

function buildTransitionTable(machine, isNfa = false) {
    if (!machine) {
        return [];
    }

    // For ε-NFA: each cell can hold multiple target states (a Set)
    const table = new Map();
    for (const state of machine.states) {
        table.set(state, {});
    }

    for (const transition of machine.transitions) {
        const row = table.get(transition.from) || {};
        if (isNfa) {
            if (!row[transition.label]) {
                row[transition.label] = new Set();
            }
            row[transition.label].add(transition.to);
        } else {
            row[transition.label] = transition.to;
        }
        table.set(transition.from, row);
    }

    return machine.states.map((state) => ({
        state,
        transitions: table.get(state),
    }));
}

function epsilonClosure(states, transitionsByState) {
    const closure = new Set(states);
    const stack = [...states];

    while (stack.length) {
        const state = stack.pop();
        const edges = transitionsByState.get(state) || [];
        for (const edge of edges) {
            if (edge.label === "ε" && !closure.has(edge.to)) {
                closure.add(edge.to);
                stack.push(edge.to);
            }
        }
    }

    return [...closure].sort();
}

function simulateNfa(machine, input) {
    if (!machine) {
        return null;
    }

    const transitionsByState = new Map();
    for (const state of machine.states) {
        transitionsByState.set(state, []);
    }
    for (const transition of machine.transitions) {
        if (!transitionsByState.has(transition.from)) {
            transitionsByState.set(transition.from, []);
        }
        transitionsByState.get(transition.from).push(transition);
    }

    let currentStates = epsilonClosure([machine.start], transitionsByState);
    const snapshots = [currentStates];
    const acceptSet = new Set(machine.accept);
    const steps = [];

    for (let index = 0; index < input.length; index += 1) {
        const symbol = input[index];
        const movedStates = new Set();
        const activeEdges = [];

        for (const state of currentStates) {
            const edges = transitionsByState.get(state) || [];
            for (const edge of edges) {
                if (edge.label === symbol) {
                    movedStates.add(edge.to);
                    activeEdges.push(edge);
                }
            }
        }

        if (movedStates.size === 0) {
            steps.push({
                index,
                symbol,
                from: currentStates,
                to: [],
                edges: [],
            });

            return {
                type: "nfa",
                snapshots,
                steps,
                halted: true,
                failedAt: index,
                accepted: false,
                finalStates: currentStates,
            };
        }

        currentStates = epsilonClosure([...movedStates], transitionsByState);
        snapshots.push(currentStates);
        steps.push({
            index,
            symbol,
            from: snapshots[index],
            to: currentStates,
            edges: activeEdges,
        });
    }

    return {
        type: "nfa",
        snapshots,
        steps,
        halted: false,
        failedAt: null,
        accepted: currentStates.some((state) => acceptSet.has(state)),
        finalStates: currentStates,
    };
}

function simulateDeterministic(machine, input) {
    if (!machine) {
        return null;
    }

    const transitionMap = new Map();
    for (const transition of machine.transitions) {
        transitionMap.set(`${transition.from}::${transition.label}`, transition.to);
    }

    let currentState = machine.start;
    const snapshots = [[currentState]];
    const steps = [];

    for (let index = 0; index < input.length; index += 1) {
        const symbol = input[index];
        const nextState = transitionMap.get(`${currentState}::${symbol}`);

        if (!nextState) {
            steps.push({
                index,
                symbol,
                from: [currentState],
                to: [],
                edges: [],
            });

            return {
                type: "dfa",
                snapshots,
                steps,
                halted: true,
                failedAt: index,
                accepted: false,
                finalStates: [currentState],
            };
        }

        steps.push({
            index,
            symbol,
            from: [currentState],
            to: [nextState],
            edges: [{ from: currentState, to: nextState, label: symbol }],
        });

        currentState = nextState;
        snapshots.push([currentState]);
    }

    return {
        type: "dfa",
        snapshots,
        steps,
        halted: false,
        failedAt: null,
        accepted: machine.accept.includes(currentState),
        finalStates: [currentState],
    };
}

function MachineRunnerCard({
    title,
    machine,
    aliases,
    simulation,
    input,
    progress,
    autoRunning,
    onStep,
    onReset,
    onToggleAuto,
}) {
    if (!machine || !simulation) {
        return null;
    }

    const currentStates = simulation.snapshots[Math.min(progress, simulation.snapshots.length - 1)] || [];
    const activeTapeIndex = simulation.halted
        ? progress < simulation.steps.length
            ? progress
            : simulation.failedAt
        : progress;

    return (
        <div className="runner-card">
            <div className="runner-header">
                <div>
                    <p className="section-label">Machine Runner</p>
                    <h3>{title}</h3>
                </div>
                <div className="runner-controls">
                    <button type="button" className="runner-button" onClick={onStep}>
                        Step
                    </button>
                    <button type="button" className="runner-button" onClick={onToggleAuto}>
                        {autoRunning ? "Pause" : "Auto Run"}
                    </button>
                    <button type="button" className="runner-button" onClick={onReset}>
                        Reset
                    </button>
                </div>
            </div>

            <div className="runner-meta">
                <span>
                    Progress: {Math.min(progress, simulation.steps.length)} / {simulation.steps.length}
                </span>
                <span>
                    Current states:{" "}
                    <strong>
                        {currentStates.length
                            ? currentStates.map((state) => aliases.get(state) ?? state).join(", ")
                            : "none"}
                    </strong>
                </span>
            </div>

            <div className="tape-track">
                {input.length === 0 ? (
                    <div className="tape-cell tape-cell-empty">empty</div>
                ) : (
                    input.split("").map((symbol, index) => (
                        <div
                            key={`${title}-${symbol}-${index}`}
                            className={`tape-cell ${activeTapeIndex === index ? "tape-cell-active" : ""} ${index < progress ? "tape-cell-processed" : ""
                                } ${simulation.halted && simulation.failedAt === index ? "tape-cell-failed" : ""}`}
                        >
                            <span className="tape-index">{index + 1}</span>
                            <span className="tape-symbol">{symbol}</span>
                        </div>
                    ))
                )}

                {input.length > 0 && !simulation.halted && (
                    <div
                        className={`tape-cell tape-cell-end ${activeTapeIndex === input.length ? "tape-cell-active" : ""}`}
                    >
                        <span className="tape-index">end</span>
                        <span className="tape-symbol">_</span>
                    </div>
                )}
            </div>

            

            <div className={`simulation-status ${simulation.accepted ? "accepted" : "rejected"}`}>
                <span className="status-pill">{simulation.accepted ? "Accepted" : "Rejected"}</span>
                <span className="simulation-summary">
                    Final states:{" "}
                    <strong>
                        {simulation.finalStates.length
                            ? simulation.finalStates.map((state) => aliases.get(state) ?? state).join(", ")
                            : "none"}
                    </strong>
                    {simulation.halted ? ` after symbol ${simulation.failedAt + 1}.` : "."}
                </span>
            </div>
        </div>
    );
}

function TransitionTable({ title, machine, aliases, isNfa = false }) {
    const rows = useMemo(() => buildTransitionTable(machine, isNfa), [machine, isNfa]);

    if (!machine) {
        return null;
    }

    // For ε-NFA: add epsilon column to alphabet if there are epsilon transitions
    const displayAlphabet = isNfa
        ? [...machine.alphabet, "ε"].filter((sym) =>
            machine.transitions.some((t) => t.label === sym)
        )
        : machine.alphabet;

    const renderCell = (transitions, symbol) => {
        const value = transitions[symbol];
        if (!value) return "-";
        if (value instanceof Set) {
            const targets = [...value];
            if (targets.length === 0) return "-";
            return (
                <span className="nfa-cell">
                    {targets.map((t) => (
                        <span key={t} className="nfa-cell-target">
                            {aliases.get(t) ?? t}
                        </span>
                    ))}
                </span>
            );
        }
        return aliases.get(value) ?? value;
    };

    return (
        <section className="table-card" aria-label={title}>
            <div className="table-header">
                <div>
                    <p className="section-label">State Transition Table</p>
                    <h2>{title}</h2>
                </div>
                <p className="table-caption">
                    {isNfa
                        ? "Each cell lists all reachable states for a given symbol. ε shows spontaneous ε-transitions."
                        : "Each row is a state alias, and each column shows the next state for a symbol in the alphabet."}
                </p>
            </div>

            <div className="table-wrap">
                <table className="transition-table">
                    <thead>
                        <tr>
                            <th>State</th>
                            {displayAlphabet.map((symbol) => (
                                <th key={`${title}-${symbol}`} className={symbol === "ε" ? "epsilon-col" : ""}>{symbol}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={`${title}-${row.state}`}>
                                <td>
                                    <div className="table-state-cell">
                                        <span className="table-state-alias">{aliases.get(row.state) ?? row.state}</span>
                                        {row.state === machine.start && <span className="table-state-badge">start</span>}
                                        {machine.accept.includes(row.state) && (
                                            <span className="table-state-badge accept">accept</span>
                                        )}
                                    </div>
                                </td>
                                {displayAlphabet.map((symbol) => (
                                    <td key={`${row.state}-${symbol}`} className={symbol === "ε" ? "epsilon-col" : ""}>
                                        {renderCell(row.transitions, symbol)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function App() {
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
    const [mode, setMode] = useState("explorer");
    const [nfaMachine, setNfaMachine] = useState(null);
    const [dfaMachine, setDfaMachine] = useState(null);
    const [minDfaMachine, setMinDfaMachine] = useState(null);
    const [nfaGraph, setNfaGraph] = useState(null);
    const [dfaGraph, setDfaGraph] = useState(null);
    const [minDfaGraph, setMinDfaGraph] = useState(null);
    const [currentRegex, setCurrentRegex] = useState("");
    const [simulationInput, setSimulationInput] = useState("");
    const [runnerProgress, setRunnerProgress] = useState({ nfa: 0, dfa: 0, minDfa: 0 });
    const [autoRun, setAutoRun] = useState({ nfa: false, dfa: false, minDfa: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shouldScrollToDiagrams, setShouldScrollToDiagrams] = useState(false);
    const automataPanelsRef = useRef(null);

    useEffect(() => {
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        if (!shouldScrollToDiagrams || loading || mode !== "explorer") {
            return;
        }

        if (!nfaGraph && !dfaGraph && !minDfaGraph) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            automataPanelsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
            setShouldScrollToDiagrams(false);
        });

        return () => window.cancelAnimationFrame(frame);
    }, [shouldScrollToDiagrams, loading, mode, nfaGraph, dfaGraph, minDfaGraph]);

    const nfaSimulation = useMemo(() => simulateNfa(nfaMachine, simulationInput), [nfaMachine, simulationInput]);
    const dfaSimulation = useMemo(
        () => simulateDeterministic(dfaMachine, simulationInput),
        [dfaMachine, simulationInput]
    );
    const minDfaSimulation = useMemo(
        () => simulateDeterministic(minDfaMachine, simulationInput),
        [minDfaMachine, simulationInput]
    );

    const nfaAliases = useMemo(() => buildQStateAliases(nfaMachine), [nfaMachine]);
    const dfaAliases = useMemo(
        () => (dfaMachine ? new Map(dfaMachine.states.map((state, index) => [state, getStateAlias(index)])) : new Map()),
        [dfaMachine]
    );
    const minDfaAliases = useMemo(
        () =>
            minDfaMachine
                ? new Map(minDfaMachine.states.map((state, index) => [state, getStateAlias(index)]))
                : new Map(),
        [minDfaMachine]
    );

    useEffect(() => {
        const timers = [];
        const configs = [
            { key: "nfa", simulation: nfaSimulation },
            { key: "dfa", simulation: dfaSimulation },
            { key: "minDfa", simulation: minDfaSimulation },
        ];

        configs.forEach(({ key, simulation }) => {
            if (!autoRun[key] || !simulation) {
                return;
            }

            if (runnerProgress[key] >= simulation.steps.length) {
                setAutoRun((current) => ({ ...current, [key]: false }));
                return;
            }

            const timer = setTimeout(() => {
                setRunnerProgress((current) => {
                    const nextValue = Math.min(current[key] + 1, simulation.steps.length);
                    return { ...current, [key]: nextValue };
                });
            }, 850);

            timers.push(timer);
        });

        return () => {
            timers.forEach((timer) => clearTimeout(timer));
        };
    }, [autoRun, runnerProgress, nfaSimulation, dfaSimulation, minDfaSimulation]);

    const handleConvert = async (regex) => {
        setLoading(true);
        setError(null);
        setShouldScrollToDiagrams(true);

        try {
            const result = await convertRegex(regex);
            setCurrentRegex(regex);
            setNfaMachine(result.nfa);
            setDfaMachine(result.dfa);
            setMinDfaMachine(result.minDfa);
            setNfaGraph(toGraphData(result.nfa));
            setDfaGraph(toGraphData(result.dfa));
            setMinDfaGraph(toGraphData(result.minDfa));
            setSimulationInput("");
            setRunnerProgress({ nfa: 0, dfa: 0, minDfa: 0 });
            setAutoRun({ nfa: false, dfa: false, minDfa: false });
        } catch (err) {
            console.error(err);
            setShouldScrollToDiagrams(false);
            setError(
                "We couldn't generate the automata. Check the regex format or make sure the backend service is available."
            );
            setNfaMachine(null);
            setDfaMachine(null);
            setMinDfaMachine(null);
            setNfaGraph(null);
            setDfaGraph(null);
            setMinDfaGraph(null);
        } finally {
            setLoading(false);
        }
    };

    const updateRunner = (key, updater) => {
        setRunnerProgress((current) => ({ ...current, [key]: updater(current[key]) }));
    };

    const resetRunner = (key) => {
        setAutoRun((current) => ({ ...current, [key]: false }));
        setRunnerProgress((current) => ({ ...current, [key]: 0 }));
    };

    const toggleAutoRun = (key, simulation) => {
        if (!simulation) {
            return;
        }

        if (runnerProgress[key] >= simulation.steps.length) {
            setRunnerProgress((current) => ({ ...current, [key]: 0 }));
        }

        setAutoRun((current) => ({ ...current, [key]: !current[key] }));
    };

    const getHighlights = (simulation, progress) => {
        if (!simulation) {
            return { states: [], transitions: [] };
        }

        const stateIndex = Math.min(progress, simulation.snapshots.length - 1);
        const states = simulation.snapshots[stateIndex] || [];
        const transitions = progress > 0 && simulation.steps[progress - 1]
            ? simulation.steps[progress - 1].edges
            : [];

        return { states, transitions };
    };

    const nfaHighlights = getHighlights(nfaSimulation, runnerProgress.nfa);
    const dfaHighlights = getHighlights(dfaSimulation, runnerProgress.dfa);
    const minDfaHighlights = getHighlights(minDfaSimulation, runnerProgress.minDfa);

    return (
        <div className="app-root" data-theme={theme}>
            <div className="orb orb-1" />
            <div className="orb orb-2" />

            <div className="app-content">
                <header className="app-header">
                    <div className="topbar">
                        <div className="badge">Automata Theory</div>
                        <button
                            className="theme-toggle"
                            type="button"
                            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                        >
                            <span>{theme === "light" ? "Dark" : "Light"} mode</span>
                        </button>
                    </div>

                    <h1 className="app-title">
                        Regex <span className="arrow">-&gt;</span> Automata
                    </h1>
                    <p className="app-subtitle">
                        Build finite automata from a regular expression, inspect the generated
                        diagrams, simulate an input string across all three machines, and compare the
                        original DFA with its minimized form.
                    </p>
                </header>

                <div className="mode-switch" role="tablist" aria-label="View mode">
                    <button
                        type="button"
                        className={`mode-switch-button${mode === "explorer" ? " active" : ""}`}
                        onClick={() => setMode("explorer")}
                    >
                        Explorer
                    </button>
                    <button
                        type="button"
                        className={`mode-switch-button${mode === "quiz" ? " active" : ""}`}
                        onClick={() => setMode("quiz")}
                    >
                        Quiz Mode
                    </button>
                </div>

                {mode === "quiz" ? (
                    <QuizMode theme={theme} />
                ) : (
                    <>
                <section className="theory-panel">
                    <div className="theory-card">
                        <p className="section-label">Theory</p>
                        <h2>What this topic covers</h2>
                        <p>
                            Regular expressions describe patterns in a language. The ε-NFA captures
                            those patterns using ε-transitions. Subset construction converts the
                            ε-NFA into a DFA, and state minimization collapses equivalent states.
                        </p>
                    </div>
                    <div className="theory-card">
                        <p className="section-label">Construction</p>
                        <h3>How the automata are built</h3>
                        <p>
                            The backend parses the regex using the Shunting-Yard algorithm, then
                            applies Thompson&apos;s Construction to build an ε-NFA. Subset
                            Construction converts this into a DFA, and Hopcroft&apos;s algorithm
                            minimizes it by merging equivalent states.
                        </p>
                    </div>
                </section>

                <div className="input-section">
                    <RegexInput onConvert={handleConvert} loading={loading} />
                </div>

                {error && (
                    <div className="error-banner">
                        <span className="error-icon">!</span>
                        {error}
                    </div>
                )}

                {currentRegex && (
                    <div className="english-desc-card">
                        <p className="section-label">Regex in Plain English</p>
                        <p className="english-desc-text">
                            <span className="english-regex-badge">{currentRegex}</span>
                            <span className="english-desc-meaning">
                                {regexToEnglish(currentRegex) || "(pattern too complex to describe)"}
                            </span>
                        </p>
                    </div>
                )}

                {(nfaMachine || dfaMachine || minDfaMachine) && (
                    <section className="simulation-card">
                        <div className="simulation-header">
                            <div>
                                <p className="section-label">Machine Simulation</p>
                                <h2>Run the same input on ε-NFA, DFA, and minimized DFA</h2>
                            </div>
                            <div className="simulation-meta">
                                <span>Regex: {currentRegex}</span>
                                <span>
                                    Alphabet {"\u03A3"}: {(dfaMachine?.alphabet ?? []).length ? dfaMachine.alphabet.join(", ") : "none"}
                                </span>
                            </div>
                        </div>

                        <label className="simulation-label" htmlFor="simulation-input">
                            Input string
                        </label>
                        <input
                            id="simulation-input"
                            className="simulation-input"
                            value={simulationInput}
                            onChange={(event) => {
                                setSimulationInput(event.target.value);
                                setRunnerProgress({ nfa: 0, dfa: 0, minDfa: 0 });
                                setAutoRun({ nfa: false, dfa: false, minDfa: false });
                            }}
                            placeholder="Type a string to test"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        </section>
                )}

                {(nfaGraph || dfaGraph || minDfaGraph) && (
                    <div className="automata-panels" ref={automataPanelsRef}>
                        {nfaGraph && (
                            <div className="automata-machine-section">
                                <div className="machine-visuals-row">
                                    <MachineRunnerCard
                                        title="ε-NFA"
                                        machine={nfaMachine}
                                        aliases={nfaAliases}
                                        simulation={nfaSimulation}
                                        input={simulationInput}
                                        progress={runnerProgress.nfa}
                                        autoRunning={autoRun.nfa}
                                        onStep={() => updateRunner("nfa", (value) => Math.min(value + 1, nfaSimulation.steps.length))}
                                        onReset={() => resetRunner("nfa")}
                                        onToggleAuto={() => toggleAutoRun("nfa", nfaSimulation)}
                                    />
                                    <div className="graph-card">
                                        <GraphView
                                            data={nfaGraph}
                                            title="ε-NFA"
                                            theme={theme}
                                            aliases={nfaAliases}
                                            highlightedStates={nfaHighlights.states}
                                            highlightedTransitions={nfaHighlights.transitions}
                                        />
                                    </div>
                                </div>
                                <TransitionTable title="ε-NFA Transition Table" machine={nfaMachine} aliases={nfaAliases} isNfa />
                            </div>
                        )}
                        {dfaGraph && (
                            <div className="automata-machine-section">
                                <div className="machine-visuals-row">
                                    <MachineRunnerCard
                                        title="DFA"
                                        machine={dfaMachine}
                                        aliases={dfaAliases}
                                        simulation={dfaSimulation}
                                        input={simulationInput}
                                        progress={runnerProgress.dfa}
                                        autoRunning={autoRun.dfa}
                                        onStep={() => updateRunner("dfa", (value) => Math.min(value + 1, dfaSimulation.steps.length))}
                                        onReset={() => resetRunner("dfa")}
                                        onToggleAuto={() => toggleAutoRun("dfa", dfaSimulation)}
                                    />
                                    <div className="graph-card">
                                        <GraphView
                                            data={dfaGraph}
                                            title="DFA"
                                            theme={theme}
                                            aliases={dfaAliases}
                                            highlightedStates={dfaHighlights.states}
                                            highlightedTransitions={dfaHighlights.transitions}
                                        />
                                    </div>
                                </div>
                                <TransitionTable title="DFA Transition Table" machine={dfaMachine} aliases={dfaAliases} />
                            </div>
                        )}
                        {minDfaGraph && (
                            <div className="automata-machine-section">
                                <div className="machine-visuals-row">
                                    <MachineRunnerCard
                                        title="Minimized DFA"
                                        machine={minDfaMachine}
                                        aliases={minDfaAliases}
                                        simulation={minDfaSimulation}
                                        input={simulationInput}
                                        progress={runnerProgress.minDfa}
                                        autoRunning={autoRun.minDfa}
                                        onStep={() =>
                                            updateRunner("minDfa", (value) => Math.min(value + 1, minDfaSimulation.steps.length))
                                        }
                                        onReset={() => resetRunner("minDfa")}
                                        onToggleAuto={() => toggleAutoRun("minDfa", minDfaSimulation)}
                                    />
                                    <div className="graph-card">
                                        <GraphView
                                            data={minDfaGraph}
                                            title="Minimized DFA"
                                            theme={theme}
                                            aliases={minDfaAliases}
                                            highlightedStates={minDfaHighlights.states}
                                            highlightedTransitions={minDfaHighlights.transitions}
                                        />
                                    </div>
                                </div>
                                <TransitionTable
                                    title="Minimized DFA Transition Table"
                                    machine={minDfaMachine}
                                    aliases={minDfaAliases}
                                />
                            </div>
                        )}
                    </div>
                )}
                {!nfaGraph && !dfaGraph && !minDfaGraph && !loading && (
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
                    </>
                )}

                <footer className="app-footer">
                    <p>Copyright {"\u00A9"} 2026 Bhudev Bhanwar. Regex Automata Explorer.</p>
                    <p>Built for visualizing automata and simulating strings.</p>
                </footer>
            </div>
        </div>
    );
}

export default App;


