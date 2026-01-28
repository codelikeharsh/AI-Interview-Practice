import { useState, useRef, useEffect } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";

const API = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/interview";

export default function Interview({ config }) {
  /* ---------------- STATE ---------------- */
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [warning, setWarning] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const timerRef = useRef(null);

  /* ---------------- REFS ---------------- */
  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const aiAudioRef = useRef(null);
  const audioCtxRef = useRef(null);

  const faceCameraRef = useRef(null);
  const lastFaceSeenRef = useRef(Date.now());

  /* =========================================================
     CAMERA — START ONCE (NO RESTART EVER)
  ========================================================= */
  useEffect(() => {
    let active = true;

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true,
    }).then((stream) => {
      if (!active) return;

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Face Detection (single instance)
      const detector = new FaceDetection({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
      });

      detector.setOptions({ model: "short", minDetectionConfidence: 0.6 });

      detector.onResults((res) => {
        const now = Date.now();
        if (res.detections?.length) {
          lastFaceSeenRef.current = now;
          setWarning(null);
        } else if (now - lastFaceSeenRef.current > 3000) {
          setWarning("⚠️ Face not detected");
        }
      });

      const cam = new Camera(videoRef.current, {
        onFrame: async () => detector.send({ image: videoRef.current }),
        width: 640,
        height: 480,
      });

      faceCameraRef.current = cam;
      cam.start();
    });

    return () => {
      active = false;
    };
  }, []);

  /* =========================================================
     AUTO START INTERVIEW
  ========================================================= */
  useEffect(() => {
    if (config && !sessionId) startInterview();
    // eslint-disable-next-line
  }, [config]);

  /* =========================================================
     TIMER
  ========================================================= */
  useEffect(() => {
    if (timeLeft === null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  /* =========================================================
     START INTERVIEW (WS)
  ========================================================= */
  const startInterview = () => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        event: "start",
        role: config.domain,
        topics: config.topics,
        level: config.level,
        duration: config.duration,
      }));
    };

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);

      if (data.event === "question") {
        setSessionId((p) => p || data.session_id);
        setQuestion(data.text);
        setQuestionCount((c) => c + 1);

        if (timeLeft === null) setTimeLeft(config.duration * 60);

        await playAIVoice(data.audio_url);
        startRecording(); // 🎙️ AFTER AI finishes
      }

      if (data.event === "end") {
        cleanup();
        window.location.href = `/result?session=${sessionId}`;
      }
    };
  };

  /* =========================================================
     AI VOICE — STOP PREVIOUS BEFORE PLAY
  ========================================================= */
  const playAIVoice = async (url) => {
    if (!url) return;

    // 🛑 Stop previous audio
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(`${API}${url}`);
    aiAudioRef.current = audio;

    try {
      await audio.play();
    } catch {
      /* ignore */
    }
  };

  /* =========================================================
     RECORD ANSWER (ONE RECORDER PER QUESTION)
  ========================================================= */
  const startRecording = () => {
    if (recording || !streamRef.current) return;

    setRecording(true);
    audioChunksRef.current = [];

    const audioTrack = streamRef.current.getAudioTracks()[0];
    const audioStream = new MediaStream([audioTrack]);

    const recorder = new MediaRecorder(audioStream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

    recorder.onstop = async () => {
      setRecording(false);

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const fd = new FormData();
      fd.append("file", blob);

      try {
        const res = await fetch(`${API}/interview/transcribe`, {
          method: "POST",
          body: fd,
        });
        const { text } = await res.json();

        wsRef.current.send(JSON.stringify({
          event: "transcript",
          text: text || "",
        }));
      } catch {
        /* backend closed */
      }
    };

    recorder.start();

    // Silence detection
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaStreamSource(audioStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    const start = Date.now();
    let silenceTimer = null;

    const loop = () => {
      if (recorder.state !== "recording") return;

      analyser.getByteTimeDomainData(data);
      const energy = data.reduce((a, b) => a + Math.abs(b - 128), 0);

      if (energy < 3000 && Date.now() - start > 4000) {
        if (!silenceTimer) silenceTimer = setTimeout(() => recorder.stop(), 2500);
      } else {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      requestAnimationFrame(loop);
    };

    loop();
  };

  /* =========================================================
     END INTERVIEW (SAFE)
  ========================================================= */
  const handleEndInterview = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "end" }));
    }
  };

  /* =========================================================
     CLEANUP
  ========================================================= */
  const cleanup = () => {
    aiAudioRef.current?.pause();
    recorderRef.current?.stop();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
  };

  /* =========================================================
     UI
  ========================================================= */
  return (
    <div className="fixed inset-0 bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none"
      />

      <div className="absolute top-0 left-0 right-0 bg-black/80 px-6 py-4 flex justify-between">
        <div>🎤 AI Interview</div>
        <div className="text-green-400 font-bold">
          ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      </div>

      {warning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-2 rounded">
          {warning}
        </div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <p className="text-2xl font-semibold">{question}</p>
        {recording && <p className="mt-4 text-red-400">🔴 Listening…</p>}

        <button
          onClick={handleEndInterview}
          className="mt-10 bg-purple-500 px-6 py-2 rounded text-black"
        >
          End Interview
        </button>
      </div>
    </div>
  );
}
