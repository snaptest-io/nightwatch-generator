var writeFiles = require('./writeFiles');
var testGenerator = require('./generate/fileStructure');
// var generateComponents = require('./generate/componentFile');
var fs = require('fs-extra');

function generate() {

  // Initial in-memory file structure
  var fileStructure = [
    { path: ["common"], folder: true },
    { path: ["components"], folder: true },
    { path: ["tests"], folder: true },
    { path: ["common", "driver.js"], content: fs.readFileSync(`${__dirname}/static/driver.js`, 'utf8') },
    { path: ["common", "variables.js"], content: fs.readFileSync(`${__dirname}/static/variables.js`, 'utf8') },
    { path: ["components", "components.js"], content: " " }
  ];

  // Hang the various test suites upon the in-memory file structure.
  testGenerator.generateFlat(this, fileStructure, ["tests"]);

  // Hang the various test suites upon the in-memory file structure.
  // generateComponents(fileStructure, this);

  // Write to disc
  writeFiles(fileStructure, this);

  this.onComplete();

};

module.exports = {
  generate: generate,
  styles: ["flat"]
};
