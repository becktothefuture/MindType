#╔════════════════════════════════════════════════════╗
#║  █  CARET SAFETY (BDD)  █░░░░░░░░░░░░░░░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ Prevent edits at/after the CARET
# WHY  ▸ Trust and predictability (REQ-IME-CARETSAFE)
# HOW  ▸ Engine rejects diffs crossing caret
# IDs  ▸ SCEN-CARETS-001 | PRIN: PRIN-SAFETY-04 | ADR: ADR-0002 | REQ: REQ-IME-CARETSAFE

Feature: Caret-safe diffs (REQ-IME-CARETSAFE)
  Scenario: No edits when caret mid-word
    Given the text "hel|lo" with caret at position 3
    When the noise correction runs
    Then no edit is proposed


