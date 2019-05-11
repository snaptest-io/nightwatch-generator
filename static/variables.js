/* ********************************
  SnapTest Variables Driver

  Roles:
    1. Takes default variables of a test and performs standard variable combining
    2. Extends variables with global config selected environment.
********************************* */

var _ = require('lodash');
var envs = require('./environments.json');

module.exports = (browser) => {

  // var computed = {};
  var selectedEnvId = getSelectedEnvIdFromConfig(browser);

  var testVars = [];
  var envVars = selectedEnvId ? getEnvVars(selectedEnvId) : [];

  var system = [
    {key: "random", value: parseInt(Math.random() * 10000000)},
    {key: "random1", value: parseInt(Math.random() * 10000000)},
    {key: "random2", value: parseInt(Math.random() * 10000000)},
    {key: "random3", value: parseInt(Math.random() * 10000000)}
  ];

  envVars = combineVarsWith(envVars, system);
  envVars = combineVarsWith(envVars, envVars, false);

  return {
    computeTestVars: (_testVars) => {

      testVars = Object.keys(_testVars).map((key) => ({key: key, value: _testVars[key]}));
      testVars = combineVarsWith(testVars, system);
      testVars = combineVarsWith(testVars, testVars, false);

      return Object.assign({},
        spreadVariables(system),
        spreadVariables(testVars),
        spreadVariables(envVars)
      );

    },
    computeCompVars: (_instanceVars, _defaultVars) => {

      var instanceVars = Object.keys(_instanceVars).map((key) => ({key: key, value: _instanceVars[key]}));
      var defaultVars = Object.keys(_defaultVars).map((key) => ({key: key, value: _defaultVars[key]}));

      return Object.assign({},
        spreadVariables(system),
        spreadVariables(testVars),
        spreadVariables(defaultVars),
        spreadVariables(envVars),
        spreadVariables(instanceVars)
      );

    }
  }

};

function combineVarsWith(_combinee, combiner, allowDups = true) {

  var combinee = _combinee.slice(0);

  combiner.forEach((replacer) => {
    combinee.forEach((variable) => {

      if (allowDups) {
        var myRegEx = new RegExp(`\\$\\{${replacer.key}\\}`, "g");
        variable.value = variable.value.replace(myRegEx, replacer.value);
      } else if (replacer.key !== variable.key) {
        var myRegEx = new RegExp(`\\$\\{${replacer.key}\\}`, "g");
        variable.value = variable.value.replace(myRegEx, replacer.value);
      }

    });
  });

  return combinee;

};

function getSelectedEnvIdFromConfig(browser) {

  if (browser.globals.env) {
    var selectedEnv = _.find(envs, {id: browser.globals.env});

    if (selectedEnv) {
      return selectedEnv.id;
    }
    else {
      // Process.exit(1);
    }
  }

  return null;

}

function getEnvVars(envId) {

  var env = _.find(envs, {id: envId});
  var gatheredVars = {};
  const ALLOWED_DEPTH = 5;  // in case of accidentally nested...

  function searchList(variables, currentDepth) {
    if (currentDepth === ALLOWED_DEPTH) return;
    variables.forEach((variable) => {
      if (variable.type === "ENV_VAR") {
        var matchingEnv = _.find(envs, {id: variable.defaultValue});
        if (matchingEnv) {
          searchList(matchingEnv.variables, currentDepth + 1);
        }
      } else {
        gatheredVars[variable.name] = variable.defaultValue;
      }
    })
  }

  searchList(env.variables, 0);

  var varArray = [];

  for (var i in gatheredVars) {
    varArray.push({key: i, value: gatheredVars[i]})
  }

  return varArray;

};


function spreadVariables (variables) {
  var variableObject = {};

  variables.forEach((variable) => {
    variableObject[variable.key] = variable.value;
  })

  return variableObject;

};