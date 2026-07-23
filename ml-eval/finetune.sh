#!/usr/bin/env bash
# Quantizes the base model, then LoRA-fine-tunes it against ml-eval/data/{train,valid}.jsonl.
# Run from anywhere: ./ml-eval/finetune.sh
set -euo pipefail

cd "$(dirname "$0")"

# --- Config - tune these if training doesn't fit in 8GB or is too slow ---
MODEL="Qwen/Qwen2.5-1.5B-Instruct"      # fallback: Qwen/Qwen2.5-0.5B-Instruct
QUANTIZED_DIR="models/qwen2.5-1.5b-4bit"
ADAPTER_DIR="models/adapters"
ITERS=800
BATCH_SIZE=2
NUM_LAYERS=8       # how many of the model's layers get LoRA adapters - fewer = less memory
SAVE_EVERY=100
STEPS_PER_EVAL=100

python3 -c "import mlx_lm" 2>/dev/null || {
  echo "mlx-lm isn't installed. Run: pip install mlx mlx-lm"
  exit 1
}

if [ ! -f data/train.jsonl ]; then
  echo "data/train.jsonl not found - run compile_dataset.py first (see README.md)."
  exit 1
fi

if [ ! -d "$QUANTIZED_DIR" ]; then
  echo "=== Quantizing $MODEL to 4-bit -> $QUANTIZED_DIR ==="
  mlx_lm.convert --hf-path "$MODEL" --mlx-path "$QUANTIZED_DIR" -q
else
  echo "=== Found existing quantized model at $QUANTIZED_DIR, skipping conversion ==="
fi

echo "=== Training LoRA adapter ==="
mkdir -p "$ADAPTER_DIR"
mlx_lm.lora \
  --model "$QUANTIZED_DIR" \
  --train \
  --data data \
  --fine-tune-type lora \
  --iters "$ITERS" \
  --batch-size "$BATCH_SIZE" \
  --num-layers "$NUM_LAYERS" \
  --adapter-path "$ADAPTER_DIR" \
  --save-every "$SAVE_EVERY" \
  --steps-per-eval "$STEPS_PER_EVAL" \
  --mask-prompt \
  --grad-checkpoint

echo ""
echo "Done. Adapter saved to $ADAPTER_DIR"
echo "Watch the 'Val loss' printed during training: trending down then flattening is healthy;"
echo "still falling steadily at the end means more iterations would likely help;"
echo "climbing means it's overfitting - use an earlier checkpoint from $ADAPTER_DIR instead."
