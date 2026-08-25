import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../services/apiClient";
import AppHeader from "../components/AppHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Interview from "./Interview";

const SEGMENT_BASE = "rounded-lg px-5 py-2 text-sm transition border";
const SEGMENT_ACTIVE = "border-accent bg-accent text-bg";
const SEGMENT_INACTIVE = "border-border bg-surface text-text-secondary hover:bg-surface-hover";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const ANALYZING_STEPS = [
  "Reading your resume...",
  "Extracting skills and experience...",
  "Structuring your profile...",
  "Almost done...",
];

const LEVELS = ["fresher", "intermediate", "experienced"];

function ParsingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYZING_STEPS.length - 1));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="flex flex-col items-center gap-5 p-12 text-center">
      <div className="relative h-14 w-14">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-border"
        />
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div>
        <p className="font-medium text-text-primary">Analyzing your resume</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-1 text-sm text-text-secondary"
          >
            {ANALYZING_STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </Card>
  );
}

export default function ResumeInterview() {
  const [stage, setStage] = useState("upload"); // upload | analyzing | review | error
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [duration, setDuration] = useState(5);
  const [config, setConfig] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setStage("analyzing");
    setError("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await apiFetch("/interview/resume/analyze", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Couldn't analyze that resume.");
      setProfile(data);
      setStage("review");
    } catch (err) {
      setError(err.message || "Something went wrong analyzing your resume.");
      setStage("error");
    }
  };

  const updateField = (field, value) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  const removeSkill = (skill) => {
    setProfile((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  };

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    setProfile((p) => ({ ...p, skills: [...(p.skills || []), value] }));
    setSkillInput("");
  };

  const handleStart = () => {
    setConfig({
      role: profile.role_title || "Software Engineer",
      topics: profile.skills?.length ? profile.skills : ["General"],
      level: profile.estimated_level || "intermediate",
      duration,
      resumeProfile: profile,
    });
  };

  if (config) {
    return <Interview config={config} />;
  }

  return (
    <div className="min-h-screen text-text-primary">
      <AppHeader />

      <div className="flex justify-center px-6 pb-16">
        <div className="w-full max-w-2xl pt-10">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Resume-Based Interview</h1>
          <p className="mb-8 text-text-secondary">
            Upload your resume and the entire interview - every question - will be built around
            your actual background and skills.
          </p>

          {stage === "upload" && (
            <Card className="flex flex-col items-center gap-4 border-dashed p-12 text-center">
              <p className="text-text-secondary">Upload a PDF, DOCX, or plain text resume</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button onClick={() => fileInputRef.current?.click()}>Choose File</Button>
            </Card>
          )}

          {stage === "analyzing" && <ParsingIndicator />}

          {stage === "error" && (
            <Card className="flex flex-col items-center gap-4 p-12 text-center">
              <p className="text-red-400">{error}</p>
              <Button onClick={() => setStage("upload")}>Try Again</Button>
            </Card>
          )}

          {stage === "review" && profile && (
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
              <Card className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">Review what we found</p>
                  <span className="text-xs text-text-tertiary">Edit anything that looks off</span>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Name</label>
                    <input
                      value={profile.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Not detected"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Target Role</label>
                    <input
                      value={profile.role_title || ""}
                      onChange={(e) => updateField("role_title", e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-xs text-text-secondary">Experience Level</label>
                  <div className="flex gap-2">
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => updateField("estimated_level", lvl)}
                        className={`${SEGMENT_BASE} capitalize ${profile.estimated_level === lvl ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-xs text-text-secondary">
                    Skills we'll test - remove any that are wrong, add any that are missing
                  </label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {(profile.skills || []).map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1.5 rounded-md bg-surface-hover px-2.5 py-1 text-xs text-text-primary"
                      >
                        {s}
                        <button
                          onClick={() => removeSkill(s)}
                          aria-label={`Remove ${s}`}
                          className="text-text-tertiary hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {(!profile.skills || profile.skills.length === 0) && (
                      <span className="text-xs text-text-tertiary">No skills detected yet.</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Add a skill"
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <Button variant="secondary" size="sm" onClick={addSkill}>
                      Add
                    </Button>
                  </div>
                </div>

                {profile.experience?.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2 text-xs text-text-secondary">Experience</p>
                    <ul className="space-y-2">
                      {profile.experience.map((e, i) => (
                        <li key={i} className="rounded-lg border border-border px-3 py-2 text-sm text-text-primary">
                          <span className="font-medium">{e.title}</span>
                          {e.company && ` at ${e.company}`}
                          {e.duration && <span className="text-text-tertiary"> ({e.duration})</span>}
                          {e.highlights && <p className="mt-1 text-text-secondary">{e.highlights}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.education?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-text-secondary">Education</p>
                    <ul className="space-y-1">
                      {profile.education.map((ed, i) => (
                        <li key={i} className="text-sm text-text-primary">
                          {ed.degree}{ed.institution && `, ${ed.institution}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <p className="mb-3 text-sm font-medium text-text-secondary">Interview Duration</p>
                <div className="flex gap-2">
                  {[5, 10].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`${SEGMENT_BASE} ${duration === d ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                    >
                      {d} mins
                    </button>
                  ))}
                </div>
              </Card>

              <div className="flex items-center justify-between">
                <Button onClick={handleStart}>Start Interview</Button>
                <Button variant="ghost" onClick={() => setStage("upload")}>
                  Upload a Different Resume
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
