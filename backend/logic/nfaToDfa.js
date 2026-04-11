/**
 * Subset Construction — converts an NFA to an equivalent DFA.
 *
 * The NFA format expected (from Thompson's construction):
 *   {
 *     states:      string[]
 *     transitions: { from: string, to: string, label: string }[]
 *     start:       string
 *     accept:      string[]
 *     alphabet:    string[]   (non-ε symbols)
 *   }
 *
 * The DFA produced has the same format, with:
 *   - state IDs that are sorted comma-joined NFA state sets  e.g. "q0,q2,q5"
 *   - no ε-transitions
 */

/**
 * Computes the ε-closure of a set of NFA states.
 * ε-closure(T) = all states reachable from T by zero or more ε-transitions.
 *
 * @param {Set<string>} states     starting NFA states
 * @param {Map<string, {to,label}[]>} transMap  adjacency map
 * @returns {Set<string>}
 */
function epsilonClosure(states, transMap) {
  const closure = new Set(states);
  const stack = [...states];

  while (stack.length) {
    const state = stack.pop();
    const edges = transMap.get(state) || [];
    for (const { to, label } of edges) {
      if (label === "ε" && !closure.has(to)) {
        closure.add(to);
        stack.push(to);
      }
    }
  }

  return closure;
}

/**
 * Computes move(T, a) — the set of NFA states reachable from any state in T
 * via a single transition labelled `symbol`.
 *
 * @param {Set<string>} states
 * @param {string} symbol
 * @param {Map<string, {to,label}[]>} transMap
 * @returns {Set<string>}
 */
function move(states, symbol, transMap) {
  const result = new Set();
  for (const state of states) {
    const edges = transMap.get(state) || [];
    for (const { to, label } of edges) {
      if (label === symbol) {
        result.add(to);
      }
    }
  }
  return result;
}

/**
 * Canonical string key for a set of NFA states (sorted, comma-joined).
 * @param {Set<string>} stateSet
 * @returns {string}
 */
function setKey(stateSet) {
  return [...stateSet].sort().join(",");
}

/**
 * Converts an NFA (with ε-transitions) to a DFA using subset construction.
 *
 * @param {object} nfa
 * @returns DFA object
 */
function nfaToDFA(nfa) {
  // Build adjacency map: state → [{to, label}]
  const transMap = new Map();
  for (const state of nfa.states) {
    transMap.set(state, []);
  }
  for (const { from, to, label } of nfa.transitions) {
    if (!transMap.has(from)) transMap.set(from, []);
    transMap.get(from).push({ to, label });
  }

  const nfaAcceptSet = new Set(nfa.accept);
  const alphabet = nfa.alphabet;

  // Start DFA state = ε-closure of NFA start state
  const startClosure = epsilonClosure(new Set([nfa.start]), transMap);
  const startKey = setKey(startClosure);

  // Maps DFA state key → Set<string> of NFA states
  const dfaStateMap = new Map();
  dfaStateMap.set(startKey, startClosure);

  const dfaTransitions = [];
  const dfaAccept = [];

  const worklist = [startKey];
  const visited = new Set();

  while (worklist.length) {
    const currentKey = worklist.pop();
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    const currentNFAStates = dfaStateMap.get(currentKey);

    // Check if this DFA state is accepting (contains any NFA accept state)
    for (const s of currentNFAStates) {
      if (nfaAcceptSet.has(s)) {
        dfaAccept.push(currentKey);
        break;
      }
    }

    // For each symbol in the alphabet, compute the next DFA state
    for (const sym of alphabet) {
      const moved = move(currentNFAStates, sym, transMap);
      if (moved.size === 0) continue; // dead/trap state — skip for cleanliness

      const closure = epsilonClosure(moved, transMap);
      const nextKey = setKey(closure);

      dfaTransitions.push({ from: currentKey, to: nextKey, label: sym });

      if (!dfaStateMap.has(nextKey)) {
        dfaStateMap.set(nextKey, closure);
        worklist.push(nextKey);
      }
    }
  }

  const dfaStates = [...dfaStateMap.keys()];

  return {
    states: dfaStates,
    alphabet,
    transitions: dfaTransitions,
    start: startKey,
    accept: dfaAccept,
  };
}

module.exports = { nfaToDFA };