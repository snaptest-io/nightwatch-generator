module.exports.generateJsonFile = function(testData, fileStructure, rootPath) {

  if (!testData.runs) return;

  fileStructure.push(
    { path: rootPath.concat(["runs.json"]), content: JSON.stringify(testData.runs, null, 2) },
  )

};