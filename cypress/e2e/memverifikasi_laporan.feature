Feature: Memverifikasi Laporan Masyarakat

  Scenario: Memeriksa informasi laporan
    Given I am on the "/report-follow-up-blocking-status" page
    Then I should see the "Site Information" section
    And I should see "Site URL"
    And I should see "Risk Score"
    And I should see "Classification"
    And I should see "Reported By"
    And I should see "Detection Date"

  Scenario: Memeriksa screenshot evidence
    Given I am on the "/report-follow-up-blocking-status" page
    When I review the "Screenshot Evidence" section
    Then I should see the available screenshot evidence

  Scenario: Memeriksa flagged text snippets
    Given I am on the "/report-follow-up-blocking-status" page
    When I review the "Flagged Text Snippets" section
    Then I should see the text snippets detected by the system