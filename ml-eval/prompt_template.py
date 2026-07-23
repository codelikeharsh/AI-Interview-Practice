"""
Shared prompt shape used consistently across dataset compilation, training,
evaluation, and the demo CLI - mirrors backend/app/services/llm_evaluator.py's
production evaluation prompt so the fine-tuned model sees the same input
shape at train time and at inference time.
"""

EXPECTED_SCHEMA_HINT = """Return ONLY valid JSON in this exact format, no markdown, no text outside the JSON:
{
  "scores": {"relevance": 0, "clarity": 0, "depth": 0, "confidence": 0},
  "strengths": ["short specific point about this answer"],
  "improvements": ["short specific, actionable point about this answer"],
  "feedback": "one or two sentence honest summary"
}"""


def build_eval_prompt(question, answer, role="Software Engineer", difficulty="medium", level="intermediate"):
    return f"""You are an expert, honest technical interviewer evaluating a candidate's spoken answer in a real {role} interview. This question was asked at {difficulty} difficulty. The candidate's experience level is {level}.

Question asked:
{question}

Candidate's answer (transcribed from speech - forgive minor transcription/grammar artifacts and evaluate the substance, not the transcription quality):
{answer}

Score the answer from 0-10 on each dimension:
- relevance: does it actually answer what was asked
- clarity: is it well-structured and easy to follow
- depth: technical substance, correctness, and specificity - not just confident-sounding
- confidence: how sure and fluent the delivery reads, independent of whether the content is correct

{EXPECTED_SCHEMA_HINT}"""
