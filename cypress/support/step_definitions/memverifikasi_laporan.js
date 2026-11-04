import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// Given Step
Given('I am on the {string} page', (pageUrl) => {
  cy.visit(pageUrl, {
    // Beritahu Cypress untuk melanjutkan tes segera setelah dom content dimuat
    failOnStatusCode: false,
    timeout: 30000,
  });
});

// Then & When Steps - Section & Heading Checks
Then('I should see the {string} section', (sectionTitle) => {
  if (sectionTitle === 'Site Information') {
    cy.contains('INFORMASI SITUS & IDENTITAS TARGET', { matchCase: false }).should('be.visible');
  } else if (sectionTitle === 'Evidence') {
    cy.contains('BUKTI & POTONGAN TEKS TEMUAN', { matchCase: false }).should('be.visible');
  } else {
    cy.contains(sectionTitle, { matchCase: false }).should('be.visible');
  }
});

When('I review the {string} section', (sectionTitle) => {
  if (sectionTitle === 'Screenshot Evidence' || sectionTitle === 'Flagged Text Snippets') {
    cy.contains('BUKTI & POTONGAN TEKS TEMUAN', { matchCase: false }).should('be.visible');
  } else {
    cy.contains(sectionTitle, { matchCase: false }).should('be.visible');
  }
});

Then('I should see {string}', (textToFind) => {
  const uiMapping = {
    'Site URL': 'DOMAIN TERINDIKASI',
    'Risk Score': 'Skor Probabilitas',
    'Classification': 'RISIKO TINGGI',
    'Reported By': 'PELAPOR AWAL',
    'Detection Date': 'WAKTU DETEKSI',
    'Screenshot Evidence': 'BUKTI & POTONGAN TEKS TEMUAN',
    'Flagged Text Snippets': 'Artefak visual'
  };

  const expectedText = uiMapping[textToFind] || textToFind;
  cy.contains(expectedText, { matchCase: false }).should('be.visible');
});

Then('I should see the available screenshot evidence', () => {
  cy.contains('BUKTI & POTONGAN TEKS TEMUAN', { matchCase: false }).should('be.visible');
});

Then('I should see the text snippets detected by the system', () => {
  cy.contains('Artefak visual dan ekstraksi frasa kata kunci', { matchCase: false }).should('be.visible');
});