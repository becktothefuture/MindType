#╔════════════════════════════════════════════════════╗
#║  █  CARET SAFETY (BDD)  █░░░░░░░░░░░░░░░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ Prevent edits at/after the CARET
# WHY  ▸ Trust and predictability (REQ-IME-CARETSAFE)
# HOW  ▸ Engine rejects diffs crossing caret

Feature: Caret-safe diffs (REQ-IME-CARETSAFE)
  Scenario: No edits when caret mid-word
    Given the text "hel|lo" with caret at position 3
    When the tidy sweep runs
    Then no edit is proposed


