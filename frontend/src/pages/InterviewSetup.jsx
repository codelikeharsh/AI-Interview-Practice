import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const PRESETS = [
  {
    label: "AI / ML Engineer",
    domain: "AI / ML Engineer",
    topics: "Machine Learning, Deep Learning, CNN, NLP, Transformers",
  },
  {
    label: "Software Engineer",
    domain: "Software Engineer",
    topics: "DSA, OOP, Operating Systems, DBMS, System Design",
  },
  {
    label: "Frontend Developer",
    domain: "Frontend Developer",
    topics: "React, JavaScript, HTML, CSS, Performance, Accessibility",
  },
  {
    label: "Backend Developer",
    domain: "Backend Developer",
    topics: "APIs, Databases, Authentication, Caching, System Design",
  },
  {
    label: "Data Analyst",
    domain: "Data Analyst",
    topics: "SQL, Python, Statistics, Data Visualization, Pandas",
  },
];

const SEGMENT_BASE =
  "rounded-lg px-5 py-2 text-sm transition border";
const SEGMENT_ACTIVE = "border-accent bg-accent text-bg";
const SEGMENT_INACTIVE = "border-border bg-surface text-text-secondary hover:bg-surface-hover";

export default function InterviewSetup({ onStart, onCancel }) {
  const [domain, setDomain] = useState("");
  const [topics, setTopics] = useState("");
  const [level, setLevel] = useState("fresher");
  const [duration, setDuration] = useState(5);
  const [agreed, setAgreed] = useState(false);

  const canStart =
    domain.trim().length > 0 &&
    topics.trim().length > 0 &&
    agreed;

  const handlePreset = (preset) => {
    setDomain(preset.domain);
    setTopics(preset.topics);
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      role: domain,
      topics: topics.split(",").map(t => t.trim()),
      level,
      duration,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-6 backdrop-blur-sm"
    >
      <Card
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex w-full max-w-5xl overflow-hidden shadow-2xl"
      >

        {/* LEFT – PRESETS */}
        <div className="w-1/2 border-r border-border p-8">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-text-primary">
            Interview Presets
          </h2>
          <p className="mb-6 text-sm text-text-secondary">
            Start fast with curated roles and topics
          </p>

          <div className="flex flex-col gap-3">
            {PRESETS.map((p) => (
              <motion.button
                key={p.label}
                onClick={() => handlePreset(p)}
                whileHover={{ x: 4, borderColor: "rgba(255,97,82,0.4)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="group rounded-lg border border-border bg-surface px-5 py-4 text-left transition-colors hover:bg-surface-hover"
              >
                <div className="font-medium text-text-primary group-hover:text-accent">
                  {p.label}
                </div>
                <div className="mt-1 text-xs text-text-secondary line-clamp-2">
                  {p.topics}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* RIGHT – FORM */}
        <div className="w-1/2 p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-text-primary">
              Interview Setup
            </h3>
            <button
              onClick={onCancel}
              className="text-2xl text-text-tertiary hover:text-text-primary"
            >
              ×
            </button>
          </div>

          {/* DOMAIN */}
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Target Role *
            </label>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="e.g. AI / ML Engineer"
              className="w-full rounded-lg border border-border bg-surface px-4 py-2
                text-text-primary placeholder-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* TOPICS */}
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Topics *
            </label>
            <input
              value={topics}
              onChange={e => setTopics(e.target.value)}
              placeholder="DSA, CNN, SQL, APIs"
              className="w-full rounded-lg border border-border bg-surface px-4 py-2
                text-text-primary placeholder-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Comma separated (e.g. System Design, Databases)
            </p>
          </div>

          {/* EXPERIENCE */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              Experience Level *
            </label>
            <div className="flex gap-2">
              {["fresher", "intermediate", "experienced"].map(l => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`${SEGMENT_BASE} ${level === l ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* DURATION */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              Interview Duration *
            </label>
            <div className="flex gap-2">
              {[5, 10].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`${SEGMENT_BASE} ${duration === d ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                >
                  {d} mins
                </button>
              ))}
            </div>
          </div>

          {/* CONSENT */}
          <div className="mb-8 flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-1 accent-accent"
            />
            <p className="text-sm text-text-secondary">
              I agree to the{" "}
              <Link to="/terms" target="_blank" className="text-accent hover:text-accent-hover underline">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="text-accent hover:text-accent-hover underline">
                Privacy Policy
              </Link>
              , and allow camera and microphone access.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-between">
            <Button onClick={handleStart} disabled={!canStart}>
              Start Interview
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
