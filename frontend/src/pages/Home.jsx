import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { getHealth } from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import StatusDot from "../components/ui/StatusDot";

function IconMic({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function IconTarget({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChart({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" y1="20" x2="4" y2="12" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="20" y1="20" x2="20" y2="14" />
    </svg>
  );
}

const HOW_IT_WORKS_ITEMS = [
  {
    step: "1",
    title: "Choose Setup",
    body: "Select role, topics, level, and interview duration.",
  },
  {
    step: "2",
    title: "Answer Naturally",
    body: "AI detects turn completion and moves smoothly to next question.",
  },
  {
    step: "3",
    title: "Review Report",
    body: "End anytime to see a detailed performance breakdown.",
  },
];

const SAMPLE_METRICS = [
  { label: "Relevance", value: 8.5 },
  { label: "Clarity", value: 7.8 },
  { label: "Depth", value: 9.1 },
  { label: "Confidence", value: 8.0 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function Home() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Checking system…");
  const [systemOk, setSystemOk] = useState(null);
  const clickRef = useRef(null);
  const productRef = useRef(null);
  const howItWorksRef = useRef(null);

  useEffect(() => {
    getHealth()
      .then(() => {
        setStatus("All systems operational");
        setSystemOk(true);
      })
      .catch(() => {
        setStatus("Backend unavailable");
        setSystemOk(false);
      });
  }, []);

  const startFull = () => {
    clickRef.current?.play();
    navigate("/interview");
  };

  const startDemo = () => {
    clickRef.current?.play();
    navigate("/interview?demo=true");
  };

  const scrollToSection = (ref) => {
    clickRef.current?.play();
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen text-text-primary">
      <audio
        ref={clickRef}
        src="https://assets.mixkit.co/sfx/preview/mixkit-soft-click-1121.mp3"
        preload="auto"
      />

      <AppHeader
        extraLinks={
          <>
            <button
              onClick={() => scrollToSection(productRef)}
              className="hover:text-text-primary transition"
            >
              Product
            </button>
            <button
              onClick={() => scrollToSection(howItWorksRef)}
              className="hover:text-text-primary transition"
            >
              How it works
            </button>
          </>
        }
      />

      {/* HERO */}
      <main className="flex flex-col items-center px-6 pt-20 pb-16 text-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-block rounded-full border border-border bg-surface px-4 py-1 text-sm text-text-secondary"
          >
            AI mock interviews, on demand
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mb-6 max-w-3xl text-5xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
          >
            Interview with an AI that actually listens
          </motion.h1>

          <motion.p variants={fadeUp} className="mb-10 max-w-2xl text-lg text-text-secondary">
            Real-time voice interaction, adaptive questioning, and intelligent
            feedback — built for serious candidates.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={startFull}>
              Start Interview
            </Button>
            <Button size="lg" variant="secondary" onClick={startDemo}>
              Try Demo
            </Button>
            <Button size="lg" variant="secondary" as={Link} to="/interview/resume">
              Resume-Based Interview
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-xs text-text-tertiary">
            Demo requires camera and microphone permissions.
          </motion.p>
        </motion.div>

        {/* SAMPLE SCORECARD PREVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
          className="mt-16 w-full max-w-md"
        >
          <Card className="p-6 text-left">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Sample Report</p>
                <p className="text-sm font-medium text-text-primary">Frontend Developer · 5 questions</p>
              </div>
              <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                Strong Hire
              </span>
            </div>
            <div className="space-y-3">
              {SAMPLE_METRICS.map((m, i) => (
                <div key={m.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-text-secondary">{m.label}</span>
                    <span className="text-text-tertiary">{m.value}/10</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${m.value * 10}%` }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </main>

      {/* PRODUCT SECTION — bento grid */}
      <section ref={productRef} className="px-6 pb-20 pt-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Product
          </h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <motion.div variants={fadeUp} className="md:col-span-2">
              <Card className="p-6">
                <IconMic className="mb-4 h-6 w-6 text-accent" />
                <h3 className="mb-2 text-lg font-medium text-text-primary">Live Voice Interview</h3>
                <p className="max-w-md text-sm text-text-secondary">
                  AI asks and follows up in real time with natural pacing, adjusting difficulty
                  as you answer.
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="h-full p-6">
                <IconTarget className="mb-4 h-6 w-6 text-accent" />
                <h3 className="mb-2 font-medium text-text-primary">Role-Aware Questions</h3>
                <p className="text-sm text-text-secondary">Questions adapt to role, topic, and difficulty level.</p>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="h-full p-6">
                <IconChart className="mb-4 h-6 w-6 text-accent" />
                <h3 className="mb-2 font-medium text-text-primary">Instant Score Report</h3>
                <p className="text-sm text-text-secondary">See relevance, clarity, depth, and confidence metrics.</p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section ref={howItWorksRef} className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            How it works
          </h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {HOW_IT_WORKS_ITEMS.map((item) => (
              <motion.div key={item.step} variants={fadeUp}>
                <Card className="h-full p-6">
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-sm font-semibold text-accent">
                    {item.step}
                  </span>
                  <h3 className="mb-2 font-medium text-text-primary">{item.title}</h3>
                  <p className="text-sm text-text-secondary">{item.body}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="space-y-4 border-t border-border px-6 py-8 text-center text-xs text-text-tertiary">
        <StatusDot
          tone={systemOk === null ? "neutral" : systemOk ? "success" : "danger"}
          label={status}
          className="mx-auto"
        />
        <div className="flex justify-center gap-4">
          <Link to="/terms" className="hover:text-text-secondary transition">Terms</Link>
          <Link to="/privacy" className="hover:text-text-secondary transition">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
