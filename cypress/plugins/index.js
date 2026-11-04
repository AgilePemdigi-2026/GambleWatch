const createBundler = require("@bahmutov/cypress-esbuild-preprocessor");
const cucumber = require("@badeball/cypress-cucumber-preprocessor");
const createEsbuildPlugin = require("@badeball/cypress-cucumber-preprocessor/esbuild");

module.exports = async (on, config) => {
  // Ambil addCucumberPlugin secara aman dari properti modul atau default export
  const addCucumberPlugin =
    cucumber.addCucumberPlugin ||
    (cucumber.default && cucumber.default.addCucumberPlugin) ||
    cucumber.default ||
    cucumber;

  // Ambil createEsbuildPlugin secara aman
  const esbuildPlugin =
    createEsbuildPlugin.createEsbuildPlugin ||
    (createEsbuildPlugin.default && createEsbuildPlugin.default.createEsbuildPlugin) ||
    createEsbuildPlugin.default ||
    createEsbuildPlugin;

  await addCucumberPlugin(on, config);

  on(
    "file:preprocessor",
    createBundler({
      plugins: [esbuildPlugin(config)],
    })
  );

  return config;
};