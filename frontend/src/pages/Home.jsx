import { useEffect, useState, useRef } from "react";
import { getHealth } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Checking system…");
  const clickRef = useRef(null);
  const productRef = useRef(null);
  const howItWorksRef = useRef(null);

  useEffect(() => {
    getHealth()
      .then(() => setStatus("All systems operational"))
      .catch(() => setStatus("Backend unavailable"));
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
    <div className="relative min-h-screen overflow-hidden text-slate-100">

      {/* 🎧 click */}
      <audio
        ref={clickRef}
        src="https://assets.mixkit.co/sfx/preview/mixkit-soft-click-1121.mp3"
        preload="auto"
      />

      {/* 🌈 animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br
        from-[#0B0F1A] via-[#121A2F] to-[#0E1324]
        animate-gradient-slow -z-20" />

      {/* 🌫️ glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2
        w-[900px] h-[900px]
        bg-indigo-500/10 blur-[180px] -z-10" />

      {/* 🎥 abstract video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-[0.06] blur-xl -z-10"
      >
        <source
          src="https://cdn.coverr.co/videos/coverr-liquid-abstract-4598/1080p.mp4"
          type="video/mp4"
        />
      </video>

      {/* 🧭 NAVBAR */}
      <nav className="relative z-10 flex justify-between items-center px-10 py-6">
        <div className="text-xl font-bold tracking-tight">
          <span className="text-indigo-400">AI</span> Interview Coach
        </div>

        <div className="flex gap-6 text-sm text-slate-400">
          <button
            onClick={() => scrollToSection(productRef)}
            className="hover:text-slate-200 transition"
          >
            Product
          </button>
          <button
            onClick={() => scrollToSection(howItWorksRef)}
            className="hover:text-slate-200 transition"
          >
            How it works
          </button>
        </div>
      </nav>

      {/* HERO */}
      <main className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-6">
        <div
          className={`transition-all duration-700 ease-out
            opacity-100 translate-y-0
          `}
        >
          <span className="inline-block mb-4 px-4 py-1 rounded-full
            bg-white/5 border border-white/10 text-slate-300 text-sm">
            Practice interviews like the real thing
          </span>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Interview with an AI<br />that actually listens
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10">
            Real-time voice interaction, adaptive questioning,
            and intelligent feedback — built for serious candidates.
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={startFull}
              className="px-10 py-4 rounded-full font-semibold
                bg-indigo-400 text-black
                hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]
                transition"
            >
              Start Interview
            </button>

            <button
              onClick={startDemo}
              className="px-10 py-4 rounded-full font-semibold
                bg-white/5 border border-white/10
                hover:bg-white/10 transition"
            >
              Try Demo
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Demo requires camera and microphone permissions.
          </p>
        </div>
      </main>

      {/* PRODUCT SECTION */}
      <section ref={productRef} className="relative z-10 px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Product</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-semibold mb-2 text-slate-100">Live Voice Interview</h3>
              <p className="text-sm text-slate-400">AI asks and follows up in real time with natural pacing.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-semibold mb-2 text-slate-100">Role-Aware Questions</h3>
              <p className="text-sm text-slate-400">Questions adapt to role, topic, and difficulty level.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-semibold mb-2 text-slate-100">Instant Score Report</h3>
              <p className="text-sm text-slate-400">See relevance, clarity, depth, and confidence metrics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section ref={howItWorksRef} className="relative z-10 px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-indigo-300 text-sm mb-2">Step 1</div>
              <h3 className="font-semibold mb-2 text-slate-100">Choose Setup</h3>
              <p className="text-sm text-slate-400">Select role, topics, level, and interview duration.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-indigo-300 text-sm mb-2">Step 2</div>
              <h3 className="font-semibold mb-2 text-slate-100">Answer Naturally</h3>
              <p className="text-sm text-slate-400">AI detects turn completion and moves smoothly to next question.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-indigo-300 text-sm mb-2">Step 3</div>
              <h3 className="font-semibold mb-2 text-slate-100">Review Report</h3>
              <p className="text-sm text-slate-400">End anytime to see a detailed performance breakdown.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER STATUS */}
      <footer className="relative z-10 pb-6 text-center text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          {status}
        </span>
      </footer>

      {/* CSS */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-slow {
          background-size: 300% 300%;
          animation: gradientMove 40s ease infinite;
        }
      `}</style>
    </div>
  );
}
