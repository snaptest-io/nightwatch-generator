/* *************************************
  Generate Components
    - Generates Component files and contents
**************************************** */

var ejs = require('ejs');
var fs = require('fs-extra');
var FSUtils = require('../utils/virtualFS');
var generateActionBlock = require('./actionBlock');

module.exports.generateFile = function(fileStructure, meta, rootPath) {

  fileStructure.push({path: rootPath.concat("components.js"), content: "~~~"})

  var driverString = fs.readFileSync(`${__dirname}/../templates/components.js`, 'utf8');

  var rendered = ejs.render(driverString, {
    components: meta.components.map((component) => ({
      name: component.name,
      variables: component.variables,
      // params: component.variables.map((variable) => `String ${variable.name} = "${variable.defaultValue}"`).join(", "),
      generateActionBlock: (indent, indentChar) =>  generateActionBlock(component, meta, indent, indentChar)
    }))
  });

  fileStructure.push({path: rootPath.concat("components.js"), content: rendered})

};
