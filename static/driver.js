const Actions = require('./actiondata').ActionsByConstant;
const Variables = require('./variables.js');
const TIMEOUT = 5000;

module.exports.bindDriver = function(browser) {

  var oldBack = browser.back;
  var oldForward = browser.forward;
  var oldRefresh = browser.refresh;

  var POLLING_RATE = 300;

  var snptEvaluator =
    `(function() {      
      window["snptEvaluator"] = function (str, vars) {
      
        var copyOfVars = {};
    
        for (var i in vars) {
          copyOfVars[i] = vars[i];
        }
    
        var regex = /\\$\\(/gi, result, indices = [];
        while ( (result = regex.exec(str)) ) {
          indices.push(result.index);
        }
    
        var evalData = indices.map((index) => ({
          start: index,
          end: null,
          value: null
        }));
    
        evalData = evalData.map((evalD) => {
          var opened = 0;
          var closed = 0;
          var currentIdx = evalD.start + 2;
          var currentChar = str.charAt(currentIdx);
          var result = "";
    
          while(currentChar) {
            if (currentChar === "(") {
              opened++;
            }
            else if (currentChar === ")") {
              closed++;
              if (closed > opened) break;
            }
    
            result+=currentChar;
            currentIdx++;
            currentChar = str.charAt(currentIdx);
          }
    
          return {...evalD, result: eval(result), end: currentIdx, length: currentIdx - evalD.start}
    
        })
    
        var newString = str;
    
        evalData.forEach((evalD) => {
          var nextSubIdx = newString.indexOf("$(");
          newString = newString.split("");
          newString.splice(nextSubIdx, evalD.length + 1, evalD.result + "");
          newString = newString.join("");
        });
    
        return newString;
      
      }
    })();
  `;

  var snptGetElement =
    `(function() {

      var w = window, d = w.document;

      function xp(x) { var r = d.evaluate(x, d.children[0], null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); return r.snapshotItem(0) };

      return w["snptGetElement"] = function(s, t) {
        try {
          return t === "XPATH" ? xp(s) :
                 t === "ID" ? d.querySelector("#" + s) :
                 t === "ATTR" ? d.querySelector("[" + s + "]") :
                 t === "NAME" ? d.querySelector("[name=\\"" + s + "\\"]") :
                 t === "TEXT" ? xp("//*[contains(text(), '" + s + "')]")
                 : d.querySelector(s); }
        catch(e) {
          return null
        }

      }

    })();`

  function prepStringFuncForExecute(funcToExecute) {
    return 'var passedArgs = Array.prototype.slice.call(arguments,0); return ' + funcToExecute + '.apply(window, passedArgs);';
  };

  function noop() {};

  function renderWithVars(value, variablesArray) {
    if (typeof value !== "string") return value;

    variablesArray.forEach((replacer) => {
      var myRegEx = new RegExp(`\\$\\{${replacer.key}\\}`, "g");
      value = value.replace(myRegEx, replacer.value);
    });
    return value;
  }

  function getVars(browser) {
    return (browser.compVarStack.length > 0 ? browser.compVarStack[browser.compVarStack.length -1] : browser.vars).getAll();
  }

  function blockCancelled(browser) {

    return (browser.loopStack.length > 0 && browser.loopStack[browser.loopStack.length - 1].break)
      || (browser.tryContextStack.length > 0 && browser.tryContextStack[browser.tryContextStack.length - 1].error);
  }

  function onCriticalDriverError(args) {

    const { error, techDescription } = args;

    console.error("CRITICAL DRIVER ERROR: " + error);
    console.error("WHEN RUNNING: " + techDescription);

  }

  function onActionSuccess(args) {

    const { description, techDescription, duration = 0, actionType = "UNKNOWN", selectorType, selector } = args;

    browser.snapResults.push({
      success: true,
      actionType,
      actionDef: techDescription,
      duration,
      ...(selectorType && {selectorType}),
      ...(selector && {selector})
    });

    browser.assert.ok(true, description ? `${description} ( ${techDescription} )` : techDescription);

  }

  function onActionFailed(args) {

    const { description, techDescription, duration = 0, error, selectorType, selector, actionType = "UNKNOWN", optional } = args;

    browser.snapResults.push({
      success: optional ? true : false,
      error,
      actionType,
      actionDef: techDescription,
      duration,
      ...(selectorType && {selectorType}),
      ...(selector && {selector})
    });

    // check for being in a try context:
    if (!optional && browser.tryContextStack.length > 0) {
      browser.tryContextStack[browser.tryContextStack.length - 1].error = true;
      browser.assert.ok(true, description ? `${description} ${techDescription} - ${error}` : `${techDescription} - ${error}`);
    } else {
      browser.assert.ok(optional ? true : false, description ? `${description} ${techDescription} - ${error}` : `${techDescription} - ${error}`);
    }

  }

  browser.startTest = (testVars, snapTestId) => {

    browser.vars = testVars;
    browser.snapTestId = snapTestId;
    browser.snapResults = [];
    browser.snapStartTime = Date.now();
    browser.snapCsvs = [];
    browser.tryContextStack = [];
    browser.loopStack = [];

    return browser;
  };

  browser.endComponent = () => {
    browser.perform(() => {
      browser.compVarStack.pop();
    });

    return browser;
  };

  const reportElementMissing = (actionType, selector, selectorType, cb, optional, description, techDescription, startTime) => {
    if (cb) {
      cb(false);
    }
    else {
      onActionFailed({
        optional,
        description,
        techDescription,
        actionType,
        duration: Date.now() - startTime,
        error: `Couldn't find element '${selector}' using method '${selectorType}'.`
      });
    }
  };

  browser.snapActions = {
    "loadPage": (args) => {

      var { url, width, height, description, cb, resize, complete, optional = false, timeout, actionType = "FULL_PAGELOAD" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var renderedUrl = renderWithVars(url, getVars(browser));
        var description = renderWithVars(description, getVars(browser));
        var techDescription = `${Actions[actionType].name} ${renderedUrl}`;

        browser.url(renderedUrl);

        if (resize) browser.resizeWindow(width, height);

        if (complete) {
          browser._pollUntilDOMComplete(timeout, (success) => {
            if (!success) {
              if (cb) {
                cb(false);
              } else {
                onActionFailed({
                  optional,
                  description,
                  techDescription,
                  actionType,
                  error: "Page never completely loaded.",
                  duration: Date.now() - then
                })
              }
            } else {
              onActionSuccess({
                description,
                techDescription,
                actionType,
                duration: Date.now() - then
              });
            }
          })
        } else {

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);
        }

      });

      return browser;
    },

    "back": (args) => {

      const { description, cb, actionType = "BACK" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var description = renderWithVars(description, getVars(browser));
        var techDescription = `${Actions["BACK"].name}`;

        browser.pause(5);
        oldBack();

        onActionSuccess({
          description,
          techDescription,
          actionType,
          duration: Date.now() - then
        });

        if (cb) cb(true);

      });

      return browser;

    },

    "snapPause": (args) => {

      const { value, description, cb, actionType = "PAUSE" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var description = renderWithVars(description, getVars(browser));
        var techDescription = `${Actions["PAUSE"].name} "${value}"`;

        browser.pause(value);

        onActionSuccess({
          description,
          techDescription,
          actionType,
          duration: Date.now() - then
        });

        if (cb) cb(true);

      });

      return browser;

    },

    "break": (args) => {

      const { value, description, cb, actionType = "BREAK" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var description = renderWithVars(description, getVars(browser));
        var techDescription = `${Actions["BREAK"].name}`;

        if (browser.loopStack.length > 0) {
          browser.loopStack[browser.loopStack.length - 1].break = true;
        }

        onActionSuccess({
          description,
          techDescription,
          actionType,
          duration: Date.now() - then
        });

        if (cb) cb(true);

      });

      return browser;

    },

    "elementPresent": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "EL_PRESENT_ASSERT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var description = renderWithVars(description, getVars(browser));
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["EL_PRESENT_ASSERT"].name} ... using ${selector} (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then),
          () => {
            onActionSuccess({
              description,
              techDescription,
              actionType,
              duration: Date.now() - then
            });
            if (cb) cb(true);
          });

      });

      return browser;

    },

    "refresh": (args) => {

      var { description, cb, optional = false, timeout, actionType = "REFRESH" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var description = renderWithVars(description, getVars(browser));
        var techDescription = `${Actions["REFRESH"].name}`;

        oldRefresh();

        onActionSuccess({
          description,
          techDescription,
          actionType,
          duration: Date.now() - then
        });

        if (cb) cb(true);

      });

      return browser;
    },

    "forward": (args) => {

      var { description, cb, optional = false, timeout, actionType = "FORWARD" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var description = renderWithVars(description, getVars(browser));
        var techDescription = `${Actions["FORWARD"].name}`;

        oldForward();

        onActionSuccess({
          description,
          techDescription,
          actionType,
          duration: Date.now() - then
        });

        if (cb) cb(true);
      });

      return browser;

    },

    "clearCaches": (args) => {

      var { localstorage, sessionstorage, description, cb, optional = false, timeout, actionType = "CLEAR_CACHES" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var description = renderWithVars(description, getVars(browser));
        var techDescription = `${Actions["CLEAR_CACHES"].name}`;

        browser.deleteCookies();

        browser.execute(prepStringFuncForExecute(`function(localstorage, sessionstorage) {
          try {
          
            if (localstorage && window.localStorage) {
              window.localStorage.clear();
            }
          
            if (sessionstorage && window.sessionStorage) {
              window.sessionStorage.clear();
            }
            
          } catch(e) {
            return { criticalError: e.toString() }
          }
          
        }`), [localstorage, sessionstorage], (result) => {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);

        });

      });

      return browser;

    },

    "pathIs": (args) => {

      var { value, description, regex = false, cb, optional = false, timeout, actionType = "PATH_ASSERT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var pathname = renderWithVars(value, getVars(browser));
        if (regex) pathname = new RegExp(pathname, "g");
        var techDescription = `${Actions["PATH_ASSERT"].name}... "${pathname}"`;
        var description = renderWithVars(description, getVars(browser));

        var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
        var currentAttempt = 0;

        function checkForPageLoadWithPathname(pathname) {
          browser.execute(prepStringFuncForExecute(`function() {
            return {
              pathname: window.location.pathname,
              readyState: document.readyState
            };
          }`), [], function(result) {
            if (result.value.readyState === "complete" && (pathname instanceof RegExp ? pathname.test(result.value.pathname) : result.value.pathname === pathname)) {

              onActionSuccess({
                description,
                techDescription,
                actionType,
                duration: Date.now() - then
              });

              if (cb) cb(true);

            } else if(currentAttempt === attempts) {
              if (cb) {
                cb(false);
              }
              else {
                onActionFailed({
                  optional,
                  description,
                  actionType,
                  techDescription,
                  error: `Path doesn't match. Actual result was "${result.value.pathname}". `,
                  duration: Date.now() - then
                });
              }
            } else {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkForPageLoadWithPathname(pathname);
            }
          });
        }

        checkForPageLoadWithPathname(pathname);

      });

      return browser;

    },

    "executeScript": (args) => {

      var { value, description, cb, optional = false, timeout, actionType = "EXECUTE_SCRIPT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var script = renderWithVars(value, getVars(browser));
        var techDescription = `${Actions["EXECUTE_SCRIPT"].name}`;

        browser.execute(`${script}`, [], (result) => {

          if (typeof result.value === "boolean" && !result.value) {
            if (cb) {
              cb(false);
            }
            else {
              onActionFailed({
                optional,
                description,
                actionType,
                techDescription,
                error: "Script returned false.",
                duration: Date.now() - then
              });
            }
          } else {
            onActionSuccess({
              description,
              techDescription,
              actionType,
              duration: Date.now() - then
            });
          }

          if (cb) cb(true);

        });
      });

      return browser;
    },

    "switchToWindow": (args) => {

      var { windowIndex, description, cb, optional = false, timeout, actionType = "CHANGE_WINDOW" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var techDescription = `${Actions["CHANGE_WINDOW"].name}`;

        browser.windowHandles(function(result) {
          browser.switchWindow(result.value[windowIndex]);
          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });
          if (cb) cb(true);
        });
      });

      return browser;
    },

    "scrollWindow": (args) => {

      var { x, y, description, cb, optional = false, timeout, actionType = "SCROLL_WINDOW" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var techDescription = `${Actions["SCROLL_WINDOW"].name} to X:${x} & Y:${y} `;

        browser.execute(prepStringFuncForExecute(`function(x, y) {
          try {
            window.scrollTo(x, y);
          } catch(e) {
            return { criticalError: e.toString() } 
          }
        }`), [x, y], function(result) {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);

        });
      });

      return browser;
    },

    "scrollElement": (args) => {

      var { selector, selectorType = "CSS", x, y, description, cb, optional = false, timeout, actionType = "SCROLL_ELEMENT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["SCROLL_ELEMENT"].name} ... using ${selector} (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType, x, y) {
    
          ${snptGetElement}
          
          try {
            var el = snptGetElement(selector, selectorType);
            if (!el) return;
            el.scrollLeft = x;
            el.scrollTop = y;
          } catch (e) {
            return { criticalError: e.toString() }
          }
    
        }`), [selector, selectorType, x, y], (result) => {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);
        });
      });

      return browser;
    },

    "scrollWindowToElement": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "SCROLL_WINDOW_ELEMENT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["SCROLL_WINDOW_ELEMENT"].name} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType, value) {
    
          ${snptGetElement}
    
          try {
            var el = snptGetElement(selector, selectorType);
            if (!el) return;
            var elsScrollY = el.getBoundingClientRect().top + window.scrollY - el.offsetHeight;
            window.scrollTo(0, elsScrollY);
          } catch(e) {
            return { criticalError: e.toString() }
          }
          
        }`), [selector, selectorType], (result) => {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);
        });
      });

      return browser;
    },

    "click": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "MOUSEDOWN" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
		selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["MOUSEDOWN"].name} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
          ${snptGetElement}
    
          try {
          
            var element = snptGetElement(selector, selectorType);
            
            if (!element) return;
            
            function triggerMouseEvent(node, eventType) {
              var clickEvent = document.createEvent('MouseEvents');
              clickEvent.initEvent(eventType, true, true);
              node.dispatchEvent(clickEvent);
            }
    
            triggerMouseEvent(element, "mouseover");
            triggerMouseEvent(element, "mousedown");
            triggerMouseEvent(element, "mouseup");
            triggerMouseEvent(element, "click");

          } catch(e) {
            return { criticalError: e.toString() }
          }
    
        }`), [selector, selectorType], function(result) {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);

        });

      });

      return browser;

    },

    "doubleClick": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "DOUBLECLICK" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
		selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["DOUBLECLICK"].name} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
          ${snptGetElement}
    
          try {
          
            var element = snptGetElement(selector, selectorType);
            
            if (!element) return;
            
            function triggerMouseEvent(node, eventType) {
              var clickEvent = document.createEvent('MouseEvents');
              clickEvent.initEvent(eventType, true, true);
              node.dispatchEvent(clickEvent);
            }
    
            triggerMouseEvent(element, "dblclick");

          } catch(e) {
            return { criticalError: e.toString() }
          }
    
        }`), [selector, selectorType], function(result) {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);

        });

      });

      return browser;

    },

    "changeInput": (args) => {

      var { selector, selectorType = "CSS", value, description, cb, optional = false, timeout, actionType = "INPUT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var renderedValue = renderWithVars(value, getVars(browser));
        var techDescription = `${Actions["INPUT"].name} ... to ${renderedValue} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then),
          (elementInfo) => {

            // Text areas are not handling the javascript only trigger.
            if (elementInfo.nodeName === "TEXTAREA") {

              if (selectorType == "XPATH" && !browser.useXpath) {
                console.warn(`WARNING: The change input of TEXTAREA with xPath selector has not been supported in this nightwatch version, please use nightwatch > 0.4.0`);
              }

              if (selectorType == "XPATH") { browser.useXpath(); }

              browser.clearValue(selector);
              browser.setValue(selector, renderedValue, () => {

                onActionSuccess({
                  description,
                  techDescription,
                  actionType,
                  duration: Date.now() - then
                });

                if (cb) cb(true);

              });

              //Switch back to default behaviour of nightwatch
              if (selectorType == "XPATH") { browser.useCss(); }

            } else {

              browser.execute(prepStringFuncForExecute(`function(selector, selectorType, value) {
    
              ${snptGetElement}
    
              try {
    
                var el = snptGetElement(selector, selectorType);
                if (!el) return;
    
                function triggerKeyEvent(node, eventType) {
                  var keydownEvent = document.createEvent( 'KeyboardEvent' );
                  keydownEvent.initEvent( eventType, true, false, null, 0, false, 0, false, 66, 0 );
                  node.dispatchEvent( keydownEvent );
                }
    
                triggerKeyEvent(el, "keydown");
                el.focus();
    
                if (el.nodeName === "SELECT" || el.nodeName === "TEXTAREA") {
                  el.value = value;
                } else {
                  var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                  nativeInputValueSetter.call(el, value);
                }
    
                el.dispatchEvent(new Event('change', {bubbles: true}));
                el.dispatchEvent(new Event('input', {bubbles: true}));
                triggerKeyEvent(el, "keyup");
                triggerKeyEvent(el, "keypress");
    
              } catch(e) {
                return { criticalError: e.toString() }
              }
    
            }`), [selector, selectorType, renderedValue], function (result) {

                if (result.value && result.value.criticalError) return onCriticalDriverError({
                  error: result.value.criticalError,
                  techDescription
                });

                onActionSuccess({
                  description,
                  techDescription,
                  actionType,
                  duration: Date.now() - then
                });

                if (cb) cb(true);

              });
            }
          });

      });

      return browser;

    },

    "elStyleIs": (args) => {

      var { selector, selectorType = "CSS", style, value, description, cb, optional = false, timeout, actionType = "STYLE_ASSERT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["STYLE_ASSERT"].name} ... is "${style}: "${value}" ...  using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
        var currentAttempt = 0;

        function checkforStyle(selector, selectorType, style, value) {
          browser.execute(prepStringFuncForExecute(`function(selector, selectorType, style) {
            ${snptGetElement}
            try {
              var el = snptGetElement(selector, selectorType);
              if (!el) return;
              return window.getComputedStyle(el, null).getPropertyValue(style);
            } catch(e) {
              return { criticalError: e.toString() }
            }
          }`), [selector, selectorType, style], function(result) {

            if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

            if (value instanceof RegExp ? value.test(result.value) : value === result.value) {
              onActionSuccess({
                description,
                techDescription,
                actionType,
                duration: Date.now() - then
              });
              if (cb) cb(true);
            } else if (currentAttempt === attempts) {
              if (cb) {
                cb(false);
              } else {
                onActionFailed({
                  optional,
                  description,
                  actionType,
                  techDescription,
                  error: "Style didn't match.",
                  duration: Date.now() - then
                });
              }
            } else {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkforStyle(selector, selectorType, style, value);
            }
          });
        }

        checkforStyle(selector, selectorType, style, value);

      });

      return browser;

    },

    "inputValueAssert": (args) => {

      var { selector, selectorType = "CSS", value, regex = false, description, cb, optional = false, timeout, actionType = "VALUE_ASSERT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var renderedValue = renderWithVars(value, getVars(browser));
        if (regex) renderedValue = new RegExp(renderedValue, "g");
        var techDescription = `${Actions["VALUE_ASSERT"].name} ... is "${renderedValue}" ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
        var currentAttempt = 0;

        function checkforValue(selector, selectorType, value) {
          browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
            ${snptGetElement}
            
            try {
            
              var el = snptGetElement(selector, selectorType);
              if (!el) return;        
          
              if (el.type === 'checkbox' || el.type === 'radio') {
                return el.checked ? "true" : "false";
              } else {
                return el.value;
              }
            
            } catch (e) {
              return { criticalError: e.toString() }
            }
          }
          `), [selector, selectorType], function(result) {

            if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

            if (value instanceof RegExp ? value.test(result.value) : value === result.value) {

              onActionSuccess({
                description,
                techDescription,
                actionType,
                duration: Date.now() - then
              });

              if (cb) cb(true);
            } else if(currentAttempt === attempts) {
              if (cb) {
                cb(false);
              } else {
                onActionFailed({
                  optional,
                  description,
                  actionType,
                  techDescription,
                  error: `Expected value to be "${renderedValue}" but was "${result.value}"`,
                  duration: Date.now() - then
                });
              }
            } else {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkforValue(selector, selectorType, value);
            }
          });
        }

        checkforValue(selector, selectorType, renderedValue);

      });

      return browser;

    },

    "elementNotPresent": (args) => {
      // TODO: refactor to use selector strategies
      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "EL_NOT_PRESENT_ASSERT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["EL_NOT_PRESENT_ASSERT"].name} ... using "${selector}" (${selectorType})`;
        browser.waitForElementNotPresent(selector, timeout || TIMEOUT);
        if (cb) cb(true);

      });

      return browser;
    },

    "focusOnEl": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "FOCUS" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["FOCUS"].name} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
    
          ${snptGetElement}
          
          try {
          
            var el = snptGetElement(selector, selectorType);
            if (!el) return;
         
            var event = new FocusEvent('focus');
            el.dispatchEvent(event);
          } catch(e) {
            return { criticalError: e.toString() }
          }
          
        }`), [selector, selectorType], function(result) {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);

        });
      });

      return browser;
    },

    "formSubmit": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "SUBMIT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["SUBMIT"].name} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
          ${snptGetElement}
          
          try {
            var el = snptGetElement(selector, selectorType);
            if (!el) return;
            var event = new Event('submit');
            el.dispatchEvent(event);
          } catch(e) {
            return { criticalError: e.toString() }
          }
    
        }`), [selector, selectorType], function(result) {
          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);
        });
      });

      return browser;
    },

    "blurOffEl": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout, actionType = "BLUR" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var techDescription = `${Actions["BLUR"].name} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
    
          ${snptGetElement}

          try {          
            var el = snptGetElement(selector, selectorType);
            if (!el) return;
            var event = new FocusEvent('blur');
            el.dispatchEvent(event);
          } catch (e) {
            return { criticalError: e.toString() }
          }
          
    
        }`), [selector, selectorType], function(result) {

          if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);

        });
      });

      return browser;
    },

    "elTextIs": (args) => {

      var { selector, selectorType = "CSS", value, regex = false, description, cb, optional = false, timeout, actionType = "TEXT_ASSERT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        selector = renderWithVars(selector, getVars(browser));
        var assertText = renderWithVars(value, getVars(browser));
        if (regex) assertText = new RegExp(assertText, "g");
        var techDescription = `${Actions["TEXT_ASSERT"].name} ... is "${assertText}" ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
        var currentAttempt = 0;

        function checkforText(selector, selectorType, assertText) {
          browser._getElText(selector, selectorType,  function(elsText) {
            if (assertText instanceof RegExp ? assertText.test(elsText) : assertText === elsText) {

              onActionSuccess({
                description,
                techDescription,
                actionType,
                duration: Date.now() - then
              });

              if (cb) cb(true);
            } else if(currentAttempt === attempts) {
              if (cb) {
                cb(false);
              }
              else {
                onActionFailed({
                  optional,
                  description,
                  actionType,
                  techDescription,
                  error: `Expected text to be "${assertText}" but was "${elsText}"`,
                  duration: Date.now() - then
                });
              }
            } else {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkforText(selector, selectorType, assertText);
            }
          });
        }

        checkforText(selector, selectorType, assertText);
      });

      return browser;

    },

    "eval": (args) => {

      var { value, description, cb, optional = false, timeout, actionType = "EVAL" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var variables = browser.vars.getAllObject();
        var renderedValue = renderWithVars(value, browser.vars.getAll());
        var techDescription = `${Actions["EVAL"].name} "${renderedValue}"`;

        // check for a successful browser execute.
        browser.execute(prepStringFuncForExecute(`function(value, variables) {
          try {
            var vars = variables;
            var success = eval(value)
            return {success: success, vars: vars};
          } catch(e) {
            return {scriptError: false, vars: vars};
          }
        }`), [renderedValue, variables], function(result) {

          // find any new or updated variables...
          browser.vars.updateAll(result.value.vars);

          if (result.value.scriptError) {
            onActionSuccess({
              description,
              techDescription: techDescription + "; Script Error: " + result.value.scriptError,
              actionType,
              duration: Date.now() - then
            });
          } else if (typeof result.value.success === "boolean" && !result.value.success) {
            if (cb) {
              cb(false);
            } else {
              onActionFailed({
                optional,
                description,
                actionType,
                techDescription,
                error: `Eval returned false`,
                duration: Date.now() - then
              });
            }
          } else {
            onActionSuccess({
              description,
              techDescription: `${techDescription}; Eval returned ${result.value.success}`,
              actionType,
              duration: Date.now() - then
            });
            if (cb) cb(true);
          }

        });

      });

      return browser;
    },

    "setDialogs": (args) => {

      var { alert, confirm, prompt, promptResponse, description, cb, optional = false, timeout, actionType = "DIALOG" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var renderedPrompt = renderWithVars(promptResponse, browser.vars.getAll());
        var techDescription = `${Actions["DIALOG"].name} ... `;

        // check for a successful browser execute.
        browser.execute(prepStringFuncForExecute(`function(alert, confirm, prompt, promptResponse) {
          try {
            
            if (alert) window.alert = function() {};
            window.confirm = function() { return confirm }
            window.prompt = function() { return promptResponse }
           
          } catch(e) {
            return {success: false, vars: vars};
          }
        }`), [alert, confirm, prompt, renderedPrompt], function(result) {

          if (result.value && result.value.criticalError)
            return onCriticalDriverError({error: result.value.criticalError, techDescription});

          onActionSuccess({
            description,
            techDescription,
            actionType,
            duration: Date.now() - then
          });

          if (cb) cb(true);

        });
      });

      return browser;

    },

    "insertCSVRow": (args) => {

      var { csvName, columns, description, cb, optional = false, timeout, actionType = "CSV_INSERT" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        columns  = JSON.parse(columns);
        var then = Date.now();
        var variables = browser.vars.getAllObject();
        var techDescription = `${Actions["CSV_INSERT"].name}`;

        browser.execute(prepStringFuncForExecute(`function(columns, variables) {
          
          ${snptEvaluator}
          ${snptGetElement}
    
          try {
                   
            var values = [];

            columns.forEach((column) => {
              try {

                selector = snptEvaluator(column.selector, variables);
                
                var colEl = snptGetElement(selector, "CSS");

                if (colEl) {
                  var value = colEl[column.select];

                  if (value) values.push(value);
                  else {
                    values.push(null);
                  }

                } else {
                  values.push(null);
                }

              } catch(e) {
                values.push(null);
              }


            });

            return {success: true, colValues: values};

          } catch(e) {
            return { criticalError: e.toString() }
          }
    
        }`), [columns, variables], function(result) {

          if (result.value && result.value.success) {

            if (!browser.snapCsvs[csvName]) {
              browser.snapCsvs[csvName] = [columns.map((column) => column.columnName)]
            }

            browser.snapCsvs[csvName].push(result.value.colValues);

            onActionSuccess({
              description,
              techDescription,
              actionType,
              duration: Date.now() - then
            });

            if (cb) cb(true);
          }
          else if (result.value && result.value.criticalError) {
            onCriticalDriverError({error: result.value.criticalError, techDescription});
            if (cb) return cb(false);
          }

        });



        // browser.snapCsvs[csvName].push();
      });

      return browser;

    },

    "addDynamicVar": (args) => {

      var { selector, selectorType, varName, description, cb, optional = false, timeout, actionType = "DYNAMIC_VAR" } = args;

      browser.perform(() => {

        if (blockCancelled(browser)) return;

        var then = Date.now();
        var variables = browser.vars.getAllObject();
        var techDescription = `${Actions["DYNAMIC_VAR"].name} ... adding var named ${varName} ... using "${selector}" (${selectorType})`;

        browser._elementPresent(selector, selectorType, null, timeout,
          () => reportElementMissing(actionType, selector, selectorType, cb, optional, description, techDescription, then));

        // check for a successful browser execute.
        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
          ${snptGetElement}
    
          function getValue(el) {
                    
            if (!el) return null;
          
            if (el.type === 'checkbox' || el.type === 'radio') {
              return el.checked ? "true" : "false";
            } else {
              return el.value;
            }
          }
          
          function getTextNode(element) {
          
            if (!element) return null;
          
            var text = "";
            for (var i = 0; i < element.childNodes.length; ++i)
              if (element.childNodes[i].nodeType === 3)
                if (element.childNodes[i].textContent)
                  text += element.childNodes[i].textContent;
          
            text = text.replace(/(\\r\\n|\\n|\\r)/gm,"");
            
            var rtrim = /^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g;
            return text.replace(rtrim, '');
          
          }
    
          try {
          
            var element = snptGetElement(selector, selectorType);
            if (!element) return {success: false};
            
            var value = (getValue(element) ||  getTextNode(element) || "");
            return {success: true, elValue: value};

          } catch(e) {
            return { criticalError: e.toString() }
          }
    
        }`), [selector, selectorType], function(result) {

          if (result.value && result.value.success) {

            variables[varName] = result.value.elValue;
            browser.vars.updateAll(variables);

            onActionSuccess({
              description,
              techDescription,
              actionType,
              duration: Date.now() - then
            });

            if (cb) cb(true);
          }
          else if (result.value && result.value.criticalError) {
            onCriticalDriverError({error: result.value.criticalError, techDescription});
            if (cb) return cb(false);
          }

        });

      });

      return browser;

    },

    "_getElText": (selector, selectorType = "CSS", onSuccess = noop) => {

      browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
        ${snptGetElement}
    
        try {
    
          var element = snptGetElement(selector, selectorType)
      
          if (!element) return null;
          var text = "";
          for (var i = 0; i < element.childNodes.length; ++i)
            if (element.childNodes[i].nodeType === 3)
              if (element.childNodes[i].textContent)
                text += element.childNodes[i].textContent;
          text = text.replace(/(\\r\\n|\\n|\\r)/gm, "");
          
          var rtrim = /^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g;
          return text.replace(rtrim, '');
          
        } catch(e) {
          return { criticalError: e.toString() }
        }
        
        
      }`), [selector, selectorType], function(result) {
        if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});
        onSuccess(result.value);
      });

      return browser;

    },

    "_elementPresent": (selector, selectorType = "CSS", description, timeout, onFail = noop, onSuccess = noop) => {

      var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
      var currentAttempt = 0;

      function checkforEl(selector) {
        browser.execute(
          prepStringFuncForExecute(`function(selector, selectorType) {
            ${snptGetElement}
            try {
              var el = snptGetElement(selector, selectorType); 
              
              if (el) {
                return { success: true, elementInfo: { nodeName: el.nodeName } }
              } else {
                return { success: false }  
              }
              
              return !!snptGetElement(selector, selectorType);
            } catch (e) {
              return { criticalError: e.toString() }
            }
          }`), [selector, selectorType], function(result) {

            if (result.value && result.value.criticalError) return onCriticalDriverError({error: result.value.criticalError, techDescription});

            if (!result.value.success && currentAttempt < attempts) {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkforEl(selector);
            } else if (!result.value.success) {
              onFail();
            } else {
              onSuccess(result.value.elementInfo);
            }

          });
      }

      checkforEl(selector);

      return browser;

    },

    "_pollUntilDOMComplete": (timeout, cb) => {

      var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
      var currentAttempt = 0;

      function checkForDomComplete() {
        browser.execute(
          prepStringFuncForExecute(`function() {
            return document.readyState === "complete";
          }`), [], function(result) {

            if (!result.value && currentAttempt < attempts) {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkForDomComplete(url);
            } else if (!result.value) {
              cb(false);
            } else {
              cb(true);
            }

          });
      }

      checkForDomComplete();

      return browser;
    },

  };

  /* Component helper */

  browser.component = (name, instanceVars) => {
    browser.perform(() => {

      Object.keys(instanceVars).map(function(key) {
        instanceVars[key] = renderWithVars(instanceVars[key], getVars(browser))
      });

      // get defaults
      var component = browser.components[name];
      var defaultsVars = component.defaults;
      var compVars = Variables.CompVars(browser.vars, defaultsVars, instanceVars)

      // call the component, pushing the new var context onto a stack.
      browser.compVarStack.push(compVars);

      component.actions();

    });

    return browser;

  };


  /* ***************************************************************************************

    Register actions & corresponding conditional thunks on the browser object for easy access.

  **************************************************************************************** */

  browser.if = {};
  browser.elseif = {};

  for (var i in browser.snapActions) {

    browser[i] = browser.snapActions[i];

    browser.if[i] = (() => {
      var funcName = i;
      return (args) => () => ({
        execute: (b, cb) => {
          b[funcName]({...args, cb});
        },
        type: "if"
      })
    })();

    browser.elseif[i] = (() => {
      var funcName = i;
      return (args) => () => ({
        execute: (b, cb) => { b[funcName]({...args, cb}); },
        type: "elseif"
      })
    })();

  }

  browser.then = (cb) => {
    return () => ({
      type: "then",
      execute: (b) => {
        cb(b)
      }
    })
  };

  browser.do = (cb) => {
    return () => ({
      type: "do",
      execute: (b, blockSuccess) => {
        cb(b);
        b.perform(() => blockSuccess() )
      }
    })
  };

  browser.else = (cb) => {
    return () => ({
      type: "else",
      execute: (b) => {
        cb(b)
      }
    })
  };

  /* ***************************************************************************************

  Dowhile control:

    Example:

   .doWhile(
     b.do((b) => { b
       .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
     }),
     b.if.elementPresent(`div > div:nth-of-type(3) > div:nh-of-type(2) > h1`, `CSS`, `El is present`, null),
   )

**************************************************************************************** */

  browser.doWhile = function(doBlock, doWhile) {

    browser.perform(() => {

      browser.loopStack.push({break: false});

      (function perform() {

        doWhile().execute(browser, (success) => {

          if (success) {
            doBlock().execute(browser, () => {
              perform();
            });
          } else {
            browser.loopStack.pop();
          }

        });

      })();

    });

    return browser;

  };

  /* ***************************************************************************************

   While control:

     Example:

    .while(
      b.if.elementPresent(`div > div:nth-of-type(3) > div:nh-of-type(2) > h1`, `CSS`, `El is present`, null),
      b.do((b) => { b
        .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
      }),
    )

 **************************************************************************************** */

  browser.while = function(doWhile, doBlock) {

    browser.perform(() => {

      browser.loopStack.push({break: false});

      (function perform() {

        doWhile().execute(browser, (success) => {

          if (success) {
            doBlock().execute(browser, () => {
              perform();
            });
          } else {
            browser.loopStack.pop();
          }

        });

      })();

    });

    return browser;

  };

  /* ***************************************************************************************

   Try/catch control:

     Example:

    .tryCatch(
      b.do((b) => { b
        .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
      }),
      b.do((b) => { b
        .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
      })
    )

 **************************************************************************************** */

  browser.tryCatch = function(doBlock, catchBlock) {

    browser.perform(() => {
      browser.tryContextStack.push({error: false});
      doBlock().execute(browser, () => {});
      browser.perform(() => {
        if (blockCancelled(browser)) {
          browser.tryContextStack.pop();
          catchBlock().execute(browser, () => {
          })
        }
      })
    });

    return browser;

  };


  /* ***************************************************************************************

    Condition control:
      Example:

     .condition(
       b.if.elementPresent(`div > div:nth-of-type(3) > div:nh-of-type(2) > h1`, `CSS`, `El is present`, null),
       b.then((b) => { b
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
       }),
       b.elseif.elementPresent(`div > div:nth-of-type(3) > div:nt-of-type(2) > h1`, `CSS`, `El is present`, null),
       b.then((b) => { b
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
       }),
       b.else((b) => { b
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
         .elementPresent(`div > div:nth-of-type(3) > div:nth-of-type(2) > h1`, `CSS`, `El is present`, null)
       })
     )

  **************************************************************************************** */

  browser.condition = function(...condArray) {

    var cIndex = 0;

    // register each conditional.
    condArray = condArray.map((condition) => ({...condition()}));

    browser.perform(() => {

      (function perform() {

        var currentCondition = condArray[cIndex];

        if (!currentCondition) return;

        if (currentCondition.type === "if" || currentCondition.type === "elseif") {

          currentCondition.execute(browser, (success) => {

            cIndex++;

            // if success case:
            if (success) {
              if (condArray[cIndex].type === "then") perform();
            }
            // if failure case:
            else {

              // find the next elseif or else
              var idxOfNextElse;

              for (var i = cIndex; i < condArray.length; i++) {
                if (condArray[i].type === "elseif" || condArray[i].type === "else") {
                  idxOfNextElse = i;
                  break;
                }
              }

              if (idxOfNextElse) {
                cIndex = idxOfNextElse;
                perform();
              }

            }

          })
        }
        else if (currentCondition.type === "then" || currentCondition.type === "else") {
          currentCondition.execute(browser);
        }

      })();

    });

    return browser;

  };

};