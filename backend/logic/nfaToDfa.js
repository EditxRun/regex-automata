/**
 * Subset Construction and DFA minimization helpers.
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

function setKey(stateSet) {
  return [...stateSet].sort().join(",");
}

function nfaToDFA(nfa) {
  const transMap = new Map();
  for (const state of nfa.states) {
    transMap.set(state, []);
  }
  for (const { from, to, label } of nfa.transitions) {
    if (!transMap.has(from)) {
      transMap.set(from, []);
    }
    transMap.get(from).push({ to, label });
  }

  const nfaAcceptSet = new Set(nfa.accept);
  const alphabet = nfa.alphabet;
  const startClosure = epsilonClosure(new Set([nfa.start]), transMap);
  const startKey = setKey(startClosure);

  const dfaStateMap = new Map();
  dfaStateMap.set(startKey, startClosure);

  const dfaTransitions = [];
  const dfaAccept = [];
  const worklist = [startKey];
  const visited = new Set();

  while (worklist.length) {
    const currentKey = worklist.pop();
    if (visited.has(currentKey)) {
      continue;
    }
    visited.add(currentKey);

    const currentNfaStates = dfaStateMap.get(currentKey);

    for (const state of currentNfaStates) {
      if (nfaAcceptSet.has(state)) {
        dfaAccept.push(currentKey);
        break;
      }
    }

    for (const symbol of alphabet) {
      const moved = move(currentNfaStates, symbol, transMap);
      if (moved.size === 0) {
        continue;
      }

      const closure = epsilonClosure(moved, transMap);
      const nextKey = setKey(closure);

      dfaTransitions.push({ from: currentKey, to: nextKey, label: symbol });

      if (!dfaStateMap.has(nextKey)) {
        dfaStateMap.set(nextKey, closure);
        worklist.push(nextKey);
      }
    }
  }

  return {
    states: [...dfaStateMap.keys()],
    alphabet,
    transitions: dfaTransitions,
    start: startKey,
    accept: dfaAccept,
  };
}

function buildDfaTransitionMap(dfa) {
  const transitionMap = new Map();
  for (const state of dfa.states) {
    transitionMap.set(state, new Map());
  }
  for (const transition of dfa.transitions) {
    if (!transitionMap.has(transition.from)) {
      transitionMap.set(transition.from, new Map());
    }
    transitionMap.get(transition.from).set(transition.label, transition.to);
  }
  return transitionMap;
}

function minimizeDFA(dfa) {
  if (!dfa || dfa.states.length <= 1) {
    return dfa;
  }

  const acceptSet = new Set(dfa.accept);
  const transitionMap = buildDfaTransitionMap(dfa);
  const nonAcceptStates = dfa.states.filter((state) => !acceptSet.has(state));
  const acceptStates = dfa.states.filter((state) => acceptSet.has(state));

  let partitions = [];
  if (nonAcceptStates.length) {
    partitions.push(nonAcceptStates);
  }
  if (acceptStates.length) {
    partitions.push(acceptStates);
  }

  let changed = true;

  while (changed) {
    changed = false;
    const blockIndex = new Map();

    partitions.forEach((block, index) => {
      block.forEach((state) => {
        blockIndex.set(state, index);
      });
    });

    const nextPartitions = [];

    for (const block of partitions) {
      const groups = new Map();

      for (const state of block) {
        const signature = dfa.alphabet
          .map((symbol) => {
            const target = transitionMap.get(state)?.get(symbol) ?? "__dead__";
            return blockIndex.has(target) ? blockIndex.get(target) : "__dead__";
          })
          .join("|");

        if (!groups.has(signature)) {
          groups.set(signature, []);
        }
        groups.get(signature).push(state);
      }

      nextPartitions.push(...groups.values());

      if (groups.size > 1) {
        changed = true;
      }
    }

    partitions = nextPartitions;
  }

  const stateToBlock = new Map();
  partitions.forEach((block, index) => {
    block.forEach((state) => {
      stateToBlock.set(state, index);
    });
  });

  const blockName = (block) => block.slice().sort().join(" | ");
  const minimizedStates = partitions.map((block) => blockName(block));
  const minimizedStart = blockName(partitions[stateToBlock.get(dfa.start)]);
  const minimizedAccept = partitions
    .filter((block) => block.some((state) => acceptSet.has(state)))
    .map((block) => blockName(block));

  const seenTransitions = new Set();
  const minimizedTransitions = [];

  partitions.forEach((block) => {
    const representative = block[0];
    const fromName = blockName(block);

    for (const symbol of dfa.alphabet) {
      const target = transitionMap.get(representative)?.get(symbol);
      if (!target) {
        continue;
      }

      const toName = blockName(partitions[stateToBlock.get(target)]);
      const key = `${fromName}::${symbol}::${toName}`;
      if (!seenTransitions.has(key)) {
        seenTransitions.add(key);
        minimizedTransitions.push({ from: fromName, to: toName, label: symbol });
      }
    }
  });

  return {
    states: minimizedStates,
    alphabet: dfa.alphabet,
    transitions: minimizedTransitions,
    start: minimizedStart,
    accept: minimizedAccept,
  };
}

module.exports = { nfaToDFA, minimizeDFA };
