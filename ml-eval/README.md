# Fine-tuned interview-answer evaluator (standalone project)

Fine-tunes a small local model (Qwen2.5-1.5B-Instruct, via Apple's MLX) to
score spoken interview answers - the same `{scores, strengths, improvements,
feedback}` shape the main app's Groq-based evaluator
(`backend/app/services/llm_evaluator.py`) already produces. This is a
standalone portfolio project: it does **not** touch the deployed app or its
Render backend (a small model like this would blow past Render's free-tier
512Mi limit). Everything here runs on your own Mac.

## Prerequisites

`mlx` and `mlx-lm` (0.31.3) are already installed on this machine and the
CLI commands below (`mlx_lm.convert`, `mlx_lm.lora`) were verified against
the real installed package - the flags in `finetune.sh` are confirmed
current, not guessed. If you're setting this up somewhere else:

```bash
pip install mlx mlx-lm
```

MLX is Apple-native and built for exactly this: fine-tuning small models on
Apple Silicon unified memory, no discrete GPU needed. This machine is a base
M2 with 8GB unified memory - genuinely tight for a 1.5B model. If Phase 3
below fails to run or is unbearably slow, see the fallback note there.

## Step 1 - Generate a labeled dataset via ChatGPT Plus (manual)

You'll do this yourself in ChatGPT, not via API. Open a **single, fresh
ChatGPT conversation** and paste this prompt:

```
You are creating a large, diverse labeled training dataset to fine-tune a
small model that evaluates spoken technical interview answers.

For this batch, invent 8 NEW interview questions - spread across these
categories: DSA, OOP, System Design, Databases, Frontend, Backend, and
Behavioral - and across difficulties easy/medium/hard. Do not repeat any
question you've generated earlier in this conversation - make this batch
cover genuinely different topics/scenarios than previous batches.

For EACH of the 8 questions: pick a candidate experience level (fresher,
intermediate, or experienced), then write 5 realistic candidate answers to
it in natural spoken-transcript style (contractions, informal phrasing -
NOT polished essay writing), one at each of these quality tiers: excellent,
good, mediocre, poor, off_topic.

For EACH of those 5 answers, evaluate it exactly as a strict, honest
technical interviewer would - score 0-10 on relevance/clarity/depth/
confidence, calibrated to that question's difficulty and the candidate's
level, and give specific (not generic) strengths and improvement points.

Return ONLY a valid JSON array, no markdown, no commentary before or after -
one object per answer (8 questions x 5 answers = 40 objects total this
batch), in this exact shape:
[
  {
    "category": "DSA",
    "difficulty": "medium",
    "level": "intermediate",
    "question": "...",
    "quality_tier": "excellent",
    "answer": "...",
    "scores": {"relevance": 0, "clarity": 0, "depth": 0, "confidence": 0},
    "strengths": ["..."],
    "improvements": ["..."],
    "feedback": "..."
  }
]

Rules:
- Scores must genuinely reflect the quality tier - excellent scores high
  across the board, poor/off_topic score low
- strengths/improvements must be specific to THIS answer, not generic advice
- Questions must be realistic, specific, scenario-based - not generic
  textbook trivia
- Output ONLY the JSON array, nothing else
```

Then:
1. Save the response as `ml-eval/data/raw/batch_01.json`.
2. Send the **same message again** (or a short "Generate another batch of 8,
   same rules and format") **in that same conversation** - ChatGPT remembers
   what it already generated in this thread and naturally avoids repeats.
   Save as `batch_02.json`, and so on.
3. **Aim for ~18-20 batches** (~150-160 unique questions x 5 tiers ≈
   750-800 labeled examples). That's a real dataset size, not a toy one,
   while still only being ~18-20 copy-paste rounds.
4. If ChatGPT starts repeating earlier questions in a very long thread,
   don't worry about it - `compile_dataset.py` (next step) deduplicates by
   question text automatically.

## Step 2 - Compile the dataset

```bash
python3 ml-eval/data/compile_dataset.py
```

Reads every file in `ml-eval/data/raw/`, validates each entry against the
expected shape (tells you exactly which file/entry is malformed if one of
your pastes got cut off or broke JSON), deduplicates by question text, and
writes `ml-eval/data/{train,valid,test}.jsonl` (80/10/10 split) in the
prompt/completion format MLX's LoRA trainer expects. Check the printed
summary (example count, tier balance) before moving on - if a tier looks
very underrepresented, it's worth generating a couple more batches first.

## Step 3 - Fine-tune

```bash
./ml-eval/finetune.sh
```

Quantizes Qwen2.5-1.5B-Instruct to 4-bit, then trains a LoRA adapter against
`train.jsonl`, validating against `valid.jsonl`. Watch the printed
validation loss - it should trend down and then flatten; if it's still
falling steadily when training stops, more iterations would likely help; if
it's climbing, the model's overfitting and you should stop earlier.

**If this doesn't fit in 8GB** (memory error, or it's unusably slow): open
`finetune.sh` and swap `Qwen2.5-1.5B-Instruct` for `Qwen2.5-0.5B-Instruct`
in the `MODEL` variable, then rerun from the top. Tell me what error you hit
and I'll help adjust batch size/settings before you switch models, though -
a smaller model is a real fallback, not necessarily the first thing to try.

## Step 4 - Evaluate

```bash
python3 ml-eval/evaluate.py
```

Runs the held-out `test.jsonl` through three things and prints a comparison
table: the un-tuned base model, the fine-tuned model (base + LoRA adapter),
and the ChatGPT-labeled scores as ground truth. Reports JSON-validity rate
and per-dimension Mean Absolute Error for both models against the ground
truth. This table plus a few example outputs is the actual artifact worth
putting in `REPORT.md` and linking from a resume/portfolio - paste me the
output and I'll help write that up.

## Step 5 - Try it live

```bash
python3 ml-eval/demo.py
```

Paste in a question and an answer, see the fine-tuned model's evaluation
printed on the spot - good for showing this off in an actual conversation
without the full app running.

## What this is, for the record

Distillation: the app's existing Groq-based evaluator (a 70B model) acts as
the "teacher" whose judgment gets captured in the labeled dataset (here,
generated by GPT via ChatGPT instead of scripted Groq calls); a much smaller
model (1.5B, quantized to 4-bit) is fine-tuned with LoRA to reproduce that
judgment. Nothing here is wired into the deployed app - it's a standalone,
benchmarked project living in this directory.
