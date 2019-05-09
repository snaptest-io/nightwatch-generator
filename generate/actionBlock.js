/* *************************************
  Generate Action Block
**************************************** */

var _ = require('lodash');
var util = require('../utils/util');

module.exports = function(test, meta, indent) {

  var actionBlock = "";
  var blocks = [];
  var indent = 3;

  test.actions.forEach((action) => action.indent = action.indent ? action.indent : 0);

  test.actions.forEach((action, idx) => {

    var lastAction = test.actions[idx - 1] || {};
    var nextAction = test.actions[idx + 1] || {};

    var newLine = generateLine({ action, lastAction, nextAction }, blocks, indent, meta);
    if (newLine) actionBlock += newLine;
    // if (idx < test.actions.length - 1 && newLine) actionBlock += "\n";
  });

  return actionBlock;

};

function generateLine(line, blocks, indent, meta) {

  var exclude = ["URL_CHANGE_INDICATOR", "PUSHSTATE"];
  var INDENT = 2;
  var action = line.action;

  var strings = [];

  if (actions[action.type]) {

    var description = prefixVars(action.description || util.buildActionDescription(action));
    var selector = prefixVars(action.selector || "");
    var value = _.isString(action.value) ? prefixVars(action.value) : action.value;

    var blockStrings = renderBlockWrapper(line, blocks, indent);
    strings = strings.concat(blockStrings);

    var renderedString = actions[action.type].render(action, selector, value, description, line, blocks, indent, meta);

    if (typeof renderedString === 'string') {
      strings.push([0, renderedString]);
    } else {
      strings = strings.concat(renderedString);
    }

  }
  else if (exclude.indexOf(action.type) === -1)
    strings = [0, `// No support for: Action ${action.type}`];

  strings = strings.map((thisString) => {

    return [
      thisString[0],
      thisString[1].trim().replace(/^ +/gm, '').replace(/(\r\n|\n|\r)/gm," ")
    ];

  });

  var finalString = "";

  strings.forEach((thisString) => {
    if (line.skipIndent) {
      finalString += thisString[1];
    } else {
      var finalIndentation = " ".repeat((indent + thisString[0] + (blocks.length * 2)) * INDENT);
      finalString += finalIndentation + thisString[1];
      finalString += "\n"
    }
  });

  return finalString

}

var actions = {
  "FULL_PAGELOAD": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .url(\`${value}\`, ${action.width}, ${action.height}, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "PAUSE": {
    render: (action, selector, value, description, line ) => `
      .pause(${value})
    `
  },
  "INPUT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .changeInput(\`${selector}\`, \`${action.selectorType}\`, \`${value}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "EL_PRESENT_ASSERT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .elementPresent(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "EL_NOT_PRESENT_ASSERT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .elementNotPresent(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "TEXT_ASSERT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => {
      if (action.regex) {
        return `
          .elTextIs(\`${selector}\`, \`${action.selectorType}\`, new RegExp(\`${value}\`, "g"), \`${description}\`${buildEnding(line, blocks)}`;
      } else {
        return`
          .elTextIs(\`${selector}\`, \`${action.selectorType}\`, \`${value}\`, \`${description}\`${buildEnding(line, blocks)}`;
      }
    }
  },
  "VALUE_ASSERT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => {
      if (action.regex) {
        return `
        .inputValueAssert(\`${selector}\`, \`${action.selectorType}\`, new RegExp(\`${value}\`, "g"), \`${description}\`${buildEnding(line, blocks)}`;
      } else {
        return  `
        .inputValueAssert(\`${selector}\`, \`${action.selectorType}\`, \`${value}\`, \`${description}\`${buildEnding(line, blocks)}`;
      }
    }
  },
  "PATH_ASSERT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => {
      if (action.regex) {
        return `
        .pathIs(new RegExp(\`${value}\`, "g"), \`${description}\`${buildEnding(line, blocks)}`;
      } else {
        return `
        .pathIs(\`${action.value}\`, \`${description}\`${buildEnding(line, blocks)}`;
      }
    }
  },
  "STYLE_ASSERT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .elStyleIs(\`${selector}\`, \`${action.selectorType}\`, \`${prefixVars(action.style)}\`, \`${value}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "MOUSEDOWN": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .click(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "MOUSEOVER": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .moveToElement(\`${selector}\`, \`${action.selectorType}\`, 1, 1, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "SUBMIT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .formSubmit(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "CLEAR_COOKIES": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .deleteCookies()
    `
  },
  "CLEAR_CACHES": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .clearCaches(${action.localstorage}, ${action.sessionstorage}, \`${description}\`)
    `
  },
  "FOCUS": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .focusOnEl(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "BLUR": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .blurOffEl(\`${selector}\`, \`${action.selectorType}\`, \`${description}\`${buildEnding(line, blocks)}
    `
  },
  "EXECUTE_SCRIPT": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .executeScript("${description}", \`${prefixVars(action.script)}\`)
    `
  },
  "REFRESH": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .refresh(\`${description}\`)
    `
  },
  "BACK": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .back(\`${description}\`)
    `
  },
  "FORWARD": {
    render: (action, selector, value, description, line, blocks, indent, meta) => `
      .forward(\`${description}\`)
    `
  },
  "IF": {
    render: (action, selector, value, description, line, blocks, indent, meta) => {

      var lineString = "browser.if" + generateLine({
        action: action.value,
        lastAction: {},
        nextAction: {},
        block: action.type,
        skipIndent: true
      }, blocks, indent, meta) + ",";

      return [
        [-1, lineString],
        [-1, "browser.then((b) => { b"]
      ]

    }
  },
  "ELSEIF": {
    render: (action, selector, value, description, line, blocks, indent, meta) => {

      var lineString = "browser.elseif" + generateLine({
        action: action.value,
        lastAction: {},
        nextAction: {},
        block: action.type,
        skipIndent: true
      }, blocks, indent, meta) + ",";

      return [
        [-1, "}),"],
        [-1, lineString],
        [-1, "browser.then((b) => { b"]
      ]

    }
  },
  "ELSE": {
    render: (action, selector, value, description, line, blocks, indent, meta) => {
      return [
        [-1, "}),"],
        [-1, "browser.else((b) => { b"]
      ]
    }
  },
  // "KEYDOWN": {
  //   render: (action, selector, value, description, line, blocks, indent, meta) => `
  //     KeyDown(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // },
  // "DOUBLECLICK": {
  //   render: (action, selector, value, description, line, blocks, indent, meta) => `
  //     DoubleClick(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildValueString(action.selectorType)}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // },
  // "DIALOG": {
  //   render: (action, selector, value, description, line, blocks, indent, meta) => `
  //     SetDialogResponses(${buildBooleanString(action.alert)}, ${action.confirm ? `"accept"` : `"reject"`}, ${action.prompt ? `"${action.promptResponse}"` : "null"}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // },
  // "COMPONENT": {
  //   render: (action, selector, value, description, line, blocks, indent, meta) => {
  //     var component = _.find(meta.components, {id: action.componentId});
  //
  //     if (!component) return "";
  //     return `
  //      components.${component.name}(${buildComponentActionParams(action, component)});
  //     `;
  //   }
  // }
};

function prefixVars(string) {

  // convert ${xyz} to ${vars.xyz}

  var regex = new RegExp("\\$\\{(.*?)\\}", "g");

  function prefixNext(myString) {

    var info = regex.exec(myString)
    var splitString = myString.split("");

    if (info && info.index > -1) {
      splitString.splice(info.index + 2, info[1].length, "vars." + info[1]);
      var mergedString = splitString.join("");
      return prefixNext(mergedString)
    } else {
      return myString;
    }
  }

  return prefixNext(string);
}

function renderBlockWrapper(line, blocks) {

  // if the next action is something at a higher indent level:
  if (line.nextAction.indent > line.action.indent) {

    // AND it's a conditional
    if (line.action.type === "IF") {
      blocks.push(line.action.type);

      // return a flow begin statement. (block has started, so -2 is at previous level);
      return [
        [-2, ".flow("]
      ]
    }
  }

  // if we're stepping down
  if (line.lastAction.indent > line.action.indent) {

    // AND it's not a chained condition like else if and else
    if (line.action.type !== "ELSE" && line.action.type !== "ELSEIF") {
      var blockType = blocks.pop();

      if (blockType === "IF") {
        return [
          [1, "})"],
          [0, ")"]
        ];
      }
    }

  }

  return [];

}

function buildEnding(line) {

  if (line.action.timeout) {
    return ", " + line.action.timeout + ")";
  } else {
    return ", null)"
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