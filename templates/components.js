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

  browser.component = (name, instanceVars) => {
    browser.perform(() => {

      // get defaults
      var component = browser.components[name];
      var defaultsVars = component.defaults;
      var compVars = Variables.CompVars(browser.vars, defaultsVars, instanceVars)

      // call the component, pushing the new var context onto a stack.
      browser.compVarStack.push(compVars);

      component.actions();

    })

    return browser;

  }

};