/** Linguist types these as "programming", but they describe builds rather than application code. */
const BUILD_LANGUAGES: ReadonlySet<string> = new Set([
  "batchfile",
  "cmake",
  "dockerfile",
  "just",
  "makefile",
  "meson",
  "nix",
  "starlark",
  "xmake",
]);

/** Languages whose compilers enforce static types, so a repository needs no extra type checker. */
const STATICALLY_TYPED_LANGUAGES: ReadonlySet<string> = new Set([
  "c",
  "c#",
  "c++",
  "crystal",
  "d",
  "dart",
  "elm",
  "f#",
  "go",
  "haskell",
  "java",
  "kotlin",
  "nim",
  "objective-c",
  "ocaml",
  "rust",
  "scala",
  "swift",
  "typescript",
  "zig",
]);

/** Languages whose standard toolchain ships a canonical formatter (`gofmt`, `rustfmt`, `dart format`). */
const TOOLCHAIN_FORMATTED_LANGUAGES: ReadonlySet<string> = new Set([
  "dart",
  "go",
  "rust",
  "zig",
]);

/** A language ID is the lowercased Linguist name, e.g. `typescript` or `c#`. */
export function isApplicationLanguage(language: {
  id: string;
  type: string;
}): boolean {
  return language.type === "programming" && !BUILD_LANGUAGES.has(language.id);
}

export function isStaticallyTyped(languageId: string): boolean {
  return STATICALLY_TYPED_LANGUAGES.has(languageId);
}

export function hasToolchainFormatter(languageId: string): boolean {
  return TOOLCHAIN_FORMATTED_LANGUAGES.has(languageId);
}
