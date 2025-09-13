Feature: Web demo tone controls and thresholds

  # REQ-TONE-CONTROLS-UI
  # SCEN-TONE-UI-001
  Scenario: Enable Tone and set target to Professional
    Given the demo is open
    And Tone is disabled by default
    When I toggle "Tone: Enabled"
    And I select "Professional" as the tone target
    Then Context runs on pause and Tone proposals may apply behind the caret
    And settings persist on reload

  Scenario: Adjust confidence thresholds via sliders
    Given Tone is enabled
    When I lower τ_tone below 0.85
    Then Tone proposals that previously applied may hold instead
    When I raise τ_commit above 0.90
    Then fewer proposals commit immediately
    And sliders persist their values after reload

  Scenario: Toggle Braille markers for visual swaps
    Given Tone is enabled
    And the text produces a correction
    When I uncheck "Show Braille markers"
    Then the mechanical swap renders without the marker glyph
    And reduced-motion users see instant swaps
