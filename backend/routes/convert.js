const express = require("express");
const router = express.Router();

const { regexToNFA } = require("../logic/thompson");
const { nfaToDFA, minimizeDFA } = require("../logic/nfaToDfa");

router.post("/", (req, res) => {
  const { regex } = req.body;

  const nfa = regexToNFA(regex);
  const dfa = nfaToDFA(nfa);
  const minDfa = minimizeDFA(dfa);

  res.json({ nfa, dfa, minDfa });
});

module.exports = router;
