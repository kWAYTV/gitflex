import type { ManifestParser, ParsedDependency } from "../types";

const NEWLINE = /\r?\n/;
const GEM = /^gem\s*\(?\s*["']([^"']+)["']\s*(.*)$/;
const GROUP_BLOCK = /^group\s+(.+?)\s+do\b/;
const OTHER_BLOCK =
  /\bdo(?:\s*\|[^|]*\|)?\s*$|^(?:if|unless|case|begin|while|until)\b/;
const COMMENT = /#.*$/;
const STRING_ARGUMENT = /["']([^"']+)["']/g;
const SYMBOL = /:(\w+)/g;
const INLINE_GROUP = /\bgroups?:\s*(\[[^\]]*\]|:\w+)/;
const VERSION_CONSTRAINT = /^[~<>=!\d]/;
const DEV_GROUPS = new Set(["development", "test"]);

function symbolsIn(text: string): string[] {
  return [...text.matchAll(SYMBOL)].map((match) => match[1] ?? "");
}

function toDependency(
  name: string,
  rest: string,
  enclosingGroups: readonly string[]
): ParsedDependency {
  const inlineGroups = INLINE_GROUP.exec(rest)?.[1];
  const groups = [
    ...enclosingGroups,
    ...(inlineGroups ? symbolsIn(inlineGroups) : []),
  ];
  const constraints = [...rest.matchAll(STRING_ARGUMENT)]
    .map((match) => match[1] ?? "")
    .filter((value) => VERSION_CONSTRAINT.test(value));
  const development =
    groups.length > 0 && groups.every((group) => DEV_GROUPS.has(group));
  return {
    constraint: constraints.length > 0 ? constraints.join(", ") : null,
    direct: true,
    name,
    scope: development ? "development" : "production",
  };
}

/**
 * Gemfiles are Ruby code with no maintained JS parser; this reads the declarative
 * subset (`gem`, `group ... do`) that virtually every Gemfile uses.
 */
export const parseGemfile: ManifestParser = (content) => {
  const dependencies: ParsedDependency[] = [];
  const blocks: string[][] = [];

  for (const rawLine of content.split(NEWLINE)) {
    const line = rawLine.replace(COMMENT, "").trim();
    const group = GROUP_BLOCK.exec(line)?.[1];
    const gem = GEM.exec(line);
    if (group) {
      blocks.push(symbolsIn(group));
    } else if (line === "end") {
      blocks.pop();
    } else if (gem?.[1]) {
      dependencies.push(toDependency(gem[1], gem[2] ?? "", blocks.flat()));
    } else if (OTHER_BLOCK.test(line)) {
      blocks.push([]);
    }
  }
  return dependencies;
};
