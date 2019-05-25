/* *************************************
  Generate Components
    - Generates Component files and contents
**************************************** */

var ejs = require('ejs');
var fs = require('fs-extra');
var _ = require('lodash');
var generateActionBlock = require('./actionBlock');
var prepStrings = require('../utils/prepStrings');

module.exports.generateFile = function(testData, fileStructure, rootPath) {

  var driverString = fs.readFileSync(`${__dirname}/../templates/components.js`, 'utf8');

  var rendered = ejs.render(driverString, {
    components: testData.raw.tests.filter((test) => test.type === "component").map((component) => {

      var compName = component.name;
      var compsWithName = testData.components.filter((comp) => comp.name === component.name);

      if (compsWithName.length > 1)
        compName = compName + "-" + _.findIndex(testData.components, {id: component.id});

      return {
        name: compName,
        variables: component.variables.map((variable) => ({...variable, defaultValue: prepStrings.prepForArgString(variable.defaultValue)})),
        generateActionBlock: (indent) =>  generateActionBlock(component, testData, indent)
      }
    })
  });

  fileStructure.push({path: rootPath.concat("components.js"), content: rendered})

};
