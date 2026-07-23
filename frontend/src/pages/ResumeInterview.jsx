import { useRef, useState } from "react";
import { motion } from "framer-motion";
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

export default function ResumeInterview() {
  const [stage, setStage] = useState("upload"); // upload | analyzing | review | error
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
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

          {stage === "analyzing" && (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-text-primary">Analyzing your resume...</p>
              <p className="text-sm text-text-secondary">
                Extracting your skills, experience, and background.
              </p>
            </Card>
          )}

          {stage === "error" && (
            <Card className="flex flex-col items-center gap-4 p-12 text-center">
              <p className="text-red-400">{error}</p>
              <Button onClick={() => setStage("upload")}>Try Again</Button>
            </Card>
          )}

          {stage === "review" && profile && (
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Name</p>
                    <p className="font-medium text-text-primary">{profile.name || "Not detected"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">Target Role</p>
                    <p className="font-medium text-text-primary">{profile.role_title}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-sm text-text-secondary">
                    Experience Level: <span className="capitalize text-text-primary">{profile.estimated_level}</span>
                  </p>
                </div>

                {profile.skills?.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm text-text-secondary">Skills we'll test</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((s) => (
                        <span key={s} className="rounded-md bg-surface-hover px-2.5 py-1 text-xs text-text-primary">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.experience?.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm text-text-secondary">Experience</p>
                    <ul className="space-y-2">
                      {profile.experience.map((e, i) => (
                        <li key={i} className="text-sm text-text-primary">
                          <span className="font-medium">{e.title}</span>
                          {e.company && ` at ${e.company}`}
                          {e.duration && <span className="text-text-tertiary"> ({e.duration})</span>}
                          {e.highlights && <p className="text-text-secondary">{e.highlights}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.education?.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-text-secondary">Education</p>
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
