var writeFiles = require('./writeFiles');
var suiteGenerator = require('./generate/suites');
var componentGenerator = require('./generate/component');
var fs = require('fs-extra');

function generate() {

  var envs = this.envs.map((env) => ({
    name: env.name,
    id: env.id,
    variables: env.variables.map((variable) => ({
      name: variable.name,
      type: variable.type,
      defaultValue: variable.defaultValue,
    }))
  }));

  // Initial in-memory file structure
  var fileStructure = [
    { path: ["suites"] },
    { path: ["common", "environments.json"], content: JSON.stringify(envs, null, 2) },
    { path: ["common", "driver.js"], content: fs.readFileSync(`${__dirname}/static/driver.js`, 'utf8') },
    { path: ["common", "variables.js"], content: fs.readFileSync(`${__dirname}/static/variables.js`, 'utf8') },
    // { path: ["components", "components.js"], content: " " }
  ];

  // Hang the various test suites upon the in-memory file structure.
  suiteGenerator.generateFlat(this, fileStructure, ["suites"]);

  // Hang the various test suites upon the in-memory file structure.
  componentGenerator.generateFile(fileStructure, this, ["common"]);

  // Write to disc
  writeFiles(fileStructure, this);

  this.onComplete();

};

module.exports = {
  generate: generate,
  styles: ["flat"]
};
