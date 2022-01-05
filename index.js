var writeFiles = require('./writeFiles');
var suitesGenerator = require('./generate/suites');
var componentGenerator = require('./generate/component');
var envsGenerator = require('./generate/envs');
var runsGenerator = require('./generate/runs');
var suiteMetaGenerator = require('./generate/suiteMeta');
var settingsGenerator = require('./generate/settings');
var fs = require('fs-extra');
var VERSION = require('./package.json').version;

function generate() {

  console.log(`nightwatch-generator@${VERSION}`);

  // Initial in-memory file structure
  var fileStructure = [
    { path: ["suites"] },
    { path: ["common", "driver.js"], content: fs.readFileSync(`${__dirname}/static/driver.js`, 'utf8') },
    { path: ["common", "actiondata.js"], content: fs.readFileSync(`${__dirname}/static/actiondata.js`, 'utf8') },
    { path: ["common", "variables.js"], content: fs.readFileSync(`${__dirname}/static/variables.js`, 'utf8') },
    { path: ["common", "resulthooks.js"], content: fs.readFileSync(`${__dirname}/static/resulthooks.js`, 'utf8') }
  ];

  suitesGenerator.generateFlat(this, fileStructure, ["suites"]);
  componentGenerator.generateFile(this, fileStructure, ["common"]);
  envsGenerator.generateJsonFile(this, fileStructure, ["common"]);
  runsGenerator.generateJsonFile(this, fileStructure, ["common"]);
  suiteMetaGenerator.generateJsonFile(this, fileStructure, ["common"]);
  settingsGenerator.generateJsonFile(this, fileStructure, ["common"]);

  // Write to disc
  writeFiles(fileStructure, this);

  this.onComplete();

};

module.exports = {
  generate: generate,
  styles: ["flat"]
};
