"""
Compares the un-tuned base model, the fine-tuned model (base + LoRA
adapter), and the ChatGPT-labeled ground truth on the held-out test set.
Reports JSON-validity rate and per-dimension Mean Absolute Error.

Usage: python3 ml-eval/evaluate.py
"""
import json
import re
import sys
from pathlib import Path

from mlx_lm import load, generate

ROOT = Path(__file__).resolve().parent
TEST_PATH = ROOT / "data" / "test.jsonl"
QUANTIZED_DIR = ROOT / "models" / "qwen2.5-1.5b-4bit"
ADAPTER_DIR = ROOT / "models" / "adapters"

SCORE_KEYS = ["relevance", "clarity", "depth", "confidence"]
MAX_TOKENS = 400


def load_test_set():
    if not TEST_PATH.exists():
        print(f"{TEST_PATH} not found - run compile_dataset.py first.")
        sys.exit(1)
    records = [json.loads(line) for line in TEST_PATH.read_text().splitlines() if line.strip()]
    print(f"Loaded {len(records)} held-out test examples.")
    return records


def extract_json(text: str):
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def run_model(model, tokenizer, records, label):
    """Runs generation for every test record, returns list of parsed (or None) outputs."""
    outputs = []
    for i, record in enumerate(records):
        messages = record["messages"][:1]  # just the user prompt
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        raw = generate(model, tokenizer, prompt=prompt, max_tokens=MAX_TOKENS, verbose=False)
        parsed = extract_json(raw)
        outputs.append(parsed)
        status = "ok" if parsed else "UNPARSEABLE"
        print(f"  [{label}] {i + 1}/{len(records)}: {status}")
    return outputs


def score_outputs(outputs, ground_truths):
    valid = [o for o in outputs if o and isinstance(o.get("scores"), dict)]
    validity_rate = len(valid) / len(outputs) if outputs else 0

    mae = {}
    for key in SCORE_KEYS:
        diffs = []
        for out, truth in zip(outputs, ground_truths):
            if out and isinstance(out.get("scores"), dict) and key in out["scores"]:
                try:
                    diffs.append(abs(float(out["scores"][key]) - float(truth["scores"][key])))
                except (TypeError, ValueError):
                    continue
        mae[key] = sum(diffs) / len(diffs) if diffs else None

    return validity_rate, mae


def main():
    records = load_test_set()
    ground_truths = [json.loads(r["messages"][1]["content"]) for r in records]

    if not QUANTIZED_DIR.exists():
        print(f"{QUANTIZED_DIR} not found - run finetune.sh first (it creates the quantized base model).")
        sys.exit(1)
    if not ADAPTER_DIR.exists():
        print(f"{ADAPTER_DIR} not found - run finetune.sh first.")
        sys.exit(1)

    print("\n=== Loading base model (no adapter) ===")
    base_model, base_tokenizer = load(str(QUANTIZED_DIR))
    print("=== Running base model on test set ===")
    base_outputs = run_model(base_model, base_tokenizer, records, "base")
    base_validity, base_mae = score_outputs(base_outputs, ground_truths)
    del base_model, base_tokenizer

    print("\n=== Loading fine-tuned model (base + LoRA adapter) ===")
    ft_model, ft_tokenizer = load(str(QUANTIZED_DIR), adapter_path=str(ADAPTER_DIR))
    print("=== Running fine-tuned model on test set ===")
    ft_outputs = run_model(ft_model, ft_tokenizer, records, "fine-tuned")
    ft_validity, ft_mae = score_outputs(ft_outputs, ground_truths)

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"{'Metric':<28} {'Base':>12} {'Fine-tuned':>15}")
    print(f"{'JSON validity rate':<28} {base_validity:>11.0%} {ft_validity:>14.0%}")
    for key in SCORE_KEYS:
        b = f"{base_mae[key]:.2f}" if base_mae[key] is not None else "n/a"
        f = f"{ft_mae[key]:.2f}" if ft_mae[key] is not None else "n/a"
        print(f"{'MAE - ' + key:<28} {b:>12} {f:>15}")

    print("\n(Lower MAE is better - it's the average |predicted score - ChatGPT ground-truth score|.)")

    print("\n--- Example side-by-side (first test item) ---")
    print("Question:", records[0]["messages"][0]["content"].split("Question asked:\n")[1].split("\n\n")[0])
    print("Ground truth:", json.dumps(ground_truths[0], indent=2))
    print("Base model output:", json.dumps(base_outputs[0], indent=2) if base_outputs[0] else "UNPARSEABLE")
    print("Fine-tuned output:", json.dumps(ft_outputs[0], indent=2) if ft_outputs[0] else "UNPARSEABLE")


if __name__ == "__main__":
    main()
