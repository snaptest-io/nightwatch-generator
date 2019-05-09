
/* *************************************
  Generate Files
    - Takes the file structure and files and makes real files/folders on the FS
**************************************** */

var Path = require('path');
var mkdirp = require("mkdirp");
var fs = require('fs-extra');

module.exports = function(fileStructure, meta) {

  // Generate folders
  fileStructure.filter((entity) => !entity.content).forEach((folderEntity) => {
    var entityFolderPath = folderEntity.path.join("/");
    mkdirp.sync(Path.normalize(meta.topDirPath + "/" + entityFolderPath));
  });

  // Generate files (mkdirp'ing folders in case they don't exist)
  fileStructure.filter((entity) => entity.content).forEach((entity) => {

    var entityFolderPath = entity.path.slice(0, entity.path.length - 1).join("/");
    var entityFilePath = entity.path.join("/");

    mkdirp.sync(Path.normalize(meta.topDirPath + "/" + entityFolderPath));
    fs.writeFileSync(Path.normalize(meta.topDirPath + "/" + entityFilePath), entity.content);

  });

};