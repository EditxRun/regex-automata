import { useState } from "react";

export default function RegexInput({ onConvert, loading }) {
  const [regex, setRegex] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (regex.trim()) {
      onConvert(regex.trim());
    }
  };

  const examples = ["a*b", "a|b", "ab*", "(a|b)*abb"];

  return (
    <div className="regex-input-shell">
      <form className="regex-form" onSubmit={handleSubmit}>
        <div className="regex-input-wrapper">
          <span className="regex-input-prefix">re</span>
          <input
            id="regex-input"
            className="regex-input"
            value={regex}
            onChange={(event) => setRegex(event.target.value)}
            placeholder="e.g. (a|b)*abb"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <button
          id="convert-btn"
          className="convert-button"
          type="submit"
          disabled={loading || !regex.trim()}
        >
          {loading ? "Working..." : "Convert"}
        </button>
      </form>

      <div className="example-row">
        <span className="example-label">Try:</span>
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="example-chip"
            onClick={() => {
              setRegex(example);
              onConvert(example);
            }}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
