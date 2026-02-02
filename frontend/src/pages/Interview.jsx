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

export default function Interview({ config }) {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(null);

  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const aiAudioRef = useRef(null);
  const timerRef = useRef(null);

  /* CAMERA */
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      streamRef.current = s;
      videoRef.current.srcObject = s;

      const detector = new FaceDetection({
        locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`,
      });

      detector.setOptions({ model: "short", minDetectionConfidence: 0.6 });

      const cam = new Camera(videoRef.current, {
        onFrame: async () => detector.send({ image: videoRef.current }),
      });

      cam.start();
    });
  }, []);

  /* START WS */
  useEffect(() => {
    if (!config || wsRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ event: "start", ...config }));

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);

      if (data.event === "question" || data.event === "repeat") {
        setSessionId((s) => s || data.session_id);
        setQuestion(data.text);
        setQuestionCount((c) => c + (data.event === "question" ? 1 : 0));
        setStatus("ai-speaking");

        if (timeLeft === null) setTimeLeft(config.duration * 60);

        await playAIVoice(data.audio_url);
        startRecording();
      }

      if (data.event === "end") {
        cleanup();
        window.location.href = `/result?session=${sessionId}`;
      }
    };
  }, [config]);

  /* AI VOICE */
  const playAIVoice = (url) =>
    new Promise((resolve) => {
      if (!url) return resolve();
      const audio = new Audio(`${API}${url}`);
      aiAudioRef.current = audio;
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play();
    });

  /* RECORDING WITH PROPER SILENCE LOGIC */
  const startRecording = () => {
    setStatus("listening");
    setRecording(true);
    audioChunksRef.current = [];

    const audioTrack = streamRef.current.getAudioTracks()[0];
    const recorder = new MediaRecorder(new MediaStream([audioTrack]));
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

    recorder.onstop = async () => {
      setRecording(false);

      const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      if (blob.size < 3000) return;

      const fd = new FormData();
      fd.append("file", blob);

      const res = await fetch(`${API}/interview/transcribe`, {
        method: "POST",
        body: fd,
      });

      const { text } = await res.json();
      if (!text) return;

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

    // Natural stop after silence
    setTimeout(() => recorder.stop(), 25000); // long enough, no mid-cut
  };

  /* TIMER */
  useEffect(() => {
    if (timeLeft === null) return;
    timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  const cleanup = () => {
    aiAudioRef.current?.pause();
    recorderRef.current?.stop();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
  };

  return (
    <div className="fixed inset-0 bg-black text-white">
      <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/60 p-8 rounded-xl max-w-3xl">
          <div className="mb-4 text-sm">
            {status === "ai-speaking" ? "🤖 AI speaking" : "🎙️ Listening"}
          </div>
          <p className="text-2xl">{question || "Preparing your interview..."}</p>
          {recording && <div className="mt-4 text-red-400">● Recording</div>}
        </div>
      </div>
    </div>
  );
}
