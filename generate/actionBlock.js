/* *************************************
  Generate Action Block
**************************************** */

var _ = require('lodash');

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

    var selector = prepForArgString(action.selector || "");
    var value = _.isString(action.value) ? prepForArgString(action.value) : action.value;

    var skipAction = shouldSkip(line, blocks);
    var preActionStrings = renderPreActionStrings(line, blocks);
    var postActionStrings = renderPostActionStrings(line, blocks);

    if (!skipAction) {
      strings = preActionStrings;

      var renderedString = actions[action.type].render(action, selector, value, line, blocks, indent, meta);

      if (typeof renderedString === 'string') {
        strings.push([0, renderedString]);
      } else {
        strings = strings.concat(renderedString);
      }

      strings = strings.concat(postActionStrings);
    }

  }
  else if (exclude.indexOf(action.type) === -1)
    strings = [[0, `// No support for: Action ${action.type}`]];

  strings = strings.map((thisString) => ([
    thisString[0],
    thisString[1].trim().replace(/^ +/gm, '').replace(/(\r\n|\n|\r)/gm," ")
  ]));

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
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.loadPage(${buildActionParams(action, { url: value, width: `${action.width}`, height: `${action.width}`})})`
  },
  "PAUSE": {
    render: (action, selector, value, line ) =>
      `.pause(${buildActionParams(action, { value })})`
  },
  "INPUT": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.changeInput(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
  },
  "EL_PRESENT_ASSERT": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.elementPresent(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "EL_NOT_PRESENT_ASSERT": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.elementNotPresent(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "TEXT_ASSERT": {
    render: (action, selector, value, line, blocks, indent, meta) => {
      if (action.regex) {
        return `.elTextIs(${buildActionParams(action, {value, selector, selectorType: action.selectorType, regex: true})})`;
      } else {
        return `.elTextIs(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
      }
    }
  },
  "VALUE_ASSERT": {
    render: (action, selector, value, line, blocks, indent, meta) => {
      if (action.regex) {
        return `.inputValueAssert(${buildActionParams(action, {value, selector, selectorType: action.selectorType, regex: true})})`
      } else {
        return `.inputValueAssert(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
      }
    }
  },
  "PATH_ASSERT": {
    render: (action, selector, value, line, blocks, indent, meta) => {
      if (action.regex) {
        return `.pathIs(${buildActionParams(action, {value, regex: true})})`
      } else {
        return `.pathIs(${buildActionParams(action, {value})})`
      }
    }
  },
  "STYLE_ASSERT": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.elStyleIs(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
  },
  "MOUSEDOWN": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.click(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "SUBMIT": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.formSubmit(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "CLEAR_COOKIES": {
    render: (action, selector, value, line, blocks, indent, meta) => `.deleteCookies()`
  },
  "CLEAR_CACHES": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.clearCaches(${buildActionParams(action, {localstorage: action.localstorage, sessionstorage: action.sessionstorage })})`
  },
  "FOCUS": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.focusOnEl(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "BLUR": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.blurOffEl(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "EXECUTE_SCRIPT": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.executeScript(${buildActionParams(action, {value: `${prepForArgString(action.script)}`})})`
  },
  "REFRESH": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.refresh(${buildActionParams(action, {})})`
  },
  "BACK": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.back(${buildActionParams(action, {})})`
  },
  "FORWARD": {
    render: (action, selector, value, line, blocks, indent, meta) =>
      `.forward(${buildActionParams(action, {})})`
  },
  "IF": {
    render: (action, selector, value, line, blocks, indent, meta) => {

      var lineString = "browser.if" + generateLine({
        action: action.value,
        lastAction: {},
        nextAction: {},
        block: action.type,
        skipIndent: true,
        skipPrefix: true,
        skipPostfix: true,
      }, blocks, indent, meta) + ",";

      return [
        [-1, lineString],
        [-1, "browser.then((b) => { b"]
      ]

    }
  },
  "ELSEIF": {
    render: (action, selector, value, line, blocks, indent, meta) => {

      var lineString = "browser.elseif" + generateLine({
        action: action.value,
        lastAction: {},
        nextAction: {},
        block: action.type,
        skipIndent: true,
        skipPrefix: true,
        skipPostfix: true
      }, blocks, indent, meta) + ",";

      return [
        [-1, "}),"],
        [-1, lineString],
        [-1, "browser.then((b) => { b"]
      ]

    }
  },
  "ELSE": {
    render: (action, selector, value, line, blocks, indent, meta) => {
      return [
        [-1, "}),"],
        [-1, "browser.else((b) => { b"]
      ]
    }
  },
  "COMPONENT": {
    render: (action, selector, value, line, blocks, indent, meta) => {
      var component = _.find(meta.components, {id: action.componentId});

      if (!component) return [];
      return `
       .component("${component.name}", ${buildComponentActionParams(action, component)})
      `;
    }
  },
  "EVAL": {
    render: (action, selector, value, line, blocks, indent, meta) => {
      return `.eval(${buildActionParams(action, { value })})`
    }
  }
  // "MOUSEOVER": {
  //   render: (action, selector, value, line, blocks, indent, meta) =>
  //     `.moveToElement(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  // },
  // "KEYDOWN": {
  //   render: (action, selector, value, line, blocks, indent, meta) => `
  //     KeyDown(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // },
  // "DOUBLECLICK": {
  //   render: (action, selector, value, line, blocks, indent, meta) => `
  //     DoubleClick(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildValueString(action.selectorType)}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // },
  // "DIALOG": {
  //   render: (action, selector, value, line, blocks, indent, meta) => `
  //     SetDialogResponses(${buildBooleanString(action.alert)}, ${action.confirm ? `"accept"` : `"reject"`}, ${action.prompt ? `"${action.promptResponse}"` : "null"}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // },
};

function prepForArgString(string) {
  // return string;
  return string.replace(new RegExp("\\$", 'g'), "\\$").replace(new RegExp("`", 'g'), "\\`")
}

function renderPostActionStrings(line, blocks) {

  if (line.skipPostfix) {
    return [];
  }

  if (_.isEmpty(line.nextAction) && line.action.indent > 0) {

    var closingEndings = [];

    for (var i = 0; i < blocks.length; i++) {
      closingEndings.push([((i + 1) * -1) - 0, "})"]);
      closingEndings.push([((i + 1) * -1) - 1, ")"]);
    }

    return closingEndings;

  }

  return [];
}

function renderPreActionStrings(line, blocks) {

  if (line.skipPrefix) return [];

  // if we're stepping up
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

function shouldSkip(line, blocks) {
  return false;
}

function buildActionParams(action, keyValues) {

  var resultObject = Object.assign({}, {
    ...!!action.description && {description: prepForArgString(action.description)},
    ...!!action.timeout && {timeout: action.timeout},
    ...!!action.continueOnFail && {optional: action.continueOnFail}
  }, keyValues);

  var result = [];

  Object.keys(resultObject)
    .sort((a, b) => {
      if (["description", "timeout", "optional"].indexOf(a) !== -1) return 1;
    })
    .forEach((key) => {

      var value =
        typeof resultObject[key] === "string" ? `\`${resultObject[key]}\`` :
        typeof resultObject[key] === "number" ? `${resultObject[key].toString()}` :
          resultObject[key];

      result.push(`${key}: ${value}`)

    });

  return `{${result.join(", ")}}`;

}

function buildComponentActionParams(action, component) {

  var nameMap = component.variables.reduce((last, variable) => {
    last[variable.id] = variable.name;
    return last;
  }, {});

  var result = [];

  action.variables.forEach((instanceVar) => {
    if (nameMap[instanceVar.id]) {
      result.push(`${nameMap[instanceVar.id]}: "${instanceVar.value}"`)
    }
  });

  return `{${result.join(", ")}}`;

}