var _ = require('lodash');

const actions = {
  "FULL_PAGELOAD": {
    render: (action, selector, value, meta) =>
      `.loadPage(${buildActionParams(action, {
        url: value,
        width: `${action.width}`,
        height: `${action.width}`,
        ...action.complete && { complete: true },
        ...action.resize && { resize: true }
      })})`
  },
  "PAUSE": {
    render: (action, selector, value, line ) =>
      `.pause(${buildActionParams(action, { value })})`
  },
  "INPUT": {
    render: (action, selector, value, meta) =>
      `.changeInput(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
  },
  "EL_PRESENT_ASSERT": {
    render: (action, selector, value, meta) =>
      `.elementPresent(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "EL_NOT_PRESENT_ASSERT": {
    render: (action, selector, value, meta) =>
      `.elementNotPresent(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "TEXT_ASSERT": {
    render: (action, selector, value, meta) => {
      if (action.regex) {
        return `.elTextIs(${buildActionParams(action, {value, selector, selectorType: action.selectorType, regex: true})})`;
      } else {
        return `.elTextIs(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
      }
    }
  },
  "VALUE_ASSERT": {
    render: (action, selector, value, meta) => {
      if (action.regex) {
        return `.inputValueAssert(${buildActionParams(action, {value, selector, selectorType: action.selectorType, regex: true})})`
      } else {
        return `.inputValueAssert(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
      }
    }
  },
  "PATH_ASSERT": {
    render: (action, selector, value, meta) => {
      if (action.regex) {
        return `.pathIs(${buildActionParams(action, {value, regex: true})})`
      } else {
        return `.pathIs(${buildActionParams(action, {value})})`
      }
    }
  },
  "STYLE_ASSERT": {
    render: (action, selector, value, meta) =>
      `.elStyleIs(${buildActionParams(action, {value, selector, selectorType: action.selectorType})})`
  },
  "MOUSEDOWN": {
    render: (action, selector, value, meta) =>
      `.click(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "SUBMIT": {
    render: (action, selector, value, meta) =>
      `.formSubmit(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "CLEAR_COOKIES": {
    render: (action, selector, value, meta) => `.deleteCookies()`
  },
  "CLEAR_CACHES": {
    render: (action, selector, value, meta) =>
      `.clearCaches(${buildActionParams(action, {localstorage: action.localstorage, sessionstorage: action.sessionstorage })})`
  },
  "FOCUS": {
    render: (action, selector, value, meta) =>
      `.focusOnEl(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "BLUR": {
    render: (action, selector, value, meta) =>
      `.blurOffEl(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  },
  "EXECUTE_SCRIPT": {
    render: (action, selector, value, meta) =>
      `.executeScript(${buildActionParams(action, {value: `${prepForArgString(action.script)}`})})`
  },
  "REFRESH": {
    render: (action, selector, value, meta) =>
      `.refresh(${buildActionParams(action, {})})`
  },
  "BACK": {
    render: (action, selector, value, meta) =>
      `.back(${buildActionParams(action, {})})`
  },
  "FORWARD": {
    render: (action, selector, value, meta) =>
      `.forward(${buildActionParams(action, {})})`
  },
  "DIALOG": {
    render: (action, selector, value, meta) =>
      `.setDialogs(${buildActionParams(action, {
        alert: action.alert,
        confirm: action.confirm,
        prompt: action.prompt,
        promptResponse: action.promptResponse
      })})`
  },
  "IFBLOCK": {
    render: (action, selector, value, meta) => {
      return [
        [0, ".flow("],
        ...generateLineArrayFromBlock(action.block, meta, 1),
        [0, ")"],
      ]

    }
  },
  "IF": {
    render: (action, selector, value, meta) => {

      var conditionSelector = prepForArgString(action.condition.selector || "");
      var conditionValue = _.isString(action.condition.value) ? prepForArgString(action.condition.value) : action.condition.value;

      return [
        [0, `browser.if${actions[action.condition.type].render(action.condition, conditionSelector, conditionValue, meta)},`],
        [0, "browser.then((b) => { b"],
        ...generateLineArrayFromBlock(action.then, meta, 1),
        [0, "}),"]
      ]

    }
  },
  "ELSEIF": {
    render: (action, selector, value, meta) => {

      var conditionSelector = prepForArgString(action.condition.selector || "");
      var conditionValue = _.isString(action.condition.value) ? prepForArgString(action.condition.value) : action.condition.value;

      return [
        [0, `browser.elseif${actions[action.condition.type].render(action.condition, conditionSelector, conditionValue, meta)},`],
        [0, "browser.then((b) => { b"],
        ...generateLineArrayFromBlock(action.then, meta, 1),
        [0, "}),"]
      ]

    }
  },
  "ELSE": {
    render: (action, selector, value, meta) => {
      return [
        [0, "browser.else((b) => { b"],
        ...generateLineArrayFromBlock(action.then, meta, 1),
        [0, "})"]
      ]
    }
  },
  "COMPONENT": {
    render: (action, selector, value, meta) => {

      var component = _.find(meta.components, {id: action.componentId});

      var compName = component.name;
      var compsWithName = meta.components.filter((comp) => comp.name === component.name);

      if (compsWithName.length > 1)
        compName = compName + "-" + _.findIndex(meta.components, {id: component.id});

      if (!component) return [];
      return `.component("${compName}", ${buildComponentActionParams(action, component)})`;
    }
  },
  "EVAL": {
    render: (action, selector, value, meta) => {
      return `.eval(${buildActionParams(action, { value })})`
    }
  },
  "URL_CHANGE_INDICATOR": {
    render: (action, selector, value, meta) =>
      `// ${value}`
  },
  // "MOUSEOVER": {
  //   render: (action, selector, value, meta) =>
  //     `.moveToElement(${buildActionParams(action, {selector, selectorType: action.selectorType})})`
  // },
  // "KEYDOWN": {
  //   render: (action, selector, value, meta) => `
  //     KeyDown(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // },
  // "DOUBLECLICK": {
  //   render: (action, selector, value, meta) => `
  //     DoubleClick(${genSelector(action)}, ${buildValueString(action.selector)}, ${buildValueString(action.selectorType)}, ${buildDescription(description)}${buildEnding(line, blocks)};
  //   `
  // }
};

const generateLineArrayFromBlock = (block, testData, indent) => {

  var lineArray = [];

  block.forEach((action) => {

    var selector = prepForArgString(action.selector || "");
    var value = action.value;

    if (_.isString(action.value)) {
      value = action.regex ? prepForArgRegExpString(action.value) : prepForArgString(action.value)
    }

    var lines = "// NOT IMPLEMENTED";

    if (actions[action.type]) {
      var lines = actions[action.type].render(action, selector, value, testData);
    }

    if (typeof lines === "string") {
      lines = [[0, lines]];
    }

    if (action.commented) {
      lines.forEach((line) => {
        line[1] = "// " + line[1];
      })
    }

    lineArray = lineArray.concat(lines);

  });

  lineArray.forEach((line) => {
    line[0] = (line[0] + indent);
  });

  return lineArray;

};

module.exports.generateLineArrayFromBlock = generateLineArrayFromBlock;

function prepForArgString(string) {
  return string
    .replace(new RegExp("\\${", 'g'), "\\${")
    .replace(new RegExp("`", 'g'), "\\`")
}

function prepForArgRegExpString(string) {
  return string
    .replace(new RegExp("\\\\", 'g'), "\\\\")
    .replace(new RegExp("\\${", 'g'), "\\${")
    .replace(new RegExp("`", 'g'), "\\`")
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