
  # SCEN-BAND-SWAP-001
  Scenario: Band-swap demo renders and preserves layout
    Given the band-swap demo is opened
    When the animation runs for a short time
    Then the paragraph remains same size and the overlay is visible
