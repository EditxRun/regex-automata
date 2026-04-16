import { useEffect, useState } from "react";
import { convertRegex } from "../api";
import GraphView from "./GraphView";

const QUIZZES = [
  {
    prompt: "Which regular expression strictly matches any combination of a's and b's?",
    correct: "(a|b)*",
    options: ["(a|b)*", "a*b*", "ab*", "(ab)*"],
  },
  {
    prompt: "Match this automaton to the correct regular expression.",
    correct: "(a|b)*abb",
    options: ["(a|b)*abb", "a*b*abb", "(ab)*b", "a(b|a)*b"],
  },
  {
    prompt: "Which pattern accepts a string of a's followed by a single b, then exactly one c?",
    correct: "a*bc",
    options: ["a*bc", "ab*c", "(ab)*c", "a(bc)*"],
  },
  {
    prompt: "Identify the regex that matches 'a', 'c', or 'ab'.",
    correct: "a|ab|c",
    options: ["a|ab|c", "(a|b)*c", "a(b|c)", "ab*c*"],
  },
  {
    prompt: "Which pattern represents zero or more repetitions of 'ab'?",
    correct: "(ab)*",
    options: ["(ab)*", "a*b*", "ab*", "a(b)*"],
  },
];

function toGraphData(automaton) {
  if (!automaton) return null;

  const nodes = automaton.states.map((state) => ({ id: state }));
  const links = automaton.transitions.map((transition) => ({
    source: transition.from,
    target: transition.to,
    label: transition.label,
  }));

  return { nodes, links, start: automaton.start, accept: automaton.accept };
}

export default function QuizMode({ theme }) {
  const [quiz, setQuiz] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRandomQuiz = async () => {
    setLoading(true);
    setFeedback(null);

    let nextQuiz = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];
    if (quiz && nextQuiz.correct === quiz.correct && QUIZZES.length > 1) {
      nextQuiz = QUIZZES.find((item) => item.correct !== quiz.correct) || nextQuiz;
    }

    setQuiz(nextQuiz);
    setShuffledOptions([...nextQuiz.options].sort(() => Math.random() - 0.5));

    try {
      const result = await convertRegex(nextQuiz.correct);
      setGraphData(toGraphData(result.dfa));
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Failed to load quiz graph from backend." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRandomQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuess = (option) => {
    if (feedback?.type === "success") {
      return;
    }

    if (option === quiz.correct) {
      setFeedback({ type: "success", message: "Correct! Outstanding." });
      return;
    }

    setFeedback({ type: "error", message: `Incorrect! It is not ${option}. Try again.` });
  };

  return (
    <div className="quiz-layout">
      <div className="theory-card quiz-prompt-card">
        <h2>Guess the Regex!</h2>
        <p className="quiz-prompt">{quiz?.prompt}</p>
      </div>

      {loading && (
        <div className="loading-state quiz-loading">
          <div className="spinner" />
          <p>Generating Mystery Automata...</p>
        </div>
      )}

      {!loading && graphData && (
        <div className="graph-card quiz-graph-card">
          <GraphView data={graphData} title="Mystery DFA" theme={theme} showAliases={false} />
        </div>
      )}

      {feedback && (
        <div className={`error-banner quiz-feedback${feedback.type === "success" ? " success" : ""}`}>
          <span className="error-icon">{feedback.type === "success" ? "✓" : "!"}</span>
          {feedback.message}
        </div>
      )}

      {!loading && shuffledOptions.length > 0 && (
        <div className="quiz-options-grid">
          {shuffledOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`quiz-option${feedback?.type === "success" && option === quiz.correct ? " correct" : ""}`}
              onClick={() => handleGuess(option)}
              disabled={feedback?.type === "success"}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {feedback?.type === "success" && (
        <button type="button" className="convert-button quiz-next-button" onClick={loadRandomQuiz}>
          Next Question
        </button>
      )}
    </div>
  );
}
