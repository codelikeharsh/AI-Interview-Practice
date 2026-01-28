import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function Result() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session");

  useEffect(() => {
    if (!sessionId) {
      setError("Invalid session");
      setLoading(false);
      return;
    }

    fetch(`${API}/interview/result/${sessionId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch result");
        return res.json();
      })
      .then(data => {
        setResult(data.summary);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading results…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  const {
    overall_score,
    avg_relevance,
    avg_clarity,
    avg_depth,
    avg_confidence,
    recommendation,
    total_questions,
  } = result;

  return (
    <div className="min-h-screen bg-black text-white px-8 py-10">
      <h1 className="text-4xl font-bold mb-6 text-green-400">
        Interview Result
      </h1>

      <div className="bg-zinc-900 rounded-xl p-6 max-w-3xl">
        <div className="text-2xl mb-4">
          Overall Score:{" "}
          <span className="font-bold text-green-400">
            {overall_score}/10
          </span>
        </div>

        <p className="mb-4">
          Recommendation:{" "}
          <span className="font-semibold text-cyan-400">
            {recommendation}
          </span>
        </p>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Stat label="Relevance" value={avg_relevance} />
          <Stat label="Clarity" value={avg_clarity} />
          <Stat label="Depth" value={avg_depth} />
          <Stat label="Confidence" value={avg_confidence} />
        </div>

        <p className="mt-6 text-sm text-gray-400">
          Questions answered: {total_questions}
        </p>

        <button
          onClick={() => (window.location.href = "/")}
          className="mt-8 bg-green-400 text-black px-6 py-2 rounded"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-black/40 rounded-lg p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xl font-semibold">{value}/10</p>
    </div>
  );
}
