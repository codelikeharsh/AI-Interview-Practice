import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";
import { MicVAD } from "@ricky0123/vad-web";
import { API_BASE as API, WS_URL } from "../services/config";
import Button from "../components/ui/Button";
import StatusDot from "../components/ui/StatusDot";

const VAD_ASSET_PATH = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const VAD_ONNX_WASM_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";

const SKIP_PHRASES = [
  "i don't know",
  "dont know",
  "not aware",
  "no idea",
  "can't answer",
  "cannot answer",
];

const REPEAT_PHRASES = ["repeat", "say again", "once again"];
const MAX_ANSWER_MS = 105000;
const TTS_PLAY_TIMEOUT_MS = 4000;

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
  const vadRef = useRef(null);
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
  const startSentRef = useRef(false);

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

  /* VOICE ACTIVITY DETECTION (Silero VAD) */
  useEffect(() => {
    if (!cameraReady || vadRef.current) return;
    let cancelled = false;

    MicVAD.new({
      getStream: async () => streamRef.current,
      pauseStream: async () => {},
      resumeStream: async () => streamRef.current,
      baseAssetPath: VAD_ASSET_PATH,
      onnxWASMBasePath: VAD_ONNX_WASM_PATH,
      startOnLoad: false,
      redemptionMs: 1500,
      minSpeechMs: 300,
      preSpeechPadMs: 800,
      onSpeechStart: () => {},
      onSpeechEnd: () => stopRecordingRef.current?.("vad-speech-end"),
      onVADMisfire: () => console.log("[Interview] VAD misfire (too short); still listening"),
    })
      .then((vad) => {
        if (cancelled) {
          vad.destroy();
          return;
        }
        vadRef.current = vad;
        console.log("[Interview] Silero VAD ready");
      })
      .catch((err) => {
        console.error("[Interview] VAD init failed, falling back to manual controls only:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [cameraReady]);

  /* START WS */
  useEffect(() => {
    if (!config || wsRef.current) return;

    const wsUrl = config.demo ? `${WS_URL}?demo=true` : WS_URL;
    console.log("[Interview] Opening WebSocket:", wsUrl, config);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Interview] WebSocket connected");
      setWsConnected(true);
    };
    ws.onerror = (err) => {
      console.error("[Interview] WebSocket error:", err);
      setWsConnected(false);
    };
    ws.onclose = (evt) => {
      console.warn("[Interview] WebSocket closed:", evt.code, evt.reason);
      setWsConnected(false);
      if (evt.code === 4401) {
        showToast("Please sign in again to continue.", "error", 2500);
        window.location.href = "/login";
        return;
      }
      if (evt.code === 4429) {
        showToast("You've started a lot of interviews recently - try again soon.", "error", 3000);
        return;
      }
      showToast("Connection lost. Please refresh if interview stops.", "error", 2500);
    };

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);

      // Server-side keepalive - only exists to stop reverse proxies from
      // treating a long silent recording as an idle connection and killing it.
      if (data.event === "ping") return;

      console.log("[Interview] WebSocket message:", msg.data);

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
          await playAIVoiceRef.current(data.audio_url, data.text);
        }
        startRecordingRef.current?.();
      }

      if (data.event === "end") {
        console.log("[Interview] Interview end event received:", data);
        cleanupRef.current?.();

        if (data.summary) {
          // Demo mode - nothing persisted server-side, carry the summary
          // over to a lightweight, unauthenticated results page.
          sessionStorage.setItem("demoSummary", JSON.stringify(data.summary));
          window.location.href = "/demo-result";
          return;
        }

        const targetSessionId = sessionIdRef.current || sessionId;
        window.location.href = `/result?session=${targetSessionId || ""}`;
      }
    };
  }, [config]);

  /* SEND START ONLY ONCE THE WS IS OPEN AND CAMERA/MIC ARE READY - starting
     the question/audio before permissions resolve is jarring and can play
     into a mic that isn't actually being captured yet. */
  useEffect(() => {
    if (startSentRef.current) return;
    if (!wsConnected || !cameraReady) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    startSentRef.current = true;
    wsRef.current.send(JSON.stringify({ event: "start", ...config }));
    queueMicrotask(() => showToast("Connected to interview server", "success"));
  }, [wsConnected, cameraReady, config]);

  /* AI VOICE — server TTS, with an instant browser-voice fallback so a
     question is never silently un-audible. */
  function playAIVoice(url, text) {
    return new Promise((resolve) => {
      const speakBrowserFallback = () => {
        if (!text || !window.speechSynthesis) {
          resolve();
          return;
        }
        showToast("Using browser voice", "info");
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      };

      if (!url) {
        speakBrowserFallback();
        return;
      }

      let settled = false;
      const finishOnce = (fn) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      const audio = new Audio(`${API}${url}`);
      aiAudioRef.current = audio;

      const startTimeout = setTimeout(() => {
        finishOnce(() => {
          audio.pause();
          speakBrowserFallback();
        });
      }, TTS_PLAY_TIMEOUT_MS);

      audio.onended = () => finishOnce(resolve);
      audio.onerror = () => {
        clearTimeout(startTimeout);
        finishOnce(speakBrowserFallback);
      };

      audio.play()
        .then(() => clearTimeout(startTimeout))
        .catch(() => {
          clearTimeout(startTimeout);
          finishOnce(speakBrowserFallback);
        });
    });
  }

  /* RECORDING — Silero VAD decides when to stop, MediaRecorder captures audio */
  function startRecording() {
    if (!streamRef.current || recording) return;

    setStatus("listening");
    setRecording(true);
    audioChunksRef.current = [];

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
          credentials: "include",
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

    // Silero VAD drives onSpeechEnd -> stopRecording; this is just a hard
    // safety net in case VAD isn't ready or the user goes on forever.
    answerTimerRef.current = setTimeout(
      () => stopRecordingRef.current?.("max-answer-time"),
      MAX_ANSWER_MS
    );

    if (vadRef.current) {
      vadRef.current.start();
    } else {
      console.warn("[Interview] VAD not ready yet; relying on manual controls + max-answer timer");
    }
  }

  function stopRecording(reason = "unknown") {
    console.log("[Interview] Stopping recording:", reason);
    if (answerTimerRef.current) {
      clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    if (vadRef.current) {
      vadRef.current.pause();
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
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
    window.speechSynthesis?.cancel();
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (answerTimerRef.current) {
      clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
    }
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
    window.speechSynthesis?.cancel();
    setStatus("processing");
    if (recording) {
      skipInProgressRef.current = true;
      stopRecording("manual-skip");
    } else {
      vadRef.current?.pause();
    }
    wsRef.current?.send(JSON.stringify({ event: "skip" }));
  }

  function requestRepeat() {
    aiAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    if (recording) {
      skipInProgressRef.current = true;
      stopRecording("manual-repeat");
    } else {
      vadRef.current?.pause();
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

  const turnStateTone =
    status === "ai-speaking" ? "active" : status === "processing" ? "warning" : "success";

  const formattedTime =
    typeof timeLeft === "number" && timeLeft >= 0
      ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`
      : "--:--";

  return (
    <div className="fixed inset-0 bg-bg text-text-primary">
      <video ref={videoRef} autoPlay muted className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80" />

      <div className="absolute left-0 right-0 top-0 z-20 px-3 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/90 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-primary sm:gap-3 sm:text-sm">
            <span className="rounded-lg border border-border px-3 py-1">
              Role: {config?.role || "General"}
            </span>
            <span className="rounded-lg border border-border px-3 py-1">
              Question: {questionCount || 1}
            </span>
            <span className="rounded-lg border border-border px-3 py-1">
              Time Left: {formattedTime}
            </span>
          </div>
          {(!wsConnected || !cameraReady) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-sm">
              {!wsConnected && (
                <StatusDot
                  tone="danger"
                  label="Disconnected"
                  className="border-none bg-transparent px-0 py-0"
                />
              )}
              {!cameraReady && (
                <StatusDot
                  tone="warning"
                  label="Camera Pending"
                  className="border-none bg-transparent px-0 py-0"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {(cameraError || faceInFrame === false) && (
        <div className="absolute right-3 top-24 z-20 hidden md:block">
          <div
            className={`rounded-lg border px-4 py-3 text-sm backdrop-blur ${
              cameraError
                ? "border-red-400/40 bg-surface/90 text-red-300"
                : "border-amber-400/40 bg-surface/90 text-amber-300"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Webcam Framing</p>
            <p className="mt-1 leading-relaxed">
              {cameraError || "Move into center and improve lighting."}
            </p>
          </div>
        </div>
      )}

      {cameraError && !wsConnected === false && !question && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/90 px-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-xl border border-red-400/30 bg-surface p-6 text-center shadow-2xl">
            <p className="mb-2 font-medium text-text-primary">Camera & microphone required</p>
            <p className="text-sm text-text-secondary">
              {cameraError}. This is a voice interview, so both are needed to continue -
              allow access in your browser's site settings, then reload this page.
            </p>
          </div>
        </div>
      )}

      {/* Compact bottom bar - keeps the camera feed as the dominant element */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 sm:px-6 sm:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mx-auto max-h-[38vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-2xl sm:p-5"
        >
          <StatusDot
            tone={recording ? "danger" : turnStateTone}
            label={recording ? "Recording" : turnStateLabel}
            pulse={recording || status === "listening"}
            className="mb-3"
          />

          <p
            className={`text-base leading-relaxed text-text-primary transition-opacity duration-300 sm:text-lg ${
              questionVisible ? "opacity-100" : "opacity-30"
            }`}
          >
            {question || "Preparing your interview..."}
          </p>

          {(cameraError || faceInFrame === false) && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-sm md:hidden ${
                cameraError
                  ? "border-red-400/40 text-red-300"
                  : "border-amber-400/40 text-amber-300"
              }`}
            >
              {cameraError || "Face not clearly detected. Center your face and improve lighting."}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={requestRepeat}>
              Repeat Question
            </Button>
            <Button size="sm" onClick={submitCurrentAnswer} disabled={!recording}>
              Done Speaking
            </Button>
            <Button variant="secondary" size="sm" onClick={skipCurrentQuestion}>
              Skip This Question
            </Button>
            <Button variant="secondary" size="sm" onClick={finishAndViewReport}>
              End Interview & View Report
            </Button>
          </div>
          <p className="mt-3 text-xs text-text-tertiary">
            Shortcuts: <span className="text-text-secondary">R</span> Repeat,{" "}
            <span className="text-text-secondary">Enter</span> Done,{" "}
            <span className="text-text-secondary">S</span> Skip,{" "}
            <span className="text-text-secondary">E</span> End & Report
          </p>
        </motion.div>
      </div>
      {toast && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
          <div
            className={`rounded-lg border bg-surface px-4 py-2 text-sm shadow-lg backdrop-blur ${
              toast.tone === "success"
                ? "border-emerald-400/40 text-emerald-300"
                : toast.tone === "error"
                  ? "border-red-400/40 text-red-300"
                  : "border-border text-text-primary"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
