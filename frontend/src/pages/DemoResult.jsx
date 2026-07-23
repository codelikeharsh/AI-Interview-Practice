import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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

function readDemoSummary() {
  const raw = sessionStorage.getItem("demoSummary");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function DemoResult() {
  const [summary] = useState(readDemoSummary);

  if (!summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-text-secondary">
        <p>No demo report found - it may have expired.</p>
        <Button as={Link} to="/interview?demo=true">
          Try the Demo Again
        </Button>
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
    details = [],
  } = summary;

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
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">Demo Report</h1>
            <p className="text-text-secondary">
              A quick preview based on {total_questions} question{total_questions === 1 ? "" : "s"} -
              sign in for full-length interviews, saved history, and detailed feedback.
            </p>
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

          {/* SIGN IN CTA */}
          <Card variants={fadeUp} className="flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Want the full experience?</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Sign in for full-length interviews tailored to your role, detailed
                per-question feedback, and a history you can track over time.
              </p>
            </div>
            <Button as={Link} to="/login" className="shrink-0">
              Sign In for Full Experience
            </Button>
          </Card>

          {/* PER-QUESTION FEEDBACK */}
          {details.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-4">
              <h2 className="text-xl font-semibold">Question-by-Question Feedback</h2>
              {details.map((d, i) => (
                <QuestionFeedback key={i} index={i} entry={d} />
              ))}
            </motion.div>
          )}

          {/* ACTIONS */}
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <Button as={Link} to="/interview?demo=true" variant="secondary">
              Try Demo Again
            </Button>
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
