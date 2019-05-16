const TIMEOUT = 1000;

module.exports.bindDriver = function(browser) {

  var oldUrl = browser.url;
  var oldBack = browser.back;
  var oldForward = browser.forward;
  var oldRefresh = browser.refresh;
  var POLLING_RATE = 1000;

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

  function stringFormat(string) {
    var replacers = Array.prototype.slice.call(arguments, 1);

    replacers.forEach((replacer) => {
      string = string.replace("%s", replacer);
    });

    return string;

  };

  function comment(description) {
    if (description) {
      console.log(description);
    }
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

  browser.using = (testVars) => {
    browser.vars = testVars;
    return browser;
  };

  browser.endComponent = () => {
    browser.perform(() => {
      browser.compVarStack.pop();
    });

    return browser;
  };

  browser.snapActions = {
    "loadPage": (args) => {

      var { url, width, height, description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(renderWithVars(description, getVars(browser))));

      browser.perform(() => {

        var renderedUrl = renderWithVars(url, getVars(browser));

        oldUrl(renderedUrl);
        browser.resizeWindow(width, height);

        if (cb) cb(true);

      });

      return browser;
    },

    "back": (args) => {

      const { description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));
      browser.perform(() => {
        browser.pause(5);
        oldBack();
        if (cb) cb(true);
      });

      return browser;

    },

    "elementPresent": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var techDescription = stringFormat("(Element exists' at '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("'%s' - Couldn't find element. %s", description, techDescription));
        }, () => {
          browser.assert.ok(true, stringFormat("'%s' - %s", description, techDescription));
          if (cb) cb(true);
        });

      });

      return browser;

    },

    "refresh": (args) => {

      var { description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));
      browser.perform(() => {
        oldRefresh();
        if (cb) cb(true);
      });

      return browser;
    },

    "forward": (args) => {

      var { description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));

      browser.perform(() => {
        oldForward();
        if (cb) cb(true);
      });

      return browser;

    },

    "clearCaches": (args) => {

      var { localstorage, sessionstorage, description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));
      browser.perform(() => {

        browser.deleteCookies();

        browser.execute(prepStringFuncForExecute(`function(localstorage, sessionstorage) {
          if (localstorage && window.localStorage) {
            window.localStorage.clear();
          }
        
          if (sessionstorage && window.sessionStorage) {
            window.sessionStorage.clear();
          }
        }`), [localstorage, sessionstorage], () => {
          browser.assert.ok(true, description);
          if (cb) cb(true);
        });

      });

      return browser;

    },

    "pathIs": (args) => {

      var { value, description, regex = false, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var pathname = renderWithVars(value, getVars(browser));
        if (regex) pathname = new RegExp(pathname, "g");
        var techDescription = stringFormat(" (Path matches '%s')", pathname);
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
              browser.assert.ok(true, description + techDescription)
              if (cb) cb(true);
            } else if(currentAttempt === attempts) {
              if (cb) return cb(false);
              if (optional) return browser.assert.ok(true, "OPTIONAL FAILED: " + description + techDescription);
              browser.assert.ok(false, description + techDescription)
            } else {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkForPageLoadWithPathname(pathname);
            }
          });
        }

        checkForPageLoadWithPathname(pathname);

        browser.execute(prepStringFuncForExecute(`function() {
          window.alert = function() {};
          window.confirm = function() {
            return true;
          };
        }`), []);
      });

      return browser;

    },

    "executeScript": (args) => {

      var { value, description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));
      browser.perform(() => {

        var script = renderWithVars(value, getVars(browser));

        browser.execute(script, [], function(result) {
          if (result) {
            browser.assert.ok(result, description)
          }

          if (cb) cb(true);

        });
      });

      return browser;
    },

    "switchToWindow": (args) => {

      var { windowIndex, description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));

      browser.perform(() => {
        browser.windowHandles(function(result) {
          browser.switchWindow(result.value[windowIndex]);
          if (cb) cb(true);
        });
      });

      return browser;
    },

    "scrollWindow": (args) => {

      var { x, y, description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));

      browser.perform(() => {
        browser.execute(prepStringFuncForExecute(`function(x, y) {
          window.scrollTo(x, y);
        }`), [x, y], function(result) {
          if (cb) cb(true);
        });
      });

      return browser;
    },

    "scrollElement": (args) => {

      var { selector, selectorType = "CSS", x, y, description, cb, optional = false, timeout } = args;

      browser.perform(() => {
        var techDescription = stringFormat("(Scrolling element at '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType, x, y) {
    
          ${snptGetElement}
    
          (function(el, x, y) {
            el.scrollLeft = x;
            el.scrollTop = y;
          })(snptGetElement(selector, selectorType), x, y);
        }`), [selector, selectorType, x, y], (result) => {
          if (cb) cb(true);
        });
      });

      return browser;
    },

    "scrollWindowToElement": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout } = args;

      browser.perform(() => {
        var techDescription = stringFormat("(Scrolling window to el '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType, value) {
    
          ${snptGetElement}
    
          (function(el) {
            if (el) {
              var elsScrollY = el.getBoundingClientRect().top + window.scrollY - el.offsetHeight;
              window.scrollTo(0, elsScrollY);
            }
          })(snptGetElement(selector, selectorType), value);
        }`), [selector, selectorType], (result) => {
          if (cb) cb(true);
        });
      });

      return browser;
    },

    "click": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var techDescription = stringFormat("(Click '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element to click. %s", description, techDescription));
        });

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
          ${snptGetElement}
    
          (function(element) {
    
            function triggerMouseEvent(node, eventType) {
              var clickEvent = document.createEvent('MouseEvents');
              clickEvent.initEvent(eventType, true, true);
              node.dispatchEvent(clickEvent);
            }
    
            triggerMouseEvent(element, "mouseover");
            triggerMouseEvent(element, "mousedown");
            triggerMouseEvent(element, "mouseup");
            triggerMouseEvent(element, "click");
    
          })(snptGetElement(selector, selectorType));
    
        }`), [selector, selectorType], function(result) {
          if (result.state === "success") {
            browser.assert.ok(description + "; " + techDescription);
          }

          if (cb) cb(true);

        });

      });

      return browser;

    },

    "changeInput": (args) => {

      var { selector, selectorType = "CSS", value, description, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var renderedValue = renderWithVars(value, getVars(browser));
        var techDescription = stringFormat("(Change input '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType, value) {
    
          ${snptGetElement}
    
          (function(el) {
            function triggerKeyEvent(node, eventType) {
              var keydownEvent = document.createEvent( 'KeyboardEvent' );
              keydownEvent.initEvent( eventType, true, false, null, 0, false, 0, false, 66, 0 );
              node.dispatchEvent( keydownEvent );
            }
    
            if (el) {
              triggerKeyEvent(el, "keydown");
              el.focus();
              var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
              nativeInputValueSetter.call(el, value);
              el.dispatchEvent(new Event('change', {bubbles: true}));
              el.dispatchEvent(new Event('input', {bubbles: true}));
              triggerKeyEvent(el, "keyup");
              triggerKeyEvent(el, "keypress");
            }
          })(snptGetElement(selector, selectorType), value);
    
        }`), [selector, selectorType, renderedValue], function(result) {
          if (result.state === "success") {
            browser.assert.ok(description + "; " + techDescription);
          }
          if (cb) cb(true);
        });

      });

      return browser;

    },

    "elStyleIs": (args) => {

      var { selector, selectorType = "CSS", style, value, description, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var techDescription = stringFormat("(Style is '%s' at '%s' using '%s')", value, selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
        var currentAttempt = 0;

        function checkforStyle(selector, selectorType, style, value) {
          browser.execute(prepStringFuncForExecute(`function(selector, selectorType, style) {
          ${snptGetElement}
          var el = snptGetElement(selector, selectorType);
          return window.getComputedStyle(el, null).getPropertyValue(style);
        }`), [selector, selectorType, style], function(result) {
            if (value instanceof RegExp ? value.test(result.value) : value === result.value) {
              browser.assert.ok(true, description + techDescription)
              if (cb) cb(true);
            } else if (currentAttempt === attempts) {
              if (cb) return cb(false);
              browser.assert.ok(false, description + techDescription)
            } else {
              currentAttempt++;
              console.log("Attempt %s: Actual %s, Expected %s", currentAttempt, result.value, value)
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

      var { selector, selectorType = "CSS", value, regex = false, description, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var renderedValue = renderWithVars(value, getVars(browser));
        if (regex) renderedValue = new RegExp(renderedValue, "g");
        var techDescription = stringFormat("(Assert value '%s' at '%s' using '%s')", renderedValue, selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          if (optional) return browser.assert.ok(true, stringFormat("OPTIONAL FAILED: '%s' - Couldn't find element. %s", description, techDescription));
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
        var currentAttempt = 0;

        function checkforValue(selector, selectorType, value) {
          browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
          ${snptGetElement}
  
          var el = snptGetElement(selector, selectorType);
  
          if (el) {
            if (el.type === 'checkbox' || el.type === 'radio') {
              return el.checked ? "true" : "false";
            } else {
              return el.value;
            }
          } else return null;
        }`), [selector, selectorType], function(result) {
            if (value instanceof RegExp ? value.test(result.value) : value === result.value) {
              browser.assert.ok(true, description)
              if (cb) cb(true);
            } else if(currentAttempt === attempts) {
              if (cb) return cb(false);
              if (optional) return browser.assert.ok(true, stringFormat("OPTIONAL FAILED: '%s' - Couldn't find element. %s", description, techDescription));
              browser.assert.ok(false, description)
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

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));

      browser.perform(() => {
        browser.waitForElementNotPresent(selector, timeout || TIMEOUT);
        if (cb) cb(true);
      });

      return browser;
    },

    "focusOnEl": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var techDescription = stringFormat("(Focus on element with '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
    
          ${snptGetElement}
    
          (function(el) {
            var event = new FocusEvent('focus');
            el.dispatchEvent(event);
          })(snptGetElement(selector, selectorType));
        }`), [selector, selectorType], function(result) {
          if (result.state === "success") {
            browser.assert.ok(description + "; " + techDescription);
          }

          if (cb) cb(true);
        });
      });

      return browser;
    },

    "formSubmit": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout } = args;

      browser.perform(() => {
        var techDescription = stringFormat("(Form Submit at '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
          ${snptGetElement}
    
          (function(el) {
            var event = new Event('submit');
            el.dispatchEvent(event);
          })(snptGetElement(selector, selectorType));
    
        }`), [selector, selectorType], function(result) {
          if (result.state === "success") {
            browser.assert.ok(description + "; " + techDescription);
          }
          if (cb) cb(true);
        });
      });

      return browser;
    },

    "blurOffEl": (args) => {

      var { selector, selectorType = "CSS", description, cb, optional = false, timeout } = args;

      browser.perform(() => {
        var techDescription = stringFormat("(blur '%s' using '%s')", selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          browser.assert.ok(false, stringFormat("FAILED: '%s' - Couldn't find element. %s", description, techDescription));
        });

        browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
    
          ${snptGetElement}
    
          (function(el) {
            var event = new FocusEvent('blur');
            el.dispatchEvent(event);
          })(snptGetElement(selector, selectorType));
    
        }`), [selector, selectorType], function(result) {
          if (result.state === "success") {
            browser.assert.ok(description + "; " + techDescription);
          }
          if (cb) cb(true);
        });
      });

      return browser;
    },

    "elTextIs": (args) => {

      var { selector, selectorType = "CSS", value, regex = false, description, cb, optional = false, timeout } = args;

      browser.perform(() => {

        var assertText = renderWithVars(value, getVars(browser));
        if (regex) assertText = new RegExp(assertText, "g");
        var techDescription = stringFormat("(Assert text matches '%s' at '%s' using '%s')", assertText.toString(), selector, selectorType);

        browser._elementPresent(selector, selectorType, null, timeout, () => {
          if (cb) return cb(false);
          if (optional) return browser.assert.ok(true, stringFormat("OPTIONAL FAILED: '%s' - Couldn't find element. %s", description, techDescription));
          browser.assert.ok(false, stringFormat("Optional Fail: '%s' - Couldn't find element. %s", description, techDescription));
        });

        var attempts = parseInt((timeout || TIMEOUT) / POLLING_RATE);
        var currentAttempt = 0;

        function checkforText(selector, selectorType, assertText) {
          browser._getElText(selector, selectorType,  function(elsText) {
            if (assertText instanceof RegExp ? assertText.test(elsText) : assertText === elsText) {
              browser.assert.ok(true, description)
              if (cb) cb(true);
            } else if(currentAttempt === attempts) {
              if (cb) return cb(false);
              if (optional) return browser.assert.ok(true, stringFormat("OPTIONAL FAILED: '%s' - Couldn't find element. %s", description, techDescription));
              browser.assert.ok(false, stringFormat("Optional Fail: '%s' - Couldn't find element. %s", description, techDescription));
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

      var { value, description, cb, optional = false, timeout } = args;

      browser.perform(() => comment(description));

      browser.perform(() => {

        var variables = browser.vars.getAllObject();
        var renderedValue = renderWithVars(value, browser.vars.getAll());

        // check for a successful browser execute.
        browser.execute(prepStringFuncForExecute(`function(value, variables) {
          try {
            var vars = variables;
            var success = eval(value)
            return {success: success, vars: vars};
          } catch(e) {
            return {success: false, vars: vars};
          }
        }`), [renderedValue, variables], function(result) {

          // find any new or updated variables...
          browser.vars.updateAll(result.value.vars);
          browser.assert.ok(result.value.success, description);

          if (cb) cb(true);

        });
      });

      return browser;
    },

    "_getElText": (selector, selectorType = "CSS", onSuccess = noop) => {

      browser.execute(prepStringFuncForExecute(`function(selector, selectorType) {
  
      ${snptGetElement}
  
      return (function(element) {
        if (!element) return null;
        var text = "";
        for (var i = 0; i < element.childNodes.length; ++i)
          if (element.childNodes[i].nodeType === 3)
            if (element.childNodes[i].textContent)
              text += element.childNodes[i].textContent;
        text = text.replace(/(\\r\\n|\\n|\\r)/gm, "");
        return text.trim();
      })(snptGetElement(selector, selectorType));
    }`), [selector, selectorType], function(result) {
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
            return !!snptGetElement(selector, selectorType);
          }`), [selector, selectorType], function(result) {

            if (!result.value && currentAttempt < attempts) {
              currentAttempt++;
              browser.pause(POLLING_RATE);
              checkforEl(selector);
            } else if (!result.value) {
              onFail();
            } else {
              onSuccess();
            }

          });
      }

      checkforEl(selector);

      return browser;

    }

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

  browser.else = (cb) => {
    return () => ({
      type: "else",
      execute: (b) => {
        cb(b)
      }
    })
  };

  /* ***************************************************************************************

    Conditional flow control:
      Example:

     .flow(
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

  browser.flow = function(...condArray) {

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