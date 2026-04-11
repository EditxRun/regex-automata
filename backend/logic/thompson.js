/**
 * Thompson's Construction — builds an NFA from a postfix regex.
 *
 * Each NFA fragment is represented as:
 *   {
 *     states:      string[]          — list of state IDs
 *     transitions: { from, to, label }[]  — label is a symbol or 'ε'
 *     start:       string            — single start state
 *     accept:      string[]          — list of accept states (always 1 here)
 *   }
 *
 * State IDs are globally-unique strings like "q0", "q1", …
 */

const { parseRegex } = require("./parser");

let stateCount = 0;

/** Returns a fresh unique state ID. */
function newState() {
  return "q" + stateCount++;
}

// ─── NFA Fragment Builders ────────────────────────────────────────────────────

/**
 * Base NFA for a single symbol (literal character or ε).
 *
 *   (start) --symbol--> (accept)
 */
function symbol(char) {
  const s = newState();
  const e = newState();
  return {
    states: [s, e],
    transitions: [{ from: s, to: e, label: char }],
    start: s,
    accept: [e],
  };
}

/**
 * Concatenation: nfa1 followed by nfa2.
 *
 *   nfa1.start ~~nfa1~~> nfa1.accept --ε--> nfa2.start ~~nfa2~~> nfa2.accept
 */
function concat(nfa1, nfa2) {
  // Connect each accept state of nfa1 to the start of nfa2 via ε
  const epsilonTransitions = nfa1.accept.map((a) => ({
    from: a,
    to: nfa2.start,
    label: "ε",
  }));

  return {
    states: [...nfa1.states, ...nfa2.states],
    transitions: [...nfa1.transitions, ...epsilonTransitions, ...nfa2.transitions],
    start: nfa1.start,
    accept: nfa2.accept,
  };
}

/**
 * Union: nfa1 | nfa2.
 *
 *          ε --> nfa1.start ~~nfa1~~> nfa1.accept --ε
 *   start <                                            > accept
 *          ε --> nfa2.start ~~nfa2~~> nfa2.accept --ε
 */
function union(nfa1, nfa2) {
  const s = newState();
  const e = newState();

  return {
    states: [s, ...nfa1.states, ...nfa2.states, e],
    transitions: [
      { from: s, to: nfa1.start, label: "ε" },
      { from: s, to: nfa2.start, label: "ε" },
      ...nfa1.transitions,
      ...nfa2.transitions,
      ...nfa1.accept.map((a) => ({ from: a, to: e, label: "ε" })),
      ...nfa2.accept.map((a) => ({ from: a, to: e, label: "ε" })),
    ],
    start: s,
    accept: [e],
  };
}

/**
 * Kleene star: nfa*.
 *
 *          ε ────────────────────────────────────────> accept
 *   start <                                          >
 *          ε --> nfa.start ~~nfa~~> nfa.accept --ε --+
 *                                  nfa.accept --ε --> nfa.start  (loop back)
 */
function kleeneStar(nfa) {
  const s = newState();
  const e = newState();

  return {
    states: [s, ...nfa.states, e],
    transitions: [
      { from: s, to: nfa.start, label: "ε" },
      { from: s, to: e, label: "ε" }, // zero repetitions
      ...nfa.transitions,
      ...nfa.accept.map((a) => ({ from: a, to: nfa.start, label: "ε" })), // loop
      ...nfa.accept.map((a) => ({ from: a, to: e, label: "ε" })),
    ],
    start: s,
    accept: [e],
  };
}

/**
 * One-or-more: nfa+  (at least one — same as nfa·nfa*)
 */
function plus(nfa) {
  // Clone the NFA so we have independent state sets for the two copies
  // Simplest: build nfa+ as concat(nfa, kleeneStar(clone))
  // But cloning requires renaming states; instead use two builds from the same postfix.
  // Actually we can reuse the already-built fragment by manually constructing:
  //   start --ε--> nfa.start, nfa.accept --ε--> nfa.start (loop), nfa.accept --ε--> end
  const s = newState();
  const e = newState();

  return {
    states: [s, ...nfa.states, e],
    transitions: [
      { from: s, to: nfa.start, label: "ε" },
      ...nfa.transitions,
      ...nfa.accept.map((a) => ({ from: a, to: nfa.start, label: "ε" })), // loop
      ...nfa.accept.map((a) => ({ from: a, to: e, label: "ε" })),
    ],
    start: s,
    accept: [e],
  };
}

/**
 * Optional: nfa?  (zero or one occurrence)
 */
function optional(nfa) {
  const s = newState();
  const e = newState();

  return {
    states: [s, ...nfa.states, e],
    transitions: [
      { from: s, to: nfa.start, label: "ε" },
      { from: s, to: e, label: "ε" }, // skip
      ...nfa.transitions,
      ...nfa.accept.map((a) => ({ from: a, to: e, label: "ε" })),
    ],
    start: s,
    accept: [e],
  };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Builds an NFA from a regex string using Thompson's construction.
 *
 * @param {string} regex  infix regular expression
 * @returns NFA object
 */
function regexToNFA(regex) {
  stateCount = 0; // reset so state names start from q0 each call

  const postfix = parseRegex(regex);
  const stack = [];

  for (const c of postfix) {
    if (c === "*") {
      const nfa = stack.pop();
      stack.push(kleeneStar(nfa));
    } else if (c === "+") {
      const nfa = stack.pop();
      stack.push(plus(nfa));
    } else if (c === "?") {
      const nfa = stack.pop();
      stack.push(optional(nfa));
    } else if (c === ".") {
      const nfa2 = stack.pop();
      const nfa1 = stack.pop();
      stack.push(concat(nfa1, nfa2));
    } else if (c === "|") {
      const nfa2 = stack.pop();
      const nfa1 = stack.pop();
      stack.push(union(nfa1, nfa2));
    } else {
      // Literal character
      stack.push(symbol(c));
    }
  }

  if (stack.length !== 1) {
    throw new Error(`Invalid regex: stack has ${stack.length} items after processing`);
  }

  const result = stack[0];

  // Derive alphabet (all non-ε symbols used)
  const alphabet = [...new Set(result.transitions.map((t) => t.label).filter((l) => l !== "ε"))];

  return { ...result, alphabet };
}

module.exports = { regexToNFA };