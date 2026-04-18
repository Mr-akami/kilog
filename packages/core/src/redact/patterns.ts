export interface RedactRule {
  name: string;
  valuePattern?: RegExp;
  keyPattern?: RegExp;
  replacement: string;
}

export const DEFAULT_RULES: RedactRule[] = [
  {
    name: "email",
    valuePattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  {
    name: "authorization",
    valuePattern: /Authorization:\s*\S+\s+\S+/gi,
    replacement: "Authorization: [REDACTED]",
  },
  {
    name: "bearer",
    valuePattern: /Bearer\s+\S+/gi,
    replacement: "Bearer [REDACTED]",
  },
  {
    name: "cookie",
    valuePattern: /Cookie:\s*.+/gi,
    replacement: "Cookie: [REDACTED]",
  },
  {
    name: "set-cookie",
    valuePattern: /Set-Cookie:\s*.+/gi,
    replacement: "Set-Cookie: [REDACTED]",
  },
  {
    name: "password",
    keyPattern: /^password$/i,
    replacement: "[REDACTED]",
  },
  {
    name: "apiKey",
    keyPattern: /^(apiKey|api_key)$/i,
    replacement: "[REDACTED]",
  },
  {
    name: "token",
    keyPattern: /^token$/i,
    replacement: "[REDACTED]",
  },
  {
    name: "secret",
    keyPattern: /^secret$/i,
    replacement: "[REDACTED]",
  },
];
