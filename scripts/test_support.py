"""Valid model-output fixtures; individual tests override the behavior under test."""


def passing_audit(case_id, criteria=()):
    return {
        "id": case_id, "triggered": [],
        "requirements_review": {"verdict": "met", "reason": "Fixture contracts and delivered files checked."},
        "acceptance_results": [
            {"criterion": criterion, "verdict": "met", "evidence": "Located fixture definition and executed check."}
            for criterion in criteria
        ],
        "routing_review": {"verdict": "justified", "reason": "Task and consumed sections match."},
    }
