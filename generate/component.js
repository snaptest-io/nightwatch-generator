/* *************************************
  Generate Components
    - Generates Component files and contents
**************************************** */

var ejs = require('ejs');
var fs = require('fs-extra');
var _ = require('lodash');
var FSUtils = require('../utils/virtualFS');
var generateActionBlock = require('./actionBlock');

module.exports.generateFile = function(testData, fileStructure, rootPath) {

  var driverString = fs.readFileSync(`${__dirname}/../templates/components.js`, 'utf8');



  var rendered = ejs.render(driverString, {
    components: testData.components.map((component) => {

      var compName = component.name;
      var compsWithName = testData.components.filter((comp) => comp.name === component.name);

      if (compsWithName.length > 1)
        compName = compName + "-" + _.findIndex(testData.components, {id: component.id});

      return {
        name: compName,
        variables: component.variables,
        generateActionBlock: (indent, indentChar) =>  generateActionBlock(component, testData, indent, indentChar)
      }
    })
  });

  fileStructure.push({path: rootPath.concat("components.js"), content: rendered})

};
