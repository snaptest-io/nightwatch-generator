var generateActionBlock = require('./actionBlock');
var _ = require("lodash");
var ejs = require('ejs');
var fs = require('fs-extra');
var prepStrings = require('../utils/prepStrings');

module.exports = function(data) {

  var testData = data.testData;
  var suiteName = data.suiteName;
  var tests = data.tests;

  var driverString = fs.readFileSync(`${__dirname}/../templates/suite.js`, 'utf8');

  var rendered = ejs.render(driverString, {
    suiteName: suiteName,
    relPathToRoot: data.relPathToRoot,
    tests: tests.map((test) => {
      return {
        generateActionBlock: (indent, indentChar) =>  generateActionBlock(test, testData, indent, indentChar),
        variables: test.variables.map((variable) => ({...variable, defaultValue: prepStrings.prepForArgString(variable.defaultValue)})),
        name: test.name,
        id: test.id
      }
    })
  });

  return rendered;

};
