/* *************************************
  Generate Tests Action block.
**************************************** */

var _ = require('lodash');
var arrangeActionsIntoBlocks = require('./blocks/arrange');
var generateLineArrayFromBlock = require('./blocks/actions').generateLineArrayFromBlock;

module.exports = function(test, testData, indent) {

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
