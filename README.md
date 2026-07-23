# Anteroom — AI Mock Interview

Anteroom is an AI-powered mock interview platform. It runs a real, spoken
interview over your camera and microphone — an AI interviewer asks
questions, listens to your actual voice answer, adapts difficulty based on
how you're doing, and gives you a detailed scored report afterward.

**Live app:** [anteroom-sigma.vercel.app](https://anteroom-sigma.vercel.app)

## What it does

- **Live voice interview.** No typing — you speak, voice activity detection
  ([Silero VAD](https://github.com/ricky0123/vad)) detects when you've
  finished answering, your answer is transcribed, evaluated, and the AI
  responds with the next question, spoken aloud with a natural
  text-to-speech voice.
- **A real interview structure**, not a trivia quiz: every interview opens
  with a warm-up question, then a behavioral/situational question, then
  moves into topic-based technical questions whose difficulty adapts turn by
  turn based on how well you're answering.
- **Resume-based interviews.** Upload a resume; it's parsed into a
  structured profile (skills, experience, target role, estimated level), and
  the entire interview — every question — is generated around your real
  background, rotating through your actual listed skills.
- **Question Bank.** Browse and search a curated bank of interview questions
  by category and difficulty, and practice any single one on demand with
  full AI-graded feedback.
- **Detailed evaluation reports**, not just a number: each answer is scored
  on relevance, clarity, depth, and confidence, with specific strengths and
  improvement points and a written feedback summary, plus a confidence trend
  across the interview.
- **No-signup demo.** "Try Demo" runs a short 3-question interview with no
  account required, for anyone who wants to try it before signing up.
- **Google sign-in**, interview history, and account management.

## How it's built

**Backend** — FastAPI (Python), WebSocket-driven interview state machine.
- PostgreSQL via SQLAlchemy 2.0 (async) + Alembic migrations
- Groq (Llama 3.3 70B) for question generation and answer evaluation
- [Edge-TTS](https://github.com/rany2/edge-tts) for natural neural
  text-to-speech, and Groq's Whisper endpoint for transcription
- Google OAuth for authentication, signed session cookies
- `pypdf` / `python-docx` for resume parsing
- In-memory sliding-window rate limiting on cost-bearing endpoints

**Frontend** — React 19 + Vite + Tailwind CSS + Framer Motion.
- Real-time camera/mic capture with client-side face-framing feedback
  ([MediaPipe](https://developers.google.com/mediapipe))
- Voice activity detection in-browser (no audio leaves the device until
  you're actually done speaking)

**Deployment** — Render (backend) + Vercel (frontend) + Neon (serverless
Postgres), all on free tiers.

## `ml-eval/` — fine-tuning a small model for answer evaluation

A standalone side-project: distilling the app's own answer-evaluation
judgment (normally a 70B-parameter model) into a **1.5B-parameter model
fine-tuned with LoRA**, small enough to run entirely on a laptop with no API
calls. On a held-out test set, this took scoring error from essentially
uninformative (5-7 points off on a 0-10 scale) down to 0.6-1.9 points, and
JSON-output validity from 93% to 100%.

See [`ml-eval/REPORT.md`](ml-eval/REPORT.md) for the full write-up and
results, and [`ml-eval/README.md`](ml-eval/README.md) for the reproducible
pipeline (dataset generation, training, evaluation).

## Running it locally

**Prerequisites:** Docker (for local Postgres), Python 3.12+, Node 18+.

```bash
# Database
docker compose up -d

# Backend
cd backend
cp .env.example .env   # fill in GROQ_API_KEY, GOOGLE_CLIENT_ID, etc.
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`, the backend at
`http://localhost:8000`.

## Project layout

```
backend/    FastAPI app - routers, WebSocket interview logic, services
frontend/   React app - pages, components, services
ml-eval/    Standalone LoRA fine-tuning project (see its own README)
```
