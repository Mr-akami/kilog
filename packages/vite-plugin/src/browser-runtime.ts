import { ENDPOINT } from "./constants.js";

const SESSION_KEY = "__logit_session";

export function generateBrowserRuntime(): string {
  return `(function() {
  var SESSION_KEY = "${SESSION_KEY}";
  var ENDPOINT = "${ENDPOINT}";

  var session = sessionStorage.getItem(SESSION_KEY);
  if (!session) {
    session = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, session);
  }

  function sendEvents(events) {
    var orig = window.__logitOriginalFetch || fetch;
    orig(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events)
    }).catch(function(e) { origError("[logit] sendEvents failed:", e); });
  }

  function makeEvent(type, level, extra) {
    var event = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      runtime: "browser",
      session: session,
      type: type,
      level: level
    };
    for (var k in extra) { event[k] = extra[k]; }
    return event;
  }

  function wrapConsole(original, level) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      original.apply(console, args);
      var event = makeEvent("console", level, {
        message: args.map(String).join(" "),
        args: args
      });
      sendEvents([event]);
    };
  }
  var origLog = console.log;
  var origInfo = console.info;
  var origWarn = console.warn;
  var origError = console.error;
  var origDebug = console.debug;
  console.log = wrapConsole(origLog, "info");
  console.info = wrapConsole(origInfo, "info");
  console.warn = wrapConsole(origWarn, "warn");
  console.error = wrapConsole(origError, "error");
  console.debug = wrapConsole(origDebug, "debug");

  window.onerror = function(message, source, lineno, colno, error) {
    var event = makeEvent("error", "error", {
      message: String(message),
      name: error ? error.name : "Error",
      stack: error ? error.stack : undefined
    });
    sendEvents([event]);
  };

  window.onunhandledrejection = function(e) {
    var reason = e.reason;
    var isError = reason instanceof Error;
    var event = makeEvent("unhandled-rejection", "error", {
      message: isError ? reason.message : String(reason),
      name: isError ? reason.name : undefined,
      stack: isError ? reason.stack : undefined
    });
    sendEvents([event]);
  };

  var originalFetch = window.fetch;
  window.__logitOriginalFetch = originalFetch;
  window.fetch = function(input, init) {
    var url = typeof input === "string" ? input : (input instanceof Request ? input.url : String(input));
    if (url.includes("__logit")) {
      return originalFetch.apply(window, arguments);
    }
    var method = (init && init.method) || (input instanceof Request ? input.method : "GET");
    var pathname = "/";
    try { pathname = new URL(url, location.origin).pathname; } catch(e) { origError("[logit] URL parse failed:", e); }
    var start = performance.now();
    return originalFetch.apply(window, arguments).then(function(response) {
      var event = makeEvent("network", "info", {
        method: method,
        url: url,
        normalizedPath: pathname,
        status: response.status,
        duration: performance.now() - start,
        failed: false
      });
      sendEvents([event]);
      return response;
    }).catch(function(err) {
      var event = makeEvent("network", "info", {
        method: method,
        url: url,
        normalizedPath: pathname,
        duration: performance.now() - start,
        failed: true,
        errorMessage: err instanceof Error ? err.message : String(err)
      });
      sendEvents([event]);
      throw err;
    });
  };
})();`;
}
