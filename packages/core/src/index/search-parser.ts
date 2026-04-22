export interface SearchTerm {
  text: string;
  negate: boolean;
}

export type SearchExpr = SearchTerm[][];

export class SearchParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchParseError";
  }
}

const ESCAPES = ["\\AND", "\\OR", "\\NOT", "\\\\"] as const;

function matchEscape(input: string, i: number): string | null {
  for (const esc of ESCAPES) {
    if (input.startsWith(esc, i)) return esc;
  }
  return null;
}

function splitOn(input: string, sep: string): string[] {
  const parts: string[] = [];
  let current = "";
  let i = 0;
  while (i < input.length) {
    if (input[i] === "\\") {
      const esc = matchEscape(input, i);
      if (esc) {
        current += esc;
        i += esc.length;
        continue;
      }
      current += input[i];
      i++;
      continue;
    }
    if (input.startsWith(sep, i)) {
      parts.push(current);
      current = "";
      i += sep.length;
      continue;
    }
    current += input[i];
    i++;
  }
  parts.push(current);
  return parts;
}

function unescape(input: string): string {
  let result = "";
  let i = 0;
  while (i < input.length) {
    if (input[i] === "\\") {
      const rest = input.substring(i);
      if (rest.startsWith("\\AND")) {
        result += "AND";
        i += 4;
        continue;
      }
      if (rest.startsWith("\\NOT")) {
        result += "NOT";
        i += 4;
        continue;
      }
      if (rest.startsWith("\\OR")) {
        result += "OR";
        i += 3;
        continue;
      }
      if (rest.startsWith("\\\\")) {
        result += "\\";
        i += 2;
        continue;
      }
      result += input[i];
      i++;
      continue;
    }
    result += input[i];
    i++;
  }
  return result;
}

function maskEscapes(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\") {
      const esc = matchEscape(s, i);
      if (esc) {
        out += "\0".repeat(esc.length);
        i += esc.length;
        continue;
      }
    }
    out += s[i];
    i++;
  }
  return out;
}

function validateRawTerm(trimmedTerm: string, input: string): void {
  const masked = maskEscapes(trimmedTerm);
  if (/^(AND|OR)(\s|$)/.test(masked)) {
    throw new SearchParseError(`misplaced operator in search: "${input}"`);
  }
  if (/(^|\s)(AND|OR|NOT)$/.test(masked)) {
    throw new SearchParseError(`trailing operator in search: "${input}"`);
  }
}

export function parseSearch(input: string): SearchExpr {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const orGroups = splitOn(trimmed, " OR ");
  const result: SearchExpr = [];

  for (const group of orGroups) {
    const andTerms = splitOn(group, " AND ");
    const parsedTerms: SearchTerm[] = [];

    for (const rawTerm of andTerms) {
      const trimmedTerm = rawTerm.trim();
      if (!trimmedTerm) {
        throw new SearchParseError(`empty term in search: "${input}"`);
      }
      validateRawTerm(trimmedTerm, input);

      let working = trimmedTerm;
      let negate = false;
      if (working.startsWith("NOT ")) {
        negate = true;
        working = working.substring(4).trim();
        if (!working) {
          throw new SearchParseError(`NOT requires a term: "${input}"`);
        }
        validateRawTerm(working, input);
      }

      const text = unescape(working);
      if (!text) {
        throw new SearchParseError(`empty term after unescape: "${input}"`);
      }
      parsedTerms.push({ text, negate });
    }

    result.push(parsedTerms);
  }

  return result;
}

export function escapeIlikePattern(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch === "\\" || ch === "%" || ch === "_") {
      out += "\\" + ch;
    } else {
      out += ch;
    }
  }
  return out;
}
