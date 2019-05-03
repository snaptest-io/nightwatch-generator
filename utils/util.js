var _ = require('lodash');
var actionDefs = require('./ActionDefs');
var sanitizeForFilename = require("sanitize-filename");

module.exports.buildActionDescription = function(action) {

  var actionDescription = _.find(actionDefs, {value: action.type});
  var description;

  if (actionDescription) {
    description = actionDescription.name;
  } else {
    description = action.type;
  }

  if (_.isString(action.value)) {
    description += ` "${action.value}"`;
  }

  return description;
};

module.exports.sanitizeForMethodName = function(name) {
  return sanitizeForFilename(name).replace(/\W|_/g, "");
};