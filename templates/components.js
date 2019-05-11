/* ********************************
  Number of components: <%= components.length %>
********************************* */
var Variables = require('./variables.js');

module.exports.bindComponents = function(browser) {

  browser.components = {};
<% components.forEach((component, idx) => { %>
  browser.components["<%= component.name %>"] = function (variables, instanceVars) {

    var vars = variables.computeCompVars(instanceVars, {<% component.variables.forEach((variable, idx) => { %>
      "<%=variable.name%>": "<%=variable.defaultValue%>"<%= (idx < component.variables.length - 1? "," : "")%><% }); %>
    });

    browser
<%- component.generateActionBlock(6, " ") %>
    return browser;
  }
<% }); %>

};