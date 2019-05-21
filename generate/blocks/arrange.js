module.exports = (actions) => {

  actions = actions.map((action) => ({...action, indent: action.indent || 0}));

  function buildIfBlock(startIdx) {

    var block = [];
    var firstAction = actions[startIdx];
    var currentIdx = startIdx;
    var currentAction = actions[startIdx];

    while (currentIdx < actions.length) {

      currentAction = actions[currentIdx];
      var nextAction = actions[currentIdx + 1] || {};

      if (currentAction.indent === firstAction.indent) {

        // First action should always be an IF
        if (currentAction.id === firstAction.id && nextAction.indent === currentAction.indent + 1) {

          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "IF",
            condition: currentAction.value,
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;

        }
        else if (currentAction.type === "ELSEIF") {
          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "ELSEIF",
            condition: currentAction.value,
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;
        }
        else if (currentAction.type === "ELSE") {
          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "ELSE",
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;
        }
        else {
          return {
            lastProcessedIdx: currentIdx - 1,
            block
          }
        }
      } else {
        return {
          lastProcessedIdx: currentIdx - 1,
          block
        }
      }
    }

    return {
      lastProcessedIdx: currentIdx,
      block
    }

  }

  function buildBlock(startIdx) {

    var block = [];
    var firstAction = actions[startIdx];
    var currentIdx = startIdx;
    var currentAction = actions[startIdx];

    while (currentIdx < actions.length) {

      currentAction = actions[currentIdx];

      if (currentAction.indent === firstAction.indent) {

        // only ifs can start a new block:
        if (currentAction.type === "IF") {
          var ifBlock = buildIfBlock(currentIdx);
          block.push({type: "IFBLOCK", block: ifBlock.block});
          currentIdx = ifBlock.lastProcessedIdx + 1;
        } else {
          block.push(actions[currentIdx]);
          currentIdx++;
        }

      }
      // coming back down ends this block
      else if (currentAction.indent < firstAction.indent) {
        return {
          lastProcessedIdx: currentIdx - 1,
          block
        };
      }
      // going up without a flow control gets skipped
      else if (currentAction.indent > firstAction.indent) {
        currentIdx++;
      }

    }

    return {
      lastProcessedIdx: currentIdx,
      block
    };

  }

  return buildBlock(0).block;

};