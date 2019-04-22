var util = require('./util');
var _ = require('lodash');
var varname = require('varname');

module.exports.generateActionList = function(actions, components, ActionInfo) {

  var generatedCode = "";

  actions.forEach((action, idx) => {

    var selector = action.selector;
    var selectorType = action.selectorType || "CSS";
    var description = action.description || util.buildActionDescription(action, ActionInfo);

    if (action.type === "COMPONENT") {

      var component = _.find(components, {id: action.componentId});
      var params = "";

      if (!component) return;
      else params = util.getValueParamsForComponent(action, component);

      generatedCode += `
      .components.${varname.camelback(component.name)}(${util.buildParamStringFromArray(params)})`;
    }

    if (action.type === "POPSTATE" || action.type === "BACK") {
      generatedCode += `
      .back(\`${description}\`)`;
    }

    if (action.type === "FORWARD") {
      generatedCode += `
      .forward(\`${description}\`)`;
    }

    if (action.type === "REFRESH") {
      generatedCode += `
      .refresh(\`${description}\`)`;
    }

    if (action.type === "SCREENSHOT") {
      generatedCode += `
      .saveScreenshot(\`screenshots/${action.value}\`, \`${description}\`)`;
    }

    if (action.type === "MOUSEOVER") {
      generatedCode += `
      .moveToElement(\`${selector}\`, \`${selectorType}\`, 1, 1, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "FOCUS") {
      generatedCode += `
      .focusOnEl(\`${selector}\`, \`${selectorType}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "BLUR") {
      generatedCode += `
      .blurOffEl(\`${selector}\`, \`${selectorType}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "SUBMIT") {
      generatedCode += `
      .formSubmit(\`${selector}\`, \`${selectorType}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "EXECUTE_SCRIPT") {
      generatedCode += `
      .executeScript("${description}", \`${action.script}\`)`;
    }

    if (action.type === "SCROLL_WINDOW") {
      generatedCode += `
      .scrollWindow(${action.x}, ${action.y}, \`${description}\`)`;
    }

    if (action.type === "SCROLL_ELEMENT") {
      generatedCode += `
      .scrollElement(\`${selector}\`, \`${selectorType}\`, ${action.x}, ${action.y}, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "SCROLL_WINDOW_ELEMENT") {
      generatedCode += `
      .scrollWindowToElement(\`${selector}\`, \`${selectorType}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "PAGELOAD" || action.type === "PATH_ASSERT") {

      if (action.regex) {
        generatedCode += `
        .pathIs(new RegExp(\`${action.value}\`, "g"), \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
      } else {
        generatedCode += `
        .pathIs(\`${action.value}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
      }

    }

    if (action.type === "FULL_PAGELOAD") {
      generatedCode += `
        .url(\`${action.value}\`, ${action.width}, ${action.height}, \`${description}\`)`;
    }

    if (action.type === "CHANGE_WINDOW" || action.type === "CHANGE_WINDOW_AUTO") {
      generatedCode += `
      .switchToWindow(${action.value}, \`${description}\`)`;
    }

    if (action.type === "MOUSEDOWN") {
      generatedCode += `
      .click(\`${selector}\`, \`${selectorType}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "PAUSE") {
      generatedCode += `
      .pause(${action.value})`;
    }

    if (action.type === "EL_PRESENT_ASSERT") {
      generatedCode += `
      .elementPresent(\`${selector}\`, \`${selectorType}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "EL_NOT_PRESENT_ASSERT") {
      generatedCode += `
      .elementNotPresent(\`${selector}\`, \`${selectorType}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "KEYDOWN") {
      generatedCode += `
      .sendKeys(\`${selector}\`, \`${selectorType}\`, ${util.getNWKeyValueFromCode(action.keyValue)}, \`${description}\`)`;
    }

    if (action.type === "TEXT_ASSERT") {

      if (action.regex) {
        generatedCode += `
          .elTextIs(\`${selector}\`, \`${selectorType}\`, new RegExp(\`${action.value}\`, "g"), \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
      } else {
        generatedCode += `
          .elTextIs(\`${selector}\`, \`${selectorType}\`, \`${action.value}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
      }

    }

    if (action.type === "TEXT_REGEX_ASSERT") {
      generatedCode += `
        .elTextIs(\`${selector}\`, \`${selectorType}\`, new RegExp(\`${action.value}\`, "g"), \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "STYLE_ASSERT") {
      generatedCode += `
        .elStyleIs(\`${selector}\`, \`${selectorType}\`, \`${action.style}\`, \`${action.value}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

    if (action.type === "VALUE_ASSERT") {
      if (action.regex) {
        generatedCode += `
        .inputValueAssert(\`${selector}\`, \`${selectorType}\`, new RegExp(\`${action.value}\`, "g"), \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
      } else {
        generatedCode += `
        .inputValueAssert(\`${selector}\`, \`${selectorType}\`, \`${action.value}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
      }

    }

    if (action.type === "INPUT") {
      generatedCode += `
      .changeInput(\`${selector}\`, \`${selectorType}\`, \`${action.value}\`, \`${description}\`${action.timeout ? ", " + action.timeout : ""})`;
    }

  });

  return generatedCode;

}
