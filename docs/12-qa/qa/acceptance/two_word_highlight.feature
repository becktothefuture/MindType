#╔════════════════════════════════════════════════════╗
#║  █  TWO WORD HIGHLIGHT (BDD)  █░░░░░░░░░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ Briefly highlight two words behind caret
# WHY  ▸ Awareness without distraction (REQ-A11Y-MOTION)
# HOW  ▸ UI respects prefers-reduced-motion
# IDs  ▸ SCEN-HILITE-001 | PRIN: PRIN-HUMAN-02, PRIN-HUMAN-03 | REQ: REQ-A11Y-MOTION

Feature: Two-word highlight (REQ-A11Y-MOTION)
  Scenario: Highlight after short pause
    Given the user typed "The quick brown |"
    And a short pause occurs
    When the highlighter renders
    Then the last two words are highlighted briefly
    And motion respects reduced-motion preference

  Scenario: Streaming active region while typing
    Given the user types "Mindtyper is a |"
    When streaming diffusion runs behind the caret
    Then a subtle active region is visible from two words behind up to the caret
    And corrections apply word-by-word within that active region
    And motion respects reduced-motion preference


