/* ********************************
  SnapTest Variables Driver

  Roles:
    1. Takes default variables of a test and performs standard variable combining
    2. Extends variables with global config selected environment.
********************************* */

module.exports.build = (testVars, browser) => {

  var testVars = Object.keys(testVars).map((key) => ({key: key, value: testVars[key]}));

  var system = [
    {key: "random", value: parseInt(Math.random() * 10000000)},
    {key: "random1", value: parseInt(Math.random() * 10000000)},
    {key: "random2", value: parseInt(Math.random() * 10000000)},
    {key: "random3", value: parseInt(Math.random() * 10000000)}
  ];

  testVars = combineVarsWith(testVars, system);
  testVars = combineVarsWith(testVars, testVars, false);

  var computed = Object.assign({},
    spreadVariables(system),
    spreadVariables(testVars)
  );

  // Add to Nightwatch browser object for easy access within the driver.
  browser.variables = computed;

  return computed;

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

function spreadVariables (variables) {
  var variableObject = {};

  variables.forEach((variable) => {
    variableObject[variable.key] = variable.value;
  })

  return variableObject;

};