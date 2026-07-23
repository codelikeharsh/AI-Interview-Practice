"""
Reads every raw ChatGPT-generated batch file in data/raw/, validates each
entry, deduplicates by question text, and writes train/valid/test JSONL in
the chat format MLX's LoRA trainer expects.

Usage: python3 ml-eval/data/compile_dataset.py
"""
import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from prompt_template import build_eval_prompt  # noqa: E402

RAW_DIR = Path(__file__).resolve().parent / "raw"
OUT_DIR = Path(__file__).resolve().parent

REQUIRED_KEYS = {"category", "difficulty", "level", "question", "quality_tier", "answer", "scores", "strengths", "improvements", "feedback"}
SCORE_KEYS = {"relevance", "clarity", "depth", "confidence"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}
VALID_LEVELS = {"fresher", "intermediate", "experienced"}
VALID_TIERS = {"excellent", "good", "mediocre", "poor", "off_topic"}

SPLIT_SEED = 42
SPLIT_RATIOS = (0.8, 0.1, 0.1)  # train, valid, test


def _normalize_question(q: str) -> str:
    return re.sub(r"\s+", " ", (q or "").strip().lower())


def _validate_entry(entry, source, index):
    """Returns an error string if invalid, else None."""
    if not isinstance(entry, dict):
        return f"{source}[{index}]: not an object"

    missing = REQUIRED_KEYS - entry.keys()
    if missing:
        return f"{source}[{index}]: missing keys {sorted(missing)}"

    if entry["difficulty"] not in VALID_DIFFICULTIES:
        return f"{source}[{index}]: invalid difficulty {entry['difficulty']!r}"
    if entry["level"] not in VALID_LEVELS:
        return f"{source}[{index}]: invalid level {entry['level']!r}"
    if entry["quality_tier"] not in VALID_TIERS:
        return f"{source}[{index}]: invalid quality_tier {entry['quality_tier']!r}"

    scores = entry.get("scores")
    if not isinstance(scores, dict) or set(scores.keys()) != SCORE_KEYS:
        return f"{source}[{index}]: scores must have exactly {sorted(SCORE_KEYS)}"
    for k, v in scores.items():
        if not isinstance(v, (int, float)) or not (0 <= v <= 10):
            return f"{source}[{index}]: scores.{k}={v!r} out of range 0-10"

    if not isinstance(entry.get("strengths"), list):
        return f"{source}[{index}]: strengths must be a list"
    if not isinstance(entry.get("improvements"), list):
        return f"{source}[{index}]: improvements must be a list"
    if not entry.get("question") or not entry.get("answer"):
        return f"{source}[{index}]: empty question or answer"

    return None


def load_raw_entries():
    files = sorted(RAW_DIR.glob("*.json"))
    if not files:
        print(f"No files found in {RAW_DIR} - generate at least one batch via ChatGPT first (see README.md).")
        sys.exit(1)

    entries = []
    error_count = 0
    for f in files:
        try:
            data = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            print(f"SKIPPED {f.name}: invalid JSON ({e}) - re-paste this batch")
            error_count += 1
            continue

        if not isinstance(data, list):
            print(f"SKIPPED {f.name}: expected a JSON array at the top level")
            error_count += 1
            continue

        for i, entry in enumerate(data):
            err = _validate_entry(entry, f.name, i)
            if err:
                print(f"SKIPPED entry: {err}")
                error_count += 1
                continue
            entries.append(entry)

    print(f"\nLoaded {len(entries)} valid examples from {len(files)} files ({error_count} skipped).")
    return entries


def split_and_write(question_groups: dict):
    keys = list(question_groups.keys())
    random.Random(SPLIT_SEED).shuffle(keys)

    n = len(keys)
    n_train = int(n * SPLIT_RATIOS[0])
    n_valid = int(n * SPLIT_RATIOS[1])

    splits = {
        "train": keys[:n_train],
        "valid": keys[n_train:n_train + n_valid],
        "test": keys[n_train + n_valid:],
    }

    tier_counts = defaultdict(int)
    for split_name, split_keys in splits.items():
        out_path = OUT_DIR / f"{split_name}.jsonl"
        count = 0
        with out_path.open("w") as f:
            for key in split_keys:
                for entry in question_groups[key]:
                    prompt = build_eval_prompt(
                        entry["question"], entry["answer"],
                        role="Software Engineer",
                        difficulty=entry["difficulty"],
                        level=entry["level"],
                    )
                    completion = json.dumps({
                        "scores": entry["scores"],
                        "strengths": entry["strengths"],
                        "improvements": entry["improvements"],
                        "feedback": entry["feedback"],
                    })
                    record = {
                        "messages": [
                            {"role": "user", "content": prompt},
                            {"role": "assistant", "content": completion},
                        ]
                    }
                    f.write(json.dumps(record) + "\n")
                    count += 1
                    tier_counts[entry["quality_tier"]] += 1
        print(f"  {split_name}.jsonl: {len(split_keys)} questions, {count} examples")

    print("\nQuality tier balance across the full dataset:")
    for tier in VALID_TIERS:
        print(f"  {tier}: {tier_counts.get(tier, 0)}")


def main():
    entries = load_raw_entries()

    by_question = defaultdict(list)
    for e in entries:
        by_question[_normalize_question(e["question"])].append(e)

    n_duplicate_questions = sum(1 for group in by_question.values() if len(group) > 5)
    print(f"Unique questions: {len(by_question)}"
          f" ({n_duplicate_questions} appear more than once across batches - merged)")

    print("\nWriting train/valid/test splits (split by question, not by example, so no answer to the same question leaks across splits):")
    split_and_write(by_question)


if __name__ == "__main__":
    main()
