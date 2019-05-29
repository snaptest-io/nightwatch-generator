module.exports.generateJsonFile = function(testData, fileStructure, rootPath) {

  var envs = testData.envs.map((env) => ({
    name: env.name,
    id: env.id,
    variables: env.variables.map((variable) => ({
      name: variable.name,
      type: variable.type,
      defaultValue: variable.defaultValue,
    }))
  }));

  fileStructure.push(
    { path: rootPath.concat(["environments.json"]), content: JSON.stringify(envs, null, 2) },
  )


}