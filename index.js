var writeFiles = require('./writeFiles');
var suitesGenerator = require('./generate/suites');
var componentGenerator = require('./generate/component');
var envsGenerator = require('./generate/envs');
var fs = require('fs-extra');

function generate() {

  // Initial in-memory file structure
  var fileStructure = [
    { path: ["suites"] },
    { path: ["common", "driver.js"], content: fs.readFileSync(`${__dirname}/static/driver.js`, 'utf8') },
    { path: ["common", "actiondata.js"], content: fs.readFileSync(`${__dirname}/static/actiondata.js`, 'utf8') },
    { path: ["common", "variables.js"], content: fs.readFileSync(`${__dirname}/static/variables.js`, 'utf8') },
    { path: ["common", "hooks.js"], content: fs.readFileSync(`${__dirname}/static/hooks.js`, 'utf8') }
  ];

  // Hang the various test suites upon the in-memory file structure.
  envsGenerator.generateJson(this, fileStructure, ["common"]);

  // Hang the various test suites upon the in-memory file structure.
  suitesGenerator.generateFlat(this, fileStructure, ["suites"]);

  // Hang the various test suites upon the in-memory file structure.
  componentGenerator.generateFile(this, fileStructure, ["common"]);

  // Write to disc
  writeFiles(fileStructure, this);

  this.onComplete();

};

module.exports = {
  generate: generate,
  styles: ["flat"]
};
