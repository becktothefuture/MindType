#╔════════════════════════════════════════════════════╗
#║  █  BACKFILL NAME CONSISTENCY (BDD)  █░░░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ Ensure consistent proper-name spelling
# WHY  ▸ Cohesion during later passes
# HOW  ▸ BackfillConsistency proposes stable-zone edits
# IDs  ▸ SCEN-BACKFILL-001 | PRIN: PRIN-LOGIC-08 | FUTURE REQ: Backfill consistency

Feature: Backfill name consistency (REF: engines/backfillConsistency)
  Scenario: Consistent person name within paragraph
    Given a paragraph with mixed "Katarina" and "Katerina"
    When a backfill pass runs in the stable zone
    Then consistent spelling is proposed behind the caret only


