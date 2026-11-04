// Mencegah Cypress gagal saat aplikasi Next.js melempar uncaught exception tidak fatal
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});