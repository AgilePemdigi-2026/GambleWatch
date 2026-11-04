import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: ["cypress/e2e/**/*.feature", "cypress/e2e/**/*.cy.js"],
    async setupNodeEvents(on, config) {
      // 1. Inisialisasi Plugin Cucumber
      await addCucumberPreprocessorPlugin(on, config);

      // 2. Pasang preprocessor Esbuild
      on(
        "file:preprocessor",
        createBundler({
          plugins: [
            createEsbuildPlugin.default
              ? createEsbuildPlugin.default(config)
              : createEsbuildPlugin(config),
          ],
        })
      );

      return config;
    },
  },
});