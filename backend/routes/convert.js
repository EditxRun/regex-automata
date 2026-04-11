const express = require("express");
const router = express.Router();

const { regexToNFA } = require("../logic/thompson");
const { nfaToDFA } = require("../logic/nfaToDfa");

router.post("/", (req, res) => {
  const { regex } = req.body;

  const nfa = regexToNFA(regex);
  const dfa = nfaToDFA(nfa);

  res.json({ nfa, dfa });
});

module.exports = router;