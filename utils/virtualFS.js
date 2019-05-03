var _ = require("lodash");

function findNodeByPath(fileStructure, pathArray) {

  for (var i = 0; i < fileStructure.length; i++) {
    if (pathArray.join("/") === fileStructure[i].path.join("/")) return fileStructure[i];
  }

  return null;

};

module.exports = {
  findNodeByPath: findNodeByPath
};