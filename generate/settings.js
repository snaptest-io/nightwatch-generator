module.exports.generateJsonFile = function(testData, fileStructure, rootPath) {
  fileStructure.push(
    { path: rootPath.concat(["settings.json"]), content: JSON.stringify(testData.settings, null, 2) },
  )
}