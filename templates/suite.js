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

    var variables = Variables(browser);

    var vars = variables.computeTestVars({<% test.variables.forEach((variable, idx) => { %>
      "<%=variable.name%>": "<%=variable.defaultValue%>"<%= (idx < test.variables.length - 1? "," : "")%><% }); %>
    });

    browser
<%- test.generateActionBlock(6, " ") %>      .end();

  }
<% }); %>
};