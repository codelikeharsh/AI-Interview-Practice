import { useState, useRef, useEffect } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";

const API = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/interview";

const SKIP_PHRASES = [
  "i don't know",
  "dont know",
  "not aware",
  "no idea",
  "can't answer",
  "cannot answer",
];

const REPEAT_PHRASES = ["repeat", "say again", "once again"];
const MIN_SPEAK_MS = 1500;
const SILENCE_HOLD_MS = 1700;
const MAX_ANSWER_MS = 105000;
const GRACE_AFTER_START_MS = 800;
const ABS_MIN_RMS = 0.012;

export default function Interview({ config }) {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceInFrame, setFaceInFrame] = useState(null);
  const [toast, setToast] = useState(null);
  const [questionVisible, setQuestionVisible] = useState(true);

  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const aiAudioRef = useRef(null);
  const timerRef = useRef(null);
  const answerTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadRafRef = useRef(null);
  const speakingRef = useRef(false);
  const speechSegmentStartRef = useRef(null);
  const silenceStartRef = useRef(null);
  const answerStartRef = useRef(null);
  const spokenMsRef = useRef(0);
  const noiseFloorRef = useRef(0.008);
  const sessionIdRef = useRef(null);
  const skipInProgressRef = useRef(false);
  const playAIVoiceRef = useRef(null);
  const startRecordingRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopRecordingRef = useRef(null);
  const requestRepeatRef = useRef(null);
  const skipCurrentQuestionRef = useRef(null);
  const finishAndViewReportRef = useRef(null);
  const toastTimerRef = useRef(null);
  const questionFadeTimerRef = useRef(null);
  const timerInitializedRef = useRef(false);

  function showToast(message, tone = "info", ms = 1800) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }

  /* CAMERA */
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => {
        streamRef.current = s;
        videoRef.current.srcObject = s;
        setCameraReady(true);
        setCameraError("");

        const detector = new FaceDetection({
          locateFile: (f) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`,
        });

        detector.setOptions({ model: "short", minDetectionConfidence: 0.6 });
        detector.onResults((results) => {
          const found = (results?.detections || []).length > 0;
          setFaceInFrame(found);
        });

        const cam = new Camera(videoRef.current, {
          onFrame: async () => detector.send({ image: videoRef.current }),
        });

        cam.start();
      })
      .catch((err) => {
        console.error("[Interview] Camera/mic permission failed:", err);
        setCameraReady(false);
        setCameraError("Camera or microphone access blocked");
      });
  }, []);

  /* START WS */
  useEffect(() => {
    if (!config || wsRef.current) return;

    console.log("[Interview] Opening WebSocket:", WS_URL, config);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Interview] WebSocket connected, sending start event");
      setWsConnected(true);
      showToast("Connected to interview server", "success");
      ws.send(JSON.stringify({ event: "start", ...config }));
    };
    ws.onerror = (err) => {
      console.error("[Interview] WebSocket error:", err);
      setWsConnected(false);
    };
    ws.onclose = (evt) => {
      console.warn("[Interview] WebSocket closed:", evt.code, evt.reason);
      setWsConnected(false);
      showToast("Connection lost. Please refresh if interview stops.", "error", 2500);
    };

    ws.onmessage = async (msg) => {
      console.log("[Interview] WebSocket message:", msg.data);
      const data = JSON.parse(msg.data);

      if (data.event === "question" || data.event === "repeat") {
        if (data.session_id) {
          sessionIdRef.current = data.session_id;
        }
        setSessionId((s) => s || data.session_id);
        setQuestionVisible(false);
        if (questionFadeTimerRef.current) {
          clearTimeout(questionFadeTimerRef.current);
        }
        setQuestion(data.text);
        questionFadeTimerRef.current = setTimeout(() => setQuestionVisible(true), 40);
        setQuestionCount((c) => c + (data.event === "question" ? 1 : 0));
        setStatus("ai-speaking");

        if (!timerInitializedRef.current) {
          timerInitializedRef.current = true;
          setTimeLeft(config.duration * 60);
        }

        if (playAIVoiceRef.current) {
          await playAIVoiceRef.current(data.audio_url);
        }
        startRecordingRef.current?.();
      }

      if (data.event === "end") {
        console.log("[Interview] Interview end event received:", data);
        const targetSessionId = sessionIdRef.current || sessionId;
        cleanupRef.current?.();
        window.location.href = `/result?session=${targetSessionId || ""}`;
      }
    };
  }, [config]);

  /* AI VOICE */
  function playAIVoice(url) {
    return new Promise((resolve) => {
      if (!url) return resolve();
      const audio = new Audio(`${API}${url}`);
      aiAudioRef.current = audio;
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play();
    });
  }

  /* RECORDING WITH PROPER SILENCE LOGIC */
  function startRecording() {
    if (!streamRef.current || recording) return;

    setStatus("listening");
    setRecording(true);
    audioChunksRef.current = [];
    speakingRef.current = false;
    speechSegmentStartRef.current = null;
    silenceStartRef.current = null;
    answerStartRef.current = 0;
    spokenMsRef.current = 0;

    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      setRecording(false);
      return;
    }

    const recorder = new MediaRecorder(new MediaStream([audioTrack]));
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

    recorder.onstop = async () => {
      setRecording(false);
      if (skipInProgressRef.current) {
        skipInProgressRef.current = false;
        return;
      }
      setStatus("processing");

      const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      if (blob.size < 3000) {
        startRecording();
        return;
      }

      const fd = new FormData();
      fd.append("file", blob);

      let text = "";
      try {
        const res = await fetch(`${API}/interview/transcribe`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        text = (data?.text || "").trim();
      } catch (err) {
        console.error("[Interview] Transcription failed:", err);
        setStatus("listening");
        startRecording();
        return;
      }

      if (!text) {
        setStatus("listening");
        startRecording();
        return;
      }

      // Ignore accidental one-liners/noise and keep user on same question.
      if (text.length < 8 || text.split(/\s+/).filter(Boolean).length < 3) {
        console.log("[Interview] Transcript too short; continuing same question");
        setStatus("listening");
        startRecording();
        return;
      }

      const t = text.toLowerCase();

      if (REPEAT_PHRASES.some((p) => t.includes(p))) {
        wsRef.current.send(JSON.stringify({ event: "repeat" }));
        return;
      }

      if (SKIP_PHRASES.some((p) => t.includes(p))) {
        wsRef.current.send(JSON.stringify({ event: "transcript", text: "" }));
        return;
      }

      wsRef.current.send(JSON.stringify({ event: "transcript", text }));
    };

    recorder.start();
    startVoiceActivityDetection();
  }

  function stopRecording(reason = "unknown") {
    console.log("[Interview] Stopping recording:", reason);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    teardownVad();
  }

  function teardownVad() {
    if (answerTimerRef.current) {
      clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }

  async function startVoiceActivityDetection() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(streamRef.current);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.fftSize);
      let calibrationStart = null;
      let calibrationSamples = 0;
      let calibrationSum = 0;

      const rmsFromBuffer = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const normalized = (buffer[i] - 128) / 128;
          sum += normalized * normalized;
        }
        return Math.sqrt(sum / buffer.length);
      };

      const loop = (ts) => {
        const now = typeof ts === "number" ? ts : 0;
        if (!answerStartRef.current) {
          answerStartRef.current = now;
        }
        if (calibrationStart === null) {
          calibrationStart = now;
        }
        const elapsed = now - answerStartRef.current;
        const rms = rmsFromBuffer();

        if (elapsed < 600) {
          calibrationSamples += 1;
          calibrationSum += rms;
          const avg = calibrationSum / Math.max(calibrationSamples, 1);
          noiseFloorRef.current = Math.max(0.006, avg);
        } else if (!speakingRef.current) {
          noiseFloorRef.current = (noiseFloorRef.current * 0.96) + (rms * 0.04);
        }

        const dynamicThreshold = Math.max(ABS_MIN_RMS, noiseFloorRef.current * 2.0);
        const isSpeech = elapsed > GRACE_AFTER_START_MS && rms > dynamicThreshold;

        if (isSpeech) {
          if (!speakingRef.current) {
            speakingRef.current = true;
            speechSegmentStartRef.current = now;
          }
          silenceStartRef.current = null;
        } else {
          if (speakingRef.current && speechSegmentStartRef.current) {
            spokenMsRef.current += now - speechSegmentStartRef.current;
            speechSegmentStartRef.current = null;
          }
          speakingRef.current = false;

          if (!silenceStartRef.current) {
            silenceStartRef.current = now;
          }

          if (
            spokenMsRef.current >= MIN_SPEAK_MS &&
            silenceStartRef.current &&
            now - silenceStartRef.current >= SILENCE_HOLD_MS
          ) {
            stopRecording("silence-detected");
            return;
          }
        }

        if (now - calibrationStart >= MAX_ANSWER_MS) {
          stopRecordingRef.current?.("max-answer-time");
          return;
        }

        vadRafRef.current = requestAnimationFrame(loop);
      };

      answerTimerRef.current = setTimeout(
        () => stopRecordingRef.current?.("max-answer-time-safety"),
        MAX_ANSWER_MS + 1000
      );
      vadRafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error("[Interview] VAD setup failed, using timer fallback:", err);
      answerTimerRef.current = setTimeout(() => stopRecordingRef.current?.("timer-fallback"), 25000);
    }
  }

  // Manual override: press Enter to submit when you're done speaking.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.target &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Enter" && recording) {
        stopRecordingRef.current?.("manual-enter");
        showToast("Answer submitted", "info");
      }
      if (e.key.toLowerCase() === "r") {
        requestRepeatRef.current?.();
        showToast("Repeating current question", "info");
      }
      if (e.key.toLowerCase() === "s") {
        skipCurrentQuestionRef.current?.();
        showToast("Skipped to next question", "info");
      }
      if (e.key.toLowerCase() === "e") {
        finishAndViewReportRef.current?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recording]);

  /* TIMER */
  useEffect(() => {
    if (timeLeft === null) return;
    timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  function cleanup() {
    aiAudioRef.current?.pause();
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current.stop();
    }
    teardownVad();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
    timerInitializedRef.current = false;
  }

  function finishAndViewReport() {
    const sid = sessionIdRef.current || sessionId;
    cleanup();
    if (sid) {
      window.location.href = `/result?session=${sid}`;
      return;
    }
    window.location.href = "/";
  }

  function skipCurrentQuestion() {
    aiAudioRef.current?.pause();
    setStatus("processing");
    if (recording) {
      skipInProgressRef.current = true;
      stopRecording("manual-skip");
    } else {
      teardownVad();
    }
    wsRef.current?.send(JSON.stringify({ event: "skip" }));
  }

  function requestRepeat() {
    aiAudioRef.current?.pause();
    if (recording) {
      skipInProgressRef.current = true;
      stopRecording("manual-repeat");
    } else {
      teardownVad();
    }
    setStatus("processing");
    wsRef.current?.send(JSON.stringify({ event: "repeat" }));
  }

  function submitCurrentAnswer() {
    if (recording) {
      stopRecording("manual-done-speaking");
    }
  }

  useEffect(() => {
    playAIVoiceRef.current = playAIVoice;
    startRecordingRef.current = startRecording;
    cleanupRef.current = cleanup;
    stopRecordingRef.current = stopRecording;
    requestRepeatRef.current = requestRepeat;
    skipCurrentQuestionRef.current = skipCurrentQuestion;
    finishAndViewReportRef.current = finishAndViewReport;
  });

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (questionFadeTimerRef.current) clearTimeout(questionFadeTimerRef.current);
  }, []);

  const turnStateLabel =
    status === "ai-speaking"
      ? "AI Speaking"
      : status === "processing"
        ? "Processing Response"
        : "Listening";

  const turnStateClass =
    status === "ai-speaking"
      ? "text-indigo-300 bg-indigo-500/20 border-indigo-400/30"
      : status === "processing"
        ? "text-amber-300 bg-amber-500/20 border-amber-400/30"
        : "text-emerald-300 bg-emerald-500/20 border-emerald-400/30";

  const formattedTime =
    typeof timeLeft === "number" && timeLeft >= 0
      ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`
      : "--:--";

  const baseActionBtn =
    "min-h-11 rounded-full border px-4 py-2.5 text-sm font-medium transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black " +
    "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0";

  const activeActionBtn =
    "border-white/35 bg-white/5 text-white hover:bg-white/12 hover:border-white/55";

  const subtleActionBtn =
    "border-white/25 bg-black/30 text-slate-200 hover:bg-white/10 hover:border-white/45";

  return (
    <div className="fixed inset-0 bg-[#05070d] text-white">
      <video ref={videoRef} autoPlay muted className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80" />

      <div className="absolute left-0 right-0 top-0 z-20 px-3 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-black/50 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-100 sm:gap-3 sm:text-sm">
            <span className="rounded-full border border-white/20 px-3 py-1">
              Role: {config?.role || "General"}
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1">
              Question: {questionCount || 1}
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1">
              Time Left: {formattedTime}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-sm">
            <span
              className={`rounded-full border px-3 py-1 ${
                wsConnected ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-red-400/50 bg-red-500/10 text-red-200"
              }`}
            >
              {wsConnected ? "WS Connected" : "WS Disconnected"}
            </span>
            <span
              className={`rounded-full border px-3 py-1 ${
                cameraReady ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-amber-400/50 bg-amber-500/10 text-amber-200"
              }`}
            >
              {cameraReady ? "Camera Ready" : "Camera Pending"}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-24 z-20 hidden md:block">
        <div
          className={`rounded-xl border px-4 py-3 text-sm backdrop-blur ${
            faceInFrame === null
              ? "border-slate-500/40 bg-black/35 text-slate-200"
              : faceInFrame
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-400/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-300">Webcam Framing</p>
          <p className="mt-1 leading-relaxed">
            {cameraError
              ? cameraError
              : faceInFrame === null
                ? "Checking face position..."
                : faceInFrame
                  ? "Face aligned well for interview capture."
                  : "Move into center and improve lighting."}
          </p>
        </div>
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pt-20 sm:px-6">
        <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-black/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7 md:p-8">
          <div className={`mb-4 inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${turnStateClass}`}>
            <span className="mr-2">
              {status === "ai-speaking" ? "🤖" : status === "processing" ? "⏳" : "🎙️"}
            </span>
            {turnStateLabel}
          </div>

          <p
            className={`text-xl leading-relaxed text-slate-100 transition-opacity duration-300 sm:text-2xl md:text-[1.8rem] ${
              questionVisible ? "opacity-100" : "opacity-30"
            }`}
          >
            {question || "Preparing your interview..."}
          </p>

          {recording && (
            <div className="mt-4 inline-flex items-center rounded-full border border-red-400/50 bg-red-500/10 px-3 py-1 text-sm text-red-300 motion-safe:animate-pulse">
              <span className="mr-2">●</span>Recording
            </div>
          )}

          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm md:hidden ${
              faceInFrame === null
                ? "border-slate-500/40 text-slate-300"
                : faceInFrame
                  ? "border-emerald-400/40 text-emerald-300"
                  : "border-amber-400/40 text-amber-300"
            }`}
          >
            {cameraError
              ? cameraError
              : faceInFrame === null
                ? "Checking webcam framing..."
                : faceInFrame
                  ? "Face detected and centered."
                  : "Face not clearly detected. Center your face and improve lighting."}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={requestRepeat}
              className={`${baseActionBtn} ${subtleActionBtn}`}
            >
              Repeat Question
            </button>
            <button
              onClick={submitCurrentAnswer}
              disabled={!recording}
              className={`${baseActionBtn} ${
                recording
                  ? activeActionBtn
                  : "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
              }`}
            >
              Done Speaking
            </button>
            <button
              onClick={skipCurrentQuestion}
              className={`${baseActionBtn} ${subtleActionBtn}`}
            >
              Skip This Question
            </button>
            <button
              onClick={finishAndViewReport}
              className={`${baseActionBtn} ${subtleActionBtn}`}
            >
              End Interview & View Report
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Shortcuts: <span className="text-slate-200">R</span> Repeat,{" "}
            <span className="text-slate-200">Enter</span> Done,{" "}
            <span className="text-slate-200">S</span> Skip,{" "}
            <span className="text-slate-200">E</span> End & Report
          </p>
        </div>
      </div>
      {toast && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
          <div
            className={`rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur ${
              toast.tone === "success"
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                : toast.tone === "error"
                  ? "border-red-400/50 bg-red-500/15 text-red-100"
                  : "border-white/30 bg-black/45 text-slate-100"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
