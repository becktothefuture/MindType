#╔════════════════════════════════════════════════════╗
#║  ░  V0.2 TAPESTRY ACCEPTANCE SCENARIOS  ░░░░░░░░░  ║
#╚════════════════════════════════════════════════════╝
# WHAT ▸ BDD scenarios for caret-entry rollback and band streaming
# WHY  ▸ Ensure v0.2 safety rules and UX are verifiable
# HOW  ▸ Map to Playwright + unit tests as v0.2 lands

Feature: v0.2 Tapestry band and rollback

  Scenario: Caret entry cancels and rolls back partial merges
    Given I am typing "Hello teh worl" with the caret at the end
    And an active region of 3-8 words trails the caret
    When the LM begins streaming a correction for the band
    And I move the caret into the band before streaming completes
    Then all partial LM merges are rolled back
    And no text after the caret is modified

  Scenario: Rules override LM on structural conflicts
    Given a rules engine proposes a whitespace normalization
    And the LM proposes a semantic rewrite that increases length
    When both apply within the same band
    Then the rules merge is preferred
    And the LM rewrite is discarded



