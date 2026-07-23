# Fine-tuning a small model for interview-answer evaluation

**TL;DR:** Fine-tuned Qwen2.5-1.5B-Instruct with LoRA to score spoken interview
answers, distilling the judgment of a 70B-parameter teacher model into a
model ~45x smaller. On a held-out test set, average scoring error dropped
from 5.3-7.4 points (out of 10) to 0.6-1.9 points, and JSON-output validity
went from 93% to 100%.

## Why

[Anteroom](../README.md) — an AI mock-interview practice app — scores spoken
answers on relevance, clarity, depth, and confidence using a large model
(Llama 3.3 70B via Groq) as the evaluator. This project asks: how much of
that judgment can be distilled into a small model that runs entirely
on-device, with no API dependency? It's a standalone project, not wired into
the deployed app (a model at this size would exceed the free hosting
tier's memory budget) — the goal is the ML work itself: build a labeled
dataset, fine-tune, and measure whether it actually worked.

## Method

**Knowledge distillation.** A large model's judgment on question/answer pairs
was captured as labeled training data (720 examples), then a much smaller
model was fine-tuned to reproduce that judgment. The "teacher" here was
ChatGPT (GPT-4-class) rather than the app's own Groq evaluator — ChatGPT was
also used to generate the questions and synthetic candidate answers
themselves, at five deliberately distinct quality tiers (excellent / good /
mediocre / poor / off-topic) per question, so the model would see genuine
score variance to learn from rather than everything clustering around the
same value.

**Dataset.** 144 unique interview questions across 7 categories (DSA, OOP,
System Design, Databases, Frontend, Backend, Behavioral) and 3 difficulty
levels, each with 5 answers spanning the quality spectrum — 720 labeled
examples total, perfectly balanced (144 of each tier). Split by *question*
(not by individual example) into train/validation/test, so no answer to a
question seen during training ever leaks into the test set:

| Split | Questions | Examples |
|---|---|---|
| Train | 115 | 575 |
| Validation | 14 | 70 |
| Test (held out) | 15 | 75 |

**Model.** [Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct),
quantized to 4-bit, fine-tuned with **LoRA** (Low-Rank Adaptation) via
Apple's [MLX](https://github.com/ml-explore/mlx) framework — chosen
specifically because it runs efficiently on Apple Silicon unified memory
with no discrete GPU, which is what this had to run on (a base M2 MacBook
Air, 8GB RAM). LoRA freezes the base model's weights and trains only small
low-rank adapter matrices, which is what makes fine-tuning a billion-plus
parameter model tractable on consumer hardware in the first place — the
resulting adapter is tens of megabytes, not a multi-gigabyte full model
checkpoint.

**Training.** 800 iterations, batch size 2, LoRA applied to 8 layers,
gradient checkpointing enabled to fit in memory. Final validation loss:
0.652. Peak memory: 3.1GB.

## Results

Evaluated on the 75 held-out test examples (never seen during training),
comparing the un-tuned base model against the fine-tuned model, both against
the ChatGPT-labeled scores as ground truth:

| Metric | Base model | Fine-tuned |
|---|---|---|
| JSON validity rate | 93% | **100%** |
| MAE — relevance | 6.34 | **1.85** |
| MAE — clarity | 7.41 | **0.63** |
| MAE — depth | 5.07 | **1.88** |
| MAE — confidence | 6.20 | **1.40** |

(MAE = mean absolute error against ground truth, on a 0-10 scale — lower is
better. A base-model MAE of 5-7 points on a 0-10 scale is close to
uninformative; error in the 0.6-1.9 range means the fine-tuned model is
consistently landing within one to two points of the reference score.)

## A concrete example

**Question:** *"Find the maximum sum of any path in a binary tree, where a
path may start and end at any nodes."*

The candidate's answer correctly described the standard approach (postorder
traversal tracking a running global maximum, clamping negative branch
contributions to zero).

- **Ground truth:** relevance 10, clarity 9, depth 9, confidence 9 — *"Strong
  answer: correct, specific, and appropriately deep for the stated level."*
- **Base model:** relevance 0, clarity 0, depth 0, confidence 0 — incorrectly
  claimed *"the candidate's answer is not relevant to the question asked,"*
  apparently failing to recognize a textbook-standard algorithm for this
  exact problem.
- **Fine-tuned model:** relevance 10, clarity 9, depth 9, confidence 9 —
  correctly identified the approach, explained *why* it was correct
  (downward-gain clamping, correct complexity), and matched the ground truth
  almost exactly.

This is the pattern across the test set, not a cherry-picked outlier: the
base 1.5B model is not reliably competent at multi-dimensional answer
scoring out of the box; after LoRA fine-tuning on 575 labeled examples, it
is.

## Honest caveats

- "Ground truth" here is a large language model's judgment (ChatGPT),
  not human-expert annotation — the results show the small model
  successfully learned to reproduce a strong AI evaluator's judgment, which
  is exactly what knowledge distillation is; it is not a claim of
  independently-verified interview-scoring accuracy against human raters.
- The dataset is synthetic (ChatGPT-generated questions and answers), not
  real user interview data — it was designed for quality-tier balance and
  topic diversity rather than sampled from real usage.
- Test set is 75 examples across 15 questions — enough to show a clear,
  large effect size, not enough for fine-grained statistical claims.

## What this demonstrates

- Building a labeled dataset from scratch, with a deliberate design for
  score-label diversity (the quality-tier system) rather than ad hoc
  collection.
- Knowledge distillation: transferring a large model's task-specific
  judgment into a much smaller one.
- Parameter-efficient fine-tuning (LoRA) — the same class of technique used
  in production to customize large models without full retraining.
- Running a complete fine-tuning + evaluation pipeline on consumer
  hardware (Apple M2, MLX), not a rented GPU cluster.
- Rigorous evaluation methodology: question-level train/val/test splitting
  to prevent leakage, a held-out test set, and quantitative before/after
  metrics rather than a qualitative "it seems better" claim.

## Reproducing this

See [README.md](README.md) for the full step-by-step pipeline (dataset
generation prompt, training command, evaluation script).
