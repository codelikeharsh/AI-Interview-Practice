import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { getHealth } from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import StatusDot from "../components/ui/StatusDot";
import logoIcon from "../assets/brand/icon-512.png";

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

function IconDocument({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  );
}

function IconLayers({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
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
    // Render's free tier sleeps after inactivity and returns an immediate
    // error response while cold-starting (rather than queueing the
    // request), which would otherwise show a false "unavailable" for the
    // ~30-50s it takes to wake up. Retry with backoff before giving up.
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 10;

    const check = () => {
      getHealth()
        .then(() => {
          if (cancelled) return;
          setStatus("All systems operational");
          setSystemOk(true);
        })
        .catch(() => {
          if (cancelled) return;
          attempt += 1;
          if (attempt < maxAttempts) {
            setStatus("Waking up the server…");
            setTimeout(check, 4000);
          } else {
            setStatus("Backend unavailable");
            setSystemOk(false);
          }
        });
    };

    check();
    return () => {
      cancelled = true;
    };
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
      <main className="relative flex flex-col items-center overflow-hidden px-6 pb-16 pt-24 text-center">
        {/* background depth: soft radial glow + faint dot grid, faded at the edges */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,97,82,0.25), transparent 70%)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 20%, black 0%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 20%, black 0%, transparent 75%)",
            }}
          />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          <motion.img
            variants={fadeUp}
            src={logoIcon}
            alt=""
            className="mb-6 h-12 w-auto drop-shadow-[0_0_24px_rgba(255,97,82,0.35)]"
          />

          <motion.span
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-1.5 text-sm text-text-secondary backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            AI mock interviews, on demand
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mb-6 max-w-4xl text-6xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
          >
            Interview with an AI
            <br className="hidden sm:block" /> that actually listens
          </motion.h1>

          <motion.p variants={fadeUp} className="mb-10 max-w-xl text-lg text-text-secondary">
            Real-time voice interaction, adaptive questioning, and intelligent
            feedback — built for serious candidates.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={startFull}>
              Start Interview
            </Button>
            <Button size="lg" variant="ghost" onClick={startDemo}>
              Try Demo →
            </Button>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6">
            <Link
              to="/interview/resume"
              className="group inline-flex items-center gap-3 rounded-full border border-accent/30 bg-accent/5 px-5 py-2.5 text-sm text-text-primary transition hover:border-accent/60 hover:bg-accent/10"
            >
              <IconDocument className="h-4 w-4 shrink-0 text-accent" />
              <span>
                Have a resume? <span className="font-medium">Upload it and get started</span>
              </span>
              <span className="text-accent transition group-hover:translate-x-0.5">→</span>
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-xs text-text-tertiary">
            Demo requires camera and microphone permissions.
          </motion.p>
        </motion.div>
      </main>

      {/* PRODUCT SECTION — even grid, no featured/oversized tile */}
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
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <motion.div variants={fadeUp}>
              <Card className="h-full p-6">
                <IconMic className="mb-4 h-6 w-6 text-accent" />
                <h3 className="mb-2 font-medium text-text-primary">Live Voice Interview</h3>
                <p className="text-sm text-text-secondary">
                  AI asks and follows up in real time, adjusting difficulty as you answer.
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

            <motion.div variants={fadeUp}>
              <Card as={Link} to="/interview/resume" interactive className="h-full p-6">
                <IconDocument className="mb-4 h-6 w-6 text-accent" />
                <h3 className="mb-2 font-medium text-text-primary">Resume-Based Interview</h3>
                <p className="text-sm text-text-secondary">Upload your resume for questions built around your real experience.</p>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card as={Link} to="/questions" interactive className="h-full p-6">
                <IconLayers className="mb-4 h-6 w-6 text-accent" />
                <h3 className="mb-2 font-medium text-text-primary">Question Bank</h3>
                <p className="text-sm text-text-secondary">Browse and practice real questions by category and difficulty.</p>
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
