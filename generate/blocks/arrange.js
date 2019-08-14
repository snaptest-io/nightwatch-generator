module.exports = (actions) => {

  actions = actions.map((action) => ({...action, indent: action.indent || 0}));

  return buildBlock(0).block;

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
        }
        else if (currentAction.type === "DOWHILE") {
          var doWhileBlock = buildDoWhileBlock(currentIdx);
          block.push({type: "DOWHILEBLOCK", block: doWhileBlock.block || []});
          currentIdx = doWhileBlock.lastProcessedIdx + 1;
        }
        else if (currentAction.type === "WHILE") {
          var doWhileBlock = buildWhileBlock(currentIdx);
          block.push({type: "WHILEBLOCK", block: doWhileBlock.block || []});
          currentIdx = doWhileBlock.lastProcessedIdx + 1;
        }
        else if (currentAction.type === "TRY") {
          var tryBlock = buildTryBlock(currentIdx);
          block.push({type: "TRYBLOCK", block: tryBlock.block || []});
          currentIdx = tryBlock.lastProcessedIdx + 1;
        }
        else {
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

  function buildIfBlock(startIdx) {

    var block = [];
    var firstAction = actions[startIdx];
    var currentIdx = startIdx;
    var currentAction = actions[startIdx];

    while (currentIdx < actions.length) {

      currentAction = actions[currentIdx];
      var nextAction = actions[currentIdx + 1] || {};

      if (currentAction.indent === firstAction.indent) {

        // If first action... (will always be a type: "IF")
        if (currentAction.id === firstAction.id && nextAction.indent === currentAction.indent + 1) {

          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "IF",
            condition: currentAction.value,
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;

        }
        else if (currentAction.id === firstAction.id && nextAction.indent <= currentAction.indent) {

          block.push({
            type: "IF",
            condition: currentAction.value,
            then: []
          });

          currentIdx++;

        }
        else if (currentAction.id === firstAction.id && !nextAction.id) {

          block.push({
            type: "IF",
            condition: currentAction.value,
            then: []
          });

          return {
            lastProcessedIdx: currentIdx,
            block
          }

        }

        // Else if...
        else if (currentAction.type === "ELSEIF" && nextAction.indent === currentAction.indent + 1) {

          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "ELSEIF",
            condition: currentAction.value,
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;
        }
        else if (currentAction.type === "ELSEIF" && nextAction.indent <= currentAction.indent) {
          block.push({
            type: "ELSEIF",
            condition: currentAction.value,
            then: []
          });

          currentIdx++;
        }
        else if (currentAction.type === "ELSEIF" && !nextAction.id) {
          block.push({
            type: "IF",
            condition: currentAction.value,
            then: []
          });

          return {
            lastProcessedIdx: currentIdx,
            block
          }
        }

        // else
        else if (currentAction.type === "ELSE" && nextAction.indent === currentAction.indent + 1) {
          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "ELSE",
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;
        }
        // this action breaks the rules of If/elseif/else
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

  function buildDoWhileBlock(startIdx) {

    var block = [];
    var firstAction = actions[startIdx];
    var currentIdx = startIdx;
    var currentAction = actions[startIdx];

    while (currentIdx < actions.length) {

      currentAction = actions[currentIdx];
      var nextAction = actions[currentIdx + 1] || {};

      if (currentAction.indent === firstAction.indent) {

        // If first action... (will always be a type: "DOWHILE")
        if (currentAction.id === firstAction.id && nextAction.indent === currentAction.indent + 1) {

          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "DOWHILE",
            condition: currentAction.value,
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;

        }
        else if (currentAction.id === firstAction.id && nextAction.indent <= currentAction.indent) {

          block.push({
            type: "DOWHILE",
            condition: currentAction.value,
            then: []
          });

          currentIdx++;

        }
        else if (currentAction.id === firstAction.id && !nextAction.id) {

          block.push({
            type: "DOWHILE",
            condition: currentAction.value,
            then: []
          });

          return {
            lastProcessedIdx: currentIdx,
            block
          }

        }

        // this action breaks the rules of If/elseif/else
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

  function buildWhileBlock(startIdx) {

    var block = [];
    var firstAction = actions[startIdx];
    var currentIdx = startIdx;
    var currentAction = actions[startIdx];

    while (currentIdx < actions.length) {

      currentAction = actions[currentIdx];
      var nextAction = actions[currentIdx + 1] || {};

      if (currentAction.indent === firstAction.indent) {

        // If first action... (will always be a type: "WHILE")
        if (currentAction.id === firstAction.id && nextAction.indent === currentAction.indent + 1) {

          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "WHILE",
            condition: currentAction.value,
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;

        }
        else if (currentAction.id === firstAction.id && nextAction.indent <= currentAction.indent) {

          block.push({
            type: "WHILE",
            condition: currentAction.value,
            then: []
          });

          currentIdx++;

        }
        else if (currentAction.id === firstAction.id && !nextAction.id) {

          block.push({
            type: "WHILE",
            condition: currentAction.value,
            then: []
          });

          return {
            lastProcessedIdx: currentIdx,
            block
          }

        } else {
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

  function buildTryBlock(startIdx) {

    var block = [];
    var firstAction = actions[startIdx];
    var currentIdx = startIdx;
    var currentAction = actions[startIdx];

    while (currentIdx < actions.length) {

      currentAction = actions[currentIdx];
      var nextAction = actions[currentIdx + 1] || {};

      if (currentAction.indent === firstAction.indent) {

        // If first action... (will always be a type: "TRY")
        if (currentAction.id === firstAction.id && nextAction.indent === currentAction.indent + 1) {

          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "TRY",
            condition: currentAction.value,
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;

        }
        else if (currentAction.id === firstAction.id && nextAction.indent <= currentAction.indent) {

          block.push({
            type: "TRY",
            condition: currentAction.value,
            then: []
          });

          currentIdx++;

        }
        else if (currentAction.id === firstAction.id && !nextAction.id) {

          block.push({
            type: "TRY",
            condition: currentAction.value,
            then: []
          });

          return {
            lastProcessedIdx: currentIdx,
            block
          }

        }

        // Catch block:
        else if (currentAction.type === "CATCH" && nextAction.indent === currentAction.indent + 1) {

          var then = buildBlock(currentIdx + 1);

          block.push({
            type: "CATCH",
            then: then.block
          });

          currentIdx = then.lastProcessedIdx + 1;
        }
        else if (currentAction.type === "CATCH" && nextAction.indent <= currentAction.indent) {
          block.push({
            type: "CATCH",
            then: []
          });

          currentIdx++;
        }
        else if (currentAction.type === "CATCH" && !nextAction.id) {
          block.push({
            type: "CATCH",
            then: []
          });

          return {
            lastProcessedIdx: currentIdx,
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

};