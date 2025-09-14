Feature: Dot-Matrix Wave Animation
  As a user typing text
  I want to see elegant visual feedback when corrections are applied
  So that I understand what has been corrected without disruption

  # SCEN-DOT-MATRIX-WAVE-001
  Scenario: Dot-matrix wave animation renders and preserves layout
    Given the dot-matrix wave demo is opened
    When the animation runs for corrections
    Then the paragraph remains same size and the overlay is visible
    And corrected text appears with the wave animation

  # SCEN-DOT-MATRIX-WAVE-002
  Scenario: Reduced motion compliance
    Given the user has prefers-reduced-motion enabled
    When corrections are applied
    Then the dot-matrix wave is replaced with a static highlight
    And no animation frames are rendered