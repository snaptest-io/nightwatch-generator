/* ********************************
  Number of components: <%= components.length %>
********************************* */
var Variables = require('./variables.js');

module.exports.bindComponents = function(browser) {

  browser.components = {};
  browser.compVarStack = [];<% components.forEach((component, idx) => { %>

  browser.components["<%= component.name %>"] = {
    defaults: {<% component.variables.forEach((variable, idx) => { %>
      "<%=variable.name%>": `<%-variable.defaultValue%>`<%= (idx < component.variables.length - 1? "," : "")%><% }); %>
    },
    actions: () => {
      return browser
<%- component.generateActionBlock(4) %>        .endComponent();
    }
  }
<% }); %>

};