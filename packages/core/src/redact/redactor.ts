import type { LogEvent } from "../schema/types.js";
import type { RedactRule } from "./patterns.js";
import { DEFAULT_RULES } from "./patterns.js";

export interface RedactorConfig {
  rules?: RedactRule[];
  disableDefaults?: boolean;
}

function deepRedact(value: unknown, rules: RedactRule[], key?: string): unknown {
  // Check keyPattern rules first
  if (key != null) {
    for (const rule of rules) {
      if (rule.keyPattern && rule.keyPattern.test(key)) {
        return rule.replacement;
      }
    }
  }

  if (typeof value === "string") {
    let result = value;
    for (const rule of rules) {
      if (rule.valuePattern) {
        // Reset lastIndex for global regexps
        rule.valuePattern.lastIndex = 0;
        result = result.replace(rule.valuePattern, rule.replacement);
      }
    }
    return result;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepRedact(item, rules));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = deepRedact(v, rules, k);
    }
    return result;
  }

  return value;
}

export function createRedactor(config?: RedactorConfig): (event: LogEvent) => LogEvent {
  const rules: RedactRule[] = [];
  if (!config?.disableDefaults) {
    rules.push(...DEFAULT_RULES);
  }
  if (config?.rules) {
    rules.push(...config.rules);
  }

  return (event: LogEvent): LogEvent => {
    return deepRedact(event, rules) as LogEvent;
  };
}
