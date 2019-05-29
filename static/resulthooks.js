var suiteMeta = require('./suiteMeta.json');

var results = suiteMeta.tests.map((test) => {
  return {
    testId: test.id,
    results: [],
    passed: false,
    completed: false
  }
});

var userHooks = {};

try {
  userHooks = require('../../snaphooks.js')
} catch(e) {}

// here we need to run some logic before a hook is run, to check if after should be run.

module.exports.afterEachTest = (browser, done) => {

  var result = results.find((result) => result.testId === browser.snapTestId);

  result.completed = true;
  result.passed = browser.snapResults.filter((result) => !result.success).length === 0;
  result.results = browser.snapResults;

  if (typeof userHooks.afterEachTest === "function") {
    return userHooks.afterEachTest(browser, done, result);
  } else {
    return done();
  }

};

module.exports.afterEachSuite = (browser, done) => {
  if (typeof userHooks.afterEachSuite === "function") {
    userHooks.afterEachSuite(browser, () => {
      var completed = results.filter((result) => !result.completed).length === 0;
      if (completed) afterAll(browser, done);
      else done();
    });
  } else {
    var finished = true;
    if (finished) afterAll(browser, done);
    else done();
  }
};

const afterAll = (browser, done) => {

  var overallResults = {
    actions_failed: 0,
    actions_passed: 0,
    duration: 0,
    tests: results.map((result) => result.testId),
    tests_num: results.length,
    tests_passed_num: results.filter((result) => result.passed).length,
    tests_passed: results.filter((result) => result.passed).map((result) => result.testId),
    content: {
      tests: results,
      csvs: []
    }
  };

  if (typeof userHooks.afterAll === "function") {
    return userHooks.afterAll(browser, done, overallResults);
  } else {
    return done();
  }
};

