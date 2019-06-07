/* *************************************
  Generate Tests Action block.
**************************************** */
var _ = require('lodash');
var arrangeActionsIntoBlocks = require('./blocks/arrange');
var generateLineArrayFromBlock = require('./blocks/actions').generateLineArrayFromBlock;
var actions = require('./blocks/actions').actions;
var ActionsByConstant = require('../static/actiondata').ActionsByConstant;

module.exports = function(test, testData, indent) {

  test.actions.forEach((action) => {

    var ignoredWarnings = ["PUSHSTATE", "POPSTATE"];

    if (!actions[action.type] && ignoredWarnings.indexOf(action.type) === -1) {
      console.warn(`WARNING: The "${ActionsByConstant[action.type] ? ActionsByConstant[action.type].name : action.type}" action in test "${test.name}" is not implemented and will be skipped.`);
    }

  });

  var rootBlock = arrangeActionsIntoBlocks(test.actions);
  var lineArray = generateLineArrayFromBlock(rootBlock, testData, indent || 3);
  var renderedString = generateStringFromLineArray(lineArray);

  return renderedString;

};

function generateStringFromLineArray(lineArray) {

  var INDENT_CHAR = " ";
  var INDENT_AMOUNT = 2;

  var finalString = "";

  lineArray.forEach((line) => {
    var finalIndentation = INDENT_CHAR.repeat((line[0] || 1) * INDENT_AMOUNT);
    finalString += finalIndentation + line[1];
    finalString += "\n"
  });

  return finalString

}
