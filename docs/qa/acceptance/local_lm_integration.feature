#╔════════════════════════════════════════════════════╗
#║  █  LOCAL LM INTEGRATION (BDD)  █░░░░░░░░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ On-device language model corrections with graceful fallback
# WHY  ▸ Semantic/grammatical quality beyond rules while staying local
# HOW  ▸ Stream LM tokens into validation band; fallback to rules; <150MB memory

Feature: Local LM Integration (REQ-LOCAL-LM-INTEGRATION, REQ-CONTEXTUAL-CORRECTIONS)
  Scenario: LM enhances contextual corrections
    Given the user types "The cat sit on the mat and walk to the door"
    When local LM processing runs
    Then "sit" becomes "sits" and "walk" becomes "walks" for subject-verb agreement
    And corrections stream behind the caret word-by-word
    And memory usage stays under 150MB

  Scenario: Graceful fallback to rules when LM unavailable
    Given local LM fails to load or encounters error
    When user types text with simple typos like " teh "
    Then rule-based engine handles corrections
    And user experience remains seamless
    And no functionality is lost

  Scenario: LM respects caret safety constraints
    Given local LM suggests corrections
    When corrections would cross the caret position
    Then those corrections are rejected
    And only caret-safe corrections are applied
    And validation band never extends beyond caret

  Scenario: LM confidence gating
    Given local LM processes ambiguous text
    When confidence score is below threshold
    Then no correction is applied
    And system returns null gracefully
    And user text remains unchanged

  Scenario: Memory constraints enforced
    Given local LM is running
    When memory usage approaches limits
    Then model is gracefully unloaded
    And system falls back to rule-based mode
    And user is optionally notified of mode change
