#╔════════════════════════════════════════════════════╗
#║  █  TWO WORD HIGHLIGHT (BDD)  █░░░░░░░░░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ Briefly highlight two words behind caret
# WHY  ▸ Awareness without distraction (REQ-A11Y-MOTION)
# HOW  ▸ UI respects prefers-reduced-motion

Feature: Two-word highlight (REQ-A11Y-MOTION)
  Scenario: Highlight after short pause
    Given the user typed "The quick brown |"
    And a short pause occurs
    When the highlighter renders
    Then the last two words are highlighted briefly
    And motion respects reduced-motion preference


