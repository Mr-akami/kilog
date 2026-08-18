// CSI (`ESC [ ... letter`) and OSC (`ESC ] ... BEL`) — strip so captured
// strings stay grep/SQL/UI-friendly.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;?]*[@-~]|\u001b\][^\u0007]*\u0007/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}
