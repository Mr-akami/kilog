import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCachedResolution, setCachedResolution } from "./cache.js";

const FRAME_RE = /^(\s+at .+)\((.+):(\d+):(\d+)\)$/;
const MAPPING_URL_RE = /\/\/[#@]\s*sourceMappingURL=(\S+)\s*$/m;

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

interface SourceMap {
  version: number;
  sources: string[];
  mappings: string;
  file?: string;
}

interface MappedPosition {
  source: string;
  line: number;
  column: number;
}

function decodeVlqSegment(encoded: string): number[] {
  const values: number[] = [];
  let shift = 0;
  let value = 0;

  for (const char of encoded) {
    const digit = BASE64.indexOf(char);
    if (digit === -1) continue;

    const hasContinuation = digit & 32;
    value += (digit & 31) << shift;

    if (hasContinuation) {
      shift += 5;
    } else {
      const isNegative = value & 1;
      const absValue = value >> 1;
      values.push(isNegative ? -absValue : absValue);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

function parseMappings(mappings: string): number[][][] {
  const lines = mappings.split(";");
  return lines.map((line) => {
    if (!line) return [];
    return line.split(",").map(decodeVlqSegment).filter((s) => s.length > 0);
  });
}

function findOriginalPosition(
  sourceMap: SourceMap,
  line: number,
  column: number,
): MappedPosition | null {
  const allLines = parseMappings(sourceMap.mappings);

  // VLQ values are deltas from the previous segment's values
  let absGenCol = 0;
  let absSourceIdx = 0;
  let absOrigLine = 0;
  let absOrigCol = 0;

  let bestMatch: MappedPosition | null = null;

  for (let i = 0; i < allLines.length; i++) {
    const segments = allLines[i];
    absGenCol = 0; // generated column resets per line

    for (const seg of segments) {
      if (seg.length < 4) continue;

      absGenCol += seg[0];
      absSourceIdx += seg[1];
      absOrigLine += seg[2];
      absOrigCol += seg[3];

      if (absSourceIdx < 0 || absSourceIdx >= sourceMap.sources.length) continue;

      if (i === line - 1) {
        if (absGenCol <= column - 1) {
          bestMatch = {
            source: sourceMap.sources[absSourceIdx],
            line: absOrigLine + 1,
            column: absOrigCol + 1,
          };
        }
      } else if (i < line - 1) {
        bestMatch = {
          source: sourceMap.sources[absSourceIdx],
          line: absOrigLine + 1 + (line - 1 - i),
          column: absOrigCol + 1,
        };
      }
    }

    if (i >= line - 1 && bestMatch) break;
  }

  return bestMatch;
}

async function findSourceMapPath(jsPath: string): Promise<string | null> {
  const adjacentMap = jsPath + ".map";
  try {
    await readFile(adjacentMap, "utf-8");
    return adjacentMap;
  } catch {
    // not found
  }

  try {
    const jsContent = await readFile(jsPath, "utf-8");
    const match = jsContent.match(MAPPING_URL_RE);
    if (match) {
      const mapUrl = match[1];
      return path.resolve(path.dirname(jsPath), mapUrl);
    }
  } catch {
    // file not readable
  }

  return null;
}

async function loadSourceMap(mapPath: string): Promise<SourceMap | null> {
  try {
    const content = await readFile(mapPath, "utf-8");
    return JSON.parse(content) as SourceMap;
  } catch {
    return null;
  }
}

export async function resolveStackFrames(
  stack: string,
  cacheDir: string,
): Promise<string> {
  if (stack === "") return "";

  const cached = await getCachedResolution(cacheDir, stack);
  if (cached !== null) return cached;

  const lines = stack.split("\n");
  const resolved: string[] = [];

  for (const line of lines) {
    const match = line.match(FRAME_RE);
    if (!match) {
      resolved.push(line);
      continue;
    }

    const [, prefix, filePath, lineStr, colStr] = match;
    const genLine = parseInt(lineStr, 10);
    const genCol = parseInt(colStr, 10);

    const mapPath = await findSourceMapPath(filePath);
    if (!mapPath) {
      resolved.push(line);
      continue;
    }

    const sourceMap = await loadSourceMap(mapPath);
    if (!sourceMap) {
      resolved.push(line);
      continue;
    }

    const pos = findOriginalPosition(sourceMap, genLine, genCol);
    if (!pos) {
      resolved.push(line);
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), pos.source);
    resolved.push(`${prefix}(${resolvedPath}:${pos.line}:${pos.column})`);
  }

  const result = resolved.join("\n");
  await setCachedResolution(cacheDir, stack, result);
  return result;
}
