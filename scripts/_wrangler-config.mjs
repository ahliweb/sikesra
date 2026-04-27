import { existsSync, readFileSync } from "node:fs";

export const WRANGLER_CONFIG_PATH = "wrangler.jsonc";

export function stripJsonc(input) {
  let output = "";
  let inString = false;
  let stringQuote = "";
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaping) escaping = false;
      else if (char === "\\") escaping = true;
      else if (char === stringQuote) inString = false;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }

    output += char;
  }

  return output.replace(/,\s*([}\]])/g, "$1");
}

export function parseWranglerConfig(path = WRANGLER_CONFIG_PATH) {
  if (!existsSync(path)) return null;
  return JSON.parse(stripJsonc(readFileSync(path, "utf8")));
}

export function getRequiredWorkerSecrets(wrangler) {
  return Array.isArray(wrangler?.secrets?.required) ? wrangler.secrets.required.filter(Boolean) : [];
}
