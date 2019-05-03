/* *************************************
  Generate Action Block
**************************************** */

const indentString = require('indent-string');
var _ = require('lodash');
var util = require('../utils/util');

module.exports = function(test, meta, indent) {

  var actionBlock = "";

  test.actions.forEach((action, idx) => {
    var newLine = generateLine(action, meta, indent);
    if (newLine) actionBlock += newLine;
    if (idx < test.actions.length - 1 && newLine) actionBlock += "\n";
  });

  return actionBlock;

};

var actions = {
  "FULL_PAGELOAD": {
    render: (action, selector, value, description, callback, meta) => `
      .url(\`${value}\`, ${action.width}, ${action.height}, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "PAUSE": {
    render: (action, selector, value, description, callback, meta) => `
      .pause(${value})
    `
  },
  "INPUT": {
    render: (action, selector, value, description, callback, meta) => `
      .changeInput(\`${selector}\`, \`${action.selectorType}\`, \`${value}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "EL_PRESENT_ASSERT": {
    render: (action, selector, value, description, callback, meta) => `
      .elementPresent(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "EL_NOT_PRESENT_ASSERT": {
    render: (action, selector, value, description, callback, meta) => `
      .elementNotPresent(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "TEXT_ASSERT": {
    render: (action, selector, value, description, callback, meta) => {
      if (action.regex) {
        return `
          .elTextIs(\`${selector}\`, \`${action.selectorType}\`, new RegExp(\`${value}\`, "g"), \`${description}\`${buildEnding(action.timeout, callback)})`;
      } else {
        return`
          .elTextIs(\`${selector}\`, \`${action.selectorType}\`, \`${value}\`, \`${description}\`${buildEnding(action.timeout, callback)})`;
      }
    }
  },
  "VALUE_ASSERT": {
    render: (action, selector, value, description, callback, meta) => {
      if (action.regex) {
        return `
        .inputValueAssert(\`${selector}\`, \`${action.selectorType}\`, new RegExp(\`${value}\`, "g"), \`${description}\`${buildEnding(action.timeout, callback)})`;
      } else {
        return  `
        .inputValueAssert(\`${selector}\`, \`${action.selectorType}\`, \`${value}\`, \`${description}\`${buildEnding(action.timeout, callback)})`;
      }
    }
  },
  "PATH_ASSERT": {
    render: (action, selector, value, description, callback, meta) => {
      if (action.regex) {
        return `
        .pathIs(new RegExp(\`${value}\`, "g"), \`${description}\`${buildEnding(action.timeout, callback)})`;
      } else {
        return `
        .pathIs(\`${action.value}\`, \`${description}\`${buildEnding(action.timeout, callback)})`;
      }
    }
  },
  "STYLE_ASSERT": {
    render: (action, selector, value, description, callback, meta) => `
      .elStyleIs(\`${selector}\`, \`${action.selectorType}\`, \`${prefixVars(action.style)}\`, \`${value}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "MOUSEDOWN": {
    render: (action, selector, value, description, callback, meta) => `
      .click(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "MOUSEOVER": {
    render: (action, selector, value, description, callback, meta) => `
      .moveToElement(\`${selector}\`, \`${action.selectorType}\`, 1, 1, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "SUBMIT": {
    render: (action, selector, value, description, callback, meta) => `
      .formSubmit(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "CLEAR_COOKIES": {
    render: (action, selector, value, description, callback, meta) => `
      .deleteCookies()
    `
  },
  "CLEAR_CACHES": {
    render: (action, selector, value, description, callback, meta) => `
      .clearCaches(${action.localstorage}, ${action.sessionstorage}, \`${description}\`)
    `
  },
  "FOCUS": {
    render: (action, selector, value, description, callback, meta) => `
      .focusOnEl(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "BLUR": {
    render: (action, selector, value, description, callback, meta) => `
      .blurOffEl(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(action.timeout, callback)})
    `
  },
  "EXECUTE_SCRIPT": {
    render: (action, selector, value, description, callback, meta) => `
      .executeScript("${description}", \`${prefixVars(action.script)}\`)
    `
  },
  "REFRESH": {
    render: (action, selector, value, description, callback, meta) => `
      .refresh(\`${description}\`)
    `
  },
  "BACK": {
    render: (action, selector, value, description, callback, meta) => `
      .back(\`${description}\`)
    `
  },
  "FORWARD": {
    render: (action, selector, value, description, callback, meta) => `
      .forward(\`${description}\`)
    `
  },
  "IF": {
    render: (action, selector, value, description, callback, meta) => {

      // value is the conditional action;
      return generateLine(value, meta, 0, true);

    }
  }
  // "KEYDOWN": {
  //   render: (action, selector, value, description, callback, meta) => `
  //     KeyDown(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildDescription(description)}${buildEnding(action.timeout, callback)});
  //   `
  // },
  // "DOUBLECLICK": {
  //   render: (action, selector, value, description, callback, meta) => `
  //     DoubleClick(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildValueString(action.selectorType)}, ${buildDescription(description)}${buildEnding(action.timeout, callback)});
  //   `
  // },
  // "DIALOG": {
  //   render: (action, selector, value, description, callback, meta) => `
  //     SetDialogResponses(${buildBooleanString(action.alert)}, ${action.confirm ? `"accept"` : `"reject"`}, ${action.prompt ? `"${action.promptResponse}"` : "null"}, ${buildDescription(description)}${buildEnding(action.timeout, callback)});
  //   `
  // },
  // "COMPONENT": {
  //   render: (action, selector, value, description, callback, meta) => {
  //     var component = _.find(meta.components, {id: action.componentId});
  //
  //     if (!component) return "";
  //     return `
  //      components.${component.name}(${buildComponentActionParams(action, component)});
  //     `;
  //   }
  // }
};

function generateLine(action, meta, indent, callback) {

  var exclude = ["URL_CHANGE_INDICATOR", "PUSHSTATE"];

  if (actions[action.type]) {

    var description = prefixVars(action.description || util.buildActionDescription(action));
    var selector = prefixVars(action.selector || "");
    var value = _.isString(action.value) ? prefixVars(action.value) : action.value;

    var line = actions[action.type].render(action, selector, value, description, callback, meta).trim();
    line = line.replace(/^ +/gm, '');
    line = indentString(line, indent);

    return line;

  }
  else if (exclude.indexOf(action.type) === -1)
    return indentString(`// No support for: Action ${action.type}`, indent);

}

function prefixVars(string) {

  // convert ${xyz} to ${vars.xyz}

  var regex = new RegExp("\\$\\{(.*?)\\}", "g");

  function prefixNext(myString) {

    var info = regex.exec(myString)
    var splitString = myString.split("");

    if (info && info.index > -1) {
      splitString.splice(info.index + 2, info[1].length, "vars." + info[1])
      var mergedString = splitString.join("");
      return prefixNext(mergedString)
    } else {
      return myString;
    }
  }

  return prefixNext(string);
}

function buildEnding(timeout, callback) {
  if (timeout && callback) {
    return `, ${timeout}, (success) => {
      if (success) {
        browser.
          XXX
      } else {
        browser.
          XXX
      }
    }`;
  }
  else if (!timeout && callback) {
    return `, null, (success) => {
      if (success) {
        browser.
      } else {
        browser.
      }
    }`;
  }
  else if (timeout && !callback) {
    return `, ${timeout}`;
  } else {
    return '';
  }
}

function buildComponentActionParams(action, component) {

  var params = [];

  component.variables.forEach((variable, idx) => {

    var variableInAction = _.find(action.variables, {id: variable.id});

    if (variableInAction) {
      params.push(`$"${variableInAction.value}"`);
    } else {
      params.push(`$"${variable.defaultValue}"`);
    }

  });

  return params.join(", ");

}