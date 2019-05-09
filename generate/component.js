/* *************************************
  Generate Components
    - Generates Component files and contents
**************************************** */

var ejs = require('ejs');
var fs = require('fs-extra');
var FSUtils = require('../utils/virtualFS');
var generateActionBlock = require('./actionBlock');

module.exports = function(fileStructure, meta) {

  var componentsFolder = FSUtils.fsFindByPath(fileStructure, ["components"]);

  var driverString = fs.readFileSync(`${__dirname}/../templates/${meta.style}/SnapComponents.cs`, 'utf8');

  var rendered = ejs.render(driverString, {
    components: meta.components.map((component) => ({
      name: component.name,
      params: component.variables.map((variable) => `String ${variable.name} = "${variable.defaultValue}"`).join(", "),
      generateActionBlock: (indent, indentChar) =>  generateActionBlock(component, meta, indent, indentChar)
    }))
  });

  fileStructure.push({
    path: componentsFolder.path.concat(["SnapComponents.cs"]),
    file: rendered
  });

};
