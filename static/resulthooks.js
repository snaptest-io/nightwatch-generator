var suiteMeta = require('./suiteMeta.json');
var timeStart = Date.now();

var testResults = suiteMeta.tests.map((test) => {
  return {
    testId: test.id,
    results: [],
    passed: false,
    completed: false
  }
});

var csvs = {};

var userHooks = {};

try {
  userHooks = require('../../snaphooks.js')
} catch(e) {}

// here we need to run some logic before a hook is run, to check if after should be run.

module.exports.afterEachTest = (browser, done) => {

  var testResult = testResults.find((result) => result.testId === browser.snapTestId);

  testResult.completed = true;
  testResult.passed = browser.snapResults.filter((result) => !result.success).length === 0;
  testResult.results = browser.snapResults;
  testResult.duration = Date.now() - browser.snapStartTime;

  csvs = Object.assign({}, csvs, browser.snapCsvs);

  if (typeof userHooks.afterEachTest === "function") {
    return userHooks.afterEachTest(browser, done, testResult);
  } else {
    return done();
  }

};

module.exports.afterEachSuite = (browser, done) => {
  if (typeof userHooks.afterEachSuite === "function") {
    userHooks.afterEachSuite(browser, () => {
      var completed = testResults.filter((result) => !result.completed).length === 0;
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
    time_start: timeStart,
    duration: testResults.reduce((acc, test) => acc + test.duration, 0),
    tests: testResults.map((result) => result.testId),
    tests_num: testResults.length,
    tests_passed_num: testResults.filter((result) => result.passed).length,
    tests_passed: testResults.filter((result) => result.passed).map((result) => result.testId),
    content: {
      tests: testResults,
      csvs: csvs
    }
  };

  if (typeof userHooks.afterAll === "function") {
    return userHooks.afterAll(browser, done, overallResults);
  } else {
    return done();
  }
};

