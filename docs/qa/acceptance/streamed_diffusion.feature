#╔════════════════════════════════════════════════════╗
#║  █  STREAMED DIFFUSION (BDD)  █░░░░░░░░░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ Word-by-word streamed corrections behind caret
# WHY  ▸ Make the trailing process visible and predictable
# HOW  ▸ Active region (3–8 words), caret-safe edits, pause catch-up
# IDs  ▸ SCEN-DIFFUSION-001 | PRIN: PRIN-LOGIC-10, PRIN-HUMAN-01 | REQ: REQ-STREAMED-DIFFUSION, REQ-VALIDATION-BAND

Feature: Streamed diffusion (REQ-STREAMED-DIFFUSION, REQ-VALIDATION-BAND)
  Scenario: Frontier advances during typing
    Given the user types "Mindtyper is not a tol |"
    When streaming diffusion runs
    Then the active region spans 3 to 8 words behind the caret
    And the word at the caret is never edited
    And applied fixes occur word-by-word inside the band

  Scenario: Catch up on pause
    Given the user stops typing
    When SHORT_PAUSE_MS elapses
    Then diffusion catches up until the band reaches the caret
    And the band then contracts until typing resumes

  Scenario: Reduced motion compliance
    Given the system preference prefers-reduced-motion is enabled
    When the active region renders
    Then no shimmer animation is shown
    And a gentle static band or fade is used instead


