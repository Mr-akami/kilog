/**
 * Build a stack trace for a log event and strip the runtime's wrapper frames.
 *
 * `Error.captureStackTrace(obj, below)` (V8) hides every frame at or above
 * `below`, so passing the wrapper function makes the first visible frame the
 * user's call site.
 *
 * Falls back to `new Error().stack` on non-V8 runtimes and trusts the caller
 * not to surface wrapper frames in user-facing output.
 */
// Any function-like value; V8's Error.captureStackTrace uses this as a "below
// this frame" marker, regardless of its real signature.
type AnyFn = (...args: never[]) => unknown;

export function captureStack(below: AnyFn): string | undefined {
  const target: { stack?: string } = {};
  const capture = (
    Error as unknown as {
      captureStackTrace?: (obj: object, below?: AnyFn) => void;
    }
  ).captureStackTrace;
  if (typeof capture === "function") {
    capture(target, below);
    return target.stack;
  }
  return new Error().stack;
}
