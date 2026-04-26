import { ENDPOINT } from "./endpoint.js";

const SESSION_KEY = "__kilog_session";

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
    var orig = window.__kilogOriginalFetch || fetch;
    orig(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events)
    }).catch(function(e) { origError("[kilog] sendEvents failed:", e); });
  }

  function formatArg(v) {
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean" || v == null) return String(v);
    if (v instanceof Error) return v.stack || (v.name + ": " + v.message);
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  function formatArgs(args) {
    return args.map(formatArg).join(" ");
  }

  // Capture a stack trace stripping the wrapper frames. V8/Chromium supports
  // Error.captureStackTrace which takes a "below" function; Firefox/Safari don't.
  // As a portable fallback, we create an Error and slice off a fixed number of
  // leading frames (the wrapper + captureStack itself).
  function captureStack(below) {
    var raw;
    if (Error.captureStackTrace) {
      var target = {};
      Error.captureStackTrace(target, below);
      raw = target.stack || "";
    } else {
      raw = new Error().stack || "";
    }
    // Drop leading non-frame lines (e.g. "Error", "Error: <msg>"). V8 prepends
    // an "Error" header even when no error occurred, which is misleading for
    // non-error logs.
    var lines = raw.split("\\n");
    while (lines.length && !/^\\s*at\\s/.test(lines[0])) lines.shift();
    return lines.join("\\n");
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
    function wrapped() {
      var args = Array.prototype.slice.call(arguments);
      original.apply(console, args);
      var event = makeEvent("console", level, {
        message: formatArgs(args),
        args: args,
        stack: captureStack(wrapped)
      });
      sendEvents([event]);
    }
    return wrapped;
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
  window.__kilogOriginalFetch = originalFetch;
  function wrappedFetch(input, init) {
    var url = typeof input === "string" ? input : (input instanceof Request ? input.url : String(input));
    if (url.indexOf("__kilog") !== -1) {
      return originalFetch.apply(window, arguments);
    }
    var method = (init && init.method) || (input instanceof Request ? input.method : "GET");
    var pathname = "/";
    try { pathname = new URL(url, location.origin).pathname; } catch(e) { origError("[kilog] URL parse failed:", e); }
    var start = performance.now();
    var stack = captureStack(wrappedFetch);
    return originalFetch.apply(window, arguments).then(function(response) {
      var event = makeEvent("network", "info", {
        method: method,
        url: url,
        normalizedPath: pathname,
        status: response.status,
        duration: performance.now() - start,
        failed: false,
        stack: stack
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
        errorMessage: err instanceof Error ? err.message : String(err),
        stack: stack
      });
      sendEvents([event]);
      throw err;
    });
  }
  window.fetch = wrappedFetch;
})();`;
}
