/**
 * Regex Parser — converts infix regex to postfix notation.
 *
 * Supported operators (in precedence order, low→high):
 *   |   union / alternation
 *   .   explicit concatenation (inserted automatically)
 *   *   Kleene star
 *   +   one-or-more
 *   ?   zero-or-one
 *   ()  grouping
 *
 * Special symbols:
 *   ε   (epsilon) treated as a literal character
 */

/**
 * Inserts explicit concatenation operator '.' between tokens that
 * are implicitly concatenated in standard regex notation.
 *
 * Rules — insert '.' between position i and i+1 when:
 *   right side is: literal, '(', 'ε'
 *   AND left side is: literal, ')', '*', '+', '?', 'ε'
 *
 * @param {string} regex  user-supplied infix regex
 * @returns {string}       regex with explicit '.' concatenation operators
 */
function addConcatOperator(regex) {
  let result = "";
  const n = regex.length;

  for (let i = 0; i < n; i++) {
    const c = regex[i];
    result += c;

    if (i + 1 < n) {
      const next = regex[i + 1];

      const leftIsAtom = c !== "(" && c !== "|";
      const rightIsAtom = next !== ")" && next !== "|" && next !== "*" && next !== "+" && next !== "?";

      if (leftIsAtom && rightIsAtom) {
        result += ".";
      }
    }
  }

  return result;
}

/**
 * Converts an infix regex string (with explicit '.' concatenation) to
 * postfix notation using the Shunting-Yard algorithm.
 *
 * Operator precedence (higher = tighter binding):
 *   |  → 1
 *   .  → 2
 *   *  → 3
 *   +  → 3
 *   ?  → 3
 *
 * @param {string} infix  regex with explicit concatenation operators
 * @returns {string}       postfix representation
 */
function toPostfix(infix) {
  const precedence = { "|": 1, ".": 2, "*": 3, "+": 3, "?": 3 };
  const output = [];
  const opStack = [];

  for (const c of infix) {
    if (c === "(") {
      opStack.push(c);
    } else if (c === ")") {
      while (opStack.length && opStack[opStack.length - 1] !== "(") {
        output.push(opStack.pop());
      }
      opStack.pop(); // remove '('
    } else if (c in precedence) {
      // Unary postfix operators (* + ?) are right-associative; binary (| .) are left-associative
      const isUnary = c === "*" || c === "+" || c === "?";
      while (
        opStack.length &&
        opStack[opStack.length - 1] !== "(" &&
        opStack[opStack.length - 1] in precedence &&
        (isUnary
          ? precedence[opStack[opStack.length - 1]] > precedence[c]
          : precedence[opStack[opStack.length - 1]] >= precedence[c])
      ) {
        output.push(opStack.pop());
      }
      opStack.push(c);
    } else {
      // Literal character (or ε)
      output.push(c);
    }
  }

  while (opStack.length) {
    output.push(opStack.pop());
  }

  return output.join("");
}

/**
 * Full pipeline: infix regex → explicit-concat infix → postfix.
 *
 * @param {string} regex  user-supplied infix regex
 * @returns {string}       postfix regex ready for Thompson's construction
 */
function parseRegex(regex) {
  if (!regex || regex.length === 0) {
    throw new Error("Regex cannot be empty");
  }
  const withConcat = addConcatOperator(regex);
  return toPostfix(withConcat);
}

module.exports = { parseRegex, addConcatOperator, toPostfix };
