import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { apiFetch } from "../services/apiClient";
import AppHeader from "../components/AppHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function Result() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session");

  useEffect(() => {
    if (!sessionId) return;

    apiFetch(`/interview/summary/${sessionId}`)
      .then((res) => {
        if (res.status === 403) throw new Error("This interview belongs to a different account");
        if (!res.ok) throw new Error("Failed to fetch results");
        return res.json();
      })
      .then((data) => {
        if (data.summary) {
          setSummary(data.summary);
          setTimeline(data.timeline || []);
        } else {
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

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400">
        Invalid interview session
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-secondary">
        Analyzing interview performance…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400">
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
    unscored_answers = 0,
  } = summary || {};

  // Prefer the model's actual per-question feedback points when available;
  // fall back to the coarse score-threshold heuristic for older sessions
  // that predate per-question feedback, or ones where nothing could be scored.
  let strengths = timeline.flatMap((t) => t.strengths || []);
  let improvements = timeline.flatMap((t) => t.improvements || []);

  if (strengths.length === 0 && improvements.length === 0) {
    if (avg_relevance >= 7) strengths.push("Conceptual relevance");
    else improvements.push("Answer relevance");

    if (avg_clarity >= 7) strengths.push("Communication clarity");
    else improvements.push("Clear explanation");

    if (avg_depth >= 7) strengths.push("Technical depth");
    else improvements.push("Answer depth");

    if (avg_confidence >= 7) strengths.push("Confidence");
    else improvements.push("Speaking confidence");
  }

  return (
    <div className="min-h-screen text-text-primary">
      <AppHeader />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex justify-center px-6 pb-16"
      >
        <div className="w-full max-w-5xl space-y-10">

          {/* HEADER */}
          <motion.div variants={fadeUp} className="pt-10">
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">Interview Report</h1>
            <p className="text-text-secondary">
              Performance summary and detailed feedback
              {total_questions > 0 && ` · based on ${total_questions} question${total_questions === 1 ? "" : "s"}`}
            </p>
            {unscored_answers > 0 && (
              <p className="mt-2 text-sm text-amber-300">
                {unscored_answers} answer{unscored_answers === 1 ? "" : "s"} couldn't be scored
                (a temporary evaluation issue) and {unscored_answers === 1 ? "was" : "were"} excluded
                from these averages.
              </p>
            )}
          </motion.div>

          {/* SUMMARY CARD */}
          <Card variants={fadeUp} className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Overall Score</p>
                <p className="mt-1 text-5xl font-semibold">
                  {overall_score}
                  <span className="text-xl text-text-tertiary"> / 10</span>
                </p>
              </div>

              <span
                className={`rounded-lg px-4 py-2 text-sm font-medium
                ${recommendation === "Strong Hire" && "bg-emerald-500/10 text-emerald-400"}
                ${recommendation === "Hire" && "bg-blue-500/10 text-blue-400"}
                ${recommendation === "Needs Improvement" && "bg-yellow-500/10 text-yellow-400"}
                ${recommendation === "Not enough data" && "bg-surface-hover text-text-secondary"}
              `}
              >
                {recommendation}
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-6">
              <Metric label="Relevance" value={avg_relevance} />
              <Metric label="Clarity" value={avg_clarity} />
              <Metric label="Depth" value={avg_depth} />
              <Metric label="Confidence" value={avg_confidence} />
            </div>
          </Card>

          {/* CONFIDENCE GRAPH */}
          {timeline.length > 0 && (
            <Card variants={fadeUp} className="p-8">
              <h2 className="mb-4 text-xl font-semibold">
                Confidence Over Time
              </h2>
              <ConfidenceGraph timeline={timeline} />
            </Card>
          )}

          {/* STRENGTHS / WEAKNESSES */}
          <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-2">
            <Card className="p-8">
              <h2 className="mb-3 text-lg font-semibold">Strengths</h2>
              <ul className="space-y-2 text-sm text-emerald-400">
                {strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </Card>

            <Card className="p-8">
              <h2 className="mb-3 text-lg font-semibold">
                Needs Improvement
              </h2>
              <ul className="space-y-2 text-sm text-yellow-400">
                {improvements.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* PER-QUESTION FEEDBACK */}
          {timeline.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-4">
              <h2 className="text-xl font-semibold">Question-by-Question Feedback</h2>
              {timeline.map((t, i) => (
                <QuestionFeedback key={i} index={i} entry={t} />
              ))}
            </motion.div>
          )}

          {/* ACTIONS */}
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button onClick={() => window.print()}>
                Download PDF Report
              </Button>
              <Button as={Link} to="/history" variant="secondary">
                View All Interviews
              </Button>
            </div>

            <Button as={Link} to="/" variant="secondary">
              Back to Home
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Metric({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-tertiary">{value}/10</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function QuestionFeedback({ index, entry }) {
  const { question, scores, strengths = [], improvements = [], feedback, difficulty } = entry;
  const chips = [
    ["Relevance", scores?.relevance],
    ["Clarity", scores?.clarity],
    ["Depth", scores?.depth],
    ["Confidence", scores?.confidence],
  ];

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="font-medium text-text-primary">
          <span className="text-text-tertiary">Q{index + 1}. </span>
          {question}
        </p>
        {difficulty && (
          <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs capitalize text-text-secondary">
            {difficulty}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {chips.map(([label, value]) => (
          <span key={label} className="rounded-md bg-surface-hover px-2.5 py-1 text-xs text-text-secondary">
            {label} <span className="text-text-primary">{value ?? "-"}</span>
          </span>
        ))}
      </div>

      {feedback && <p className="mb-3 text-sm text-text-secondary">{feedback}</p>}

      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {strengths.length > 0 && (
            <ul className="space-y-1 text-sm text-emerald-400">
              {strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          )}
          {improvements.length > 0 && (
            <ul className="space-y-1 text-sm text-yellow-400">
              {improvements.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
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
    <svg viewBox="0 0 100 100" className="h-32 w-full">
      <path d={path} fill="none" stroke="#FF6152" strokeWidth="2" />
    </svg>
  );
}
