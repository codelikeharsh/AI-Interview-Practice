from app.services.session_store import next_difficulty


def _eval(rel, cla, dep, con, errored=False):
    return {
        "errored": errored,
        "scores": {"relevance": rel, "clarity": cla, "depth": dep, "confidence": con},
    }


def test_bumps_up_on_strong_answer():
    assert next_difficulty("easy", _eval(9, 9, 8, 9)) == "medium"
    assert next_difficulty("medium", _eval(9, 9, 8, 9)) == "hard"


def test_stays_bounded_at_hard():
    assert next_difficulty("hard", _eval(10, 10, 10, 10)) == "hard"


def test_drops_on_weak_answer():
    assert next_difficulty("hard", _eval(1, 2, 1, 2)) == "medium"
    assert next_difficulty("medium", _eval(1, 2, 1, 2)) == "easy"


def test_stays_bounded_at_easy():
    assert next_difficulty("easy", _eval(0, 0, 0, 0)) == "easy"


def test_middling_answer_keeps_difficulty():
    assert next_difficulty("medium", _eval(5, 5, 5, 5)) == "medium"


def test_errored_evaluation_does_not_move_difficulty():
    assert next_difficulty("medium", _eval(0, 0, 0, 0, errored=True)) == "medium"
    assert next_difficulty("medium", None) == "medium"
