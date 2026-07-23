"""
Interactive CLI: paste in a question and an answer, see the fine-tuned
model's evaluation printed live.

Usage: python3 ml-eval/demo.py
"""
import json
import re
import sys
from pathlib import Path

from mlx_lm import load, generate

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prompt_template import build_eval_prompt  # noqa: E402

ROOT = Path(__file__).resolve().parent
QUANTIZED_DIR = ROOT / "models" / "qwen2.5-1.5b-4bit"
ADAPTER_DIR = ROOT / "models" / "adapters"
MAX_TOKENS = 400


def extract_json(text: str):
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def prompt_for(label, default=None):
    suffix = f" [{default}]" if default else ""
    val = input(f"{label}{suffix}: ").strip()
    return val or default


def main():
    if not QUANTIZED_DIR.exists() or not ADAPTER_DIR.exists():
        print("Model/adapter not found - run finetune.sh first.")
        sys.exit(1)

    print("Loading fine-tuned model...")
    model, tokenizer = load(str(QUANTIZED_DIR), adapter_path=str(ADAPTER_DIR))
    print("Ready. Ctrl+C to quit.\n")

    while True:
        try:
            question = input("Question: ").strip()
            if not question:
                continue
            answer = input("Answer: ").strip()
            if not answer:
                continue
            role = prompt_for("Role", "Software Engineer")
            difficulty = prompt_for("Difficulty (easy/medium/hard)", "medium")
            level = prompt_for("Level (fresher/intermediate/experienced)", "intermediate")

            prompt = build_eval_prompt(question, answer, role=role, difficulty=difficulty, level=level)
            messages = [{"role": "user", "content": prompt}]
            chat_prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

            print("\nEvaluating...")
            raw = generate(model, tokenizer, prompt=chat_prompt, max_tokens=MAX_TOKENS, verbose=False)
            parsed = extract_json(raw)

            if parsed:
                print(json.dumps(parsed, indent=2))
            else:
                print("Model didn't return parseable JSON. Raw output:")
                print(raw)
            print()

        except KeyboardInterrupt:
            print("\nBye.")
            break


if __name__ == "__main__":
    main()
