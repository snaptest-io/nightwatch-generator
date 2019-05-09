var fs = require('fs-extra');
var ejs = require('ejs');
var sanitizeForFilename = require("sanitize-filename");

module.exports.generate = function(testData, fileStructure, envRootPath) {
  console.log("generating envs.");

  var templateString = fs.readFileSync(`${__dirname}/../templates/environment.js`, 'utf8');

  testData.envs.forEach((env) => {

    var fileName = sanitizeForFilename(env.name);

    fileStructure.push({
      path: envRootPath.concat([fileName]),
      content: ejs.render(templateString, {
        fileName: fileName,
        name: env.name,
        variables: env.variables
      })
    });

  })

};
