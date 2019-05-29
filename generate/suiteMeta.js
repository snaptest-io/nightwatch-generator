module.exports.generateJsonFile = function(testData, fileStructure, rootPath) {

  var suites = fileStructure.filter((entity) => !!entity.suiteMeta);

  var suiteMeta = {
    totalSuites: suites.length,
    totalTests: testData.tests.length,
    suites: suites.map((entity) => {
      return {
        suiteName: entity.suiteMeta.suiteName,
        fileName: entity.path[entity.path.length -1],
        totalTests: entity.suiteMeta.tests.length,
        tests: entity.suiteMeta.tests.map((test) => {
          return {
            id: test.id,
            name: test.name,
            actions: test.actions.length
          }
        })
      }
    }),
    tests: testData.tests.map((test) => ({
      id: test.id,
      name: test.name,
      actions: test.actions.length
    }))
  };

  fileStructure.push(
    { path: rootPath.concat(["suiteMeta.json"]), content: JSON.stringify(suiteMeta, null, 2) },
  )


}