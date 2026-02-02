import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function Result() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session");

  useEffect(() => {
    if (!sessionId) {
      setError("Invalid interview session");
      setLoading(false);
      return;
    }

    // ✅ CORRECT ENDPOINT
    fetch(`${API}/interview/summary/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch results");
        return res.json();
      })
      .then((data) => {
        // ✅ Handle both response shapes safely
        if (data.summary) {
          setSummary(data.summary);
          setTimeline(data.timeline || []);
        } else {
          // backend returned summary directly
          setSummary(data);
          setTimeline([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center text-gray-300">
        Analyzing interview performance…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  const {
    overall_score = 0,
    avg_relevance = 0,
    avg_clarity = 0,
    avg_depth = 0,
    avg_confidence = 0,
    recommendation = "N/A",
    total_questions = 0,
  } = summary || {};

  const strengths = [];
  const improvements = [];

  if (avg_relevance >= 7) strengths.push("Conceptual relevance");
  else improvements.push("Answer relevance");

  if (avg_clarity >= 7) strengths.push("Communication clarity");
  else improvements.push("Clear explanation");

  if (avg_depth >= 7) strengths.push("Technical depth");
  else improvements.push("Answer depth");

  if (avg_confidence >= 7) strengths.push("Confidence");
  else improvements.push("Speaking confidence");

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-white px-6 py-10 flex justify-center">
      <div className="w-full max-w-5xl space-y-10">

        {/* HEADER */}
        <div>
          <h1 className="text-4xl font-semibold mb-2">Interview Report</h1>
          <p className="text-gray-400">
            Performance summary and detailed feedback
          </p>
        </div>

        {/* SUMMARY CARD */}
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Overall Score</p>
              <p className="text-5xl font-bold mt-1">
                {overall_score}
                <span className="text-xl text-gray-400"> / 10</span>
              </p>
            </div>

            <span
              className={`px-4 py-2 rounded-full text-sm font-medium
              ${recommendation === "Strong Hire" && "bg-emerald-500/20 text-emerald-400"}
              ${recommendation === "Hire" && "bg-blue-500/20 text-blue-400"}
              ${recommendation === "Needs Improvement" && "bg-yellow-500/20 text-yellow-400"}
            `}
            >
              {recommendation}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-8">
            <Metric label="Relevance" value={avg_relevance} />
            <Metric label="Clarity" value={avg_clarity} />
            <Metric label="Depth" value={avg_depth} />
            <Metric label="Confidence" value={avg_confidence} />
          </div>
        </Card>

        {/* CONFIDENCE GRAPH */}
        {timeline.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">
              Confidence Over Time
            </h2>
            <ConfidenceGraph timeline={timeline} />
          </Card>
        )}

        {/* STRENGTHS / WEAKNESSES */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold mb-3">Strengths</h2>
            <ul className="space-y-2 text-sm text-emerald-400">
              {strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-3">
              Needs Improvement
            </h2>
            <ul className="space-y-2 text-sm text-yellow-400">
              {improvements.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition"
          >
            Download PDF Report
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-2 rounded-full border border-white/20 text-gray-300 hover:bg-white/5"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Card({ children }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur rounded-2xl p-8 shadow-lg">
      {children}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">{value}/10</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function ConfidenceGraph({ timeline }) {
  if (!timeline.length) return null;

  const points = timeline.map((t, i) => ({
    x: i,
    y: 10 - (t.scores?.confidence ?? 5),
  }));

  const maxX = points.length - 1 || 1;

  const path = points
    .map((p, i) => {
      const x = (p.x / maxX) * 100;
      const y = (p.y / 10) * 100;
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full h-32">
      <path d={path} fill="none" stroke="url(#grad)" strokeWidth="3" />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}
