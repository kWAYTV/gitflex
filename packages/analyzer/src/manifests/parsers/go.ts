import type {
  DependencyScope,
  ManifestParser,
  ParsedDependency,
} from "../types";

const NEWLINE = /\r?\n/;
const WHITESPACE = /\s+/;
const BLOCK_START = /^(require|tool)\s*\($/;
const SINGLE_DIRECTIVE = /^(require|tool)\s+(.+)$/;

function parseEntry(directive: string, body: string): ParsedDependency | null {
  const commentIndex = body.indexOf("//");
  const comment = commentIndex === -1 ? "" : body.slice(commentIndex + 2);
  const [module, version] = (
    commentIndex === -1 ? body : body.slice(0, commentIndex)
  )
    .trim()
    .split(WHITESPACE);
  if (!module) {
    return null;
  }
  const scope: DependencyScope =
    directive === "tool" ? "development" : "production";
  return {
    constraint: version ?? null,
    direct: !comment.includes("indirect"),
    name: module,
    scope,
  };
}

/** Handles `require`/`tool` directives in both single-line and block form; other directives carry no dependencies. */
export const parseGoMod: ManifestParser = (content) => {
  const dependencies: ParsedDependency[] = [];
  let block: string | null = null;

  for (const rawLine of content.split(NEWLINE)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("//")) {
      continue;
    }
    if (block) {
      if (line === ")") {
        block = null;
        continue;
      }
      const entry = parseEntry(block, line);
      if (entry) {
        dependencies.push(entry);
      }
      continue;
    }
    const blockDirective = BLOCK_START.exec(line)?.[1];
    if (blockDirective) {
      block = blockDirective;
      continue;
    }
    const single = SINGLE_DIRECTIVE.exec(line);
    if (single?.[1] && single[2]) {
      const entry = parseEntry(single[1], single[2]);
      if (entry) {
        dependencies.push(entry);
      }
    }
  }
  return dependencies;
};
