/* ********************************
  SuiteName: <%= suiteName %>
  relPathToRoot: <%= relPathToRoot %>
  Number of tests: <%= tests.length %>
********************************* */

var Variables = require('<%= relPathToRoot %>common/variables.js');

module.exports = {
<% tests.forEach((test, idx) => { %>
  "<%= test.name %>": function (browser) {
<% if (idx === 0) { %>
    require('<%= relPathToRoot %>common/driver.js').bindDriver(browser);
    require('<%= relPathToRoot %>common/components.js').bindComponents(browser);
<% } %>
    var testVars = Variables.TestVars(browser, {<% test.variables.forEach((variable, idx) => { %>
      "<%=variable.name%>": "<%=variable.defaultValue%>"<%= (idx < test.variables.length - 1? "," : "")%><% }); %>
    });

    browser
      .using(testVars)
<%- test.generateActionBlock(6, " ") %>      .end();

  }
<% }); %>
};