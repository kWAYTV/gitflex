export type ExclusionReason =
  | "excluded-directory"
  | "binary"
  | "minified"
  | "generated";

/** Directory names never analyzed at any depth: dependencies, build outputs, caches and VCS internals. */
export const EXCLUDED_DIRECTORIES: ReadonlySet<string> = new Set([
  ".cache",
  ".dart_tool",
  ".git",
  ".gradle",
  ".mypy_cache",
  ".next",
  ".nuxt",
  ".output",
  ".parcel-cache",
  ".pytest_cache",
  ".ruff_cache",
  ".svelte-kit",
  ".terraform",
  ".tox",
  ".turbo",
  ".venv",
  ".vercel",
  ".yarn",
  "__generated__",
  "__pycache__",
  "bin",
  "bower_components",
  "build",
  "coverage",
  "DerivedData",
  "dist",
  "generated",
  "jspm_packages",
  "node_modules",
  "obj",
  "out",
  "Pods",
  "site-packages",
  "target",
  "third_party",
  "vendor",
  "venv",
]);

export const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  "7z",
  "a",
  "apk",
  "avi",
  "avif",
  "bin",
  "bmp",
  "class",
  "dat",
  "db",
  "dll",
  "dmg",
  "dylib",
  "eot",
  "exe",
  "flac",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "o",
  "ogg",
  "otf",
  "pdb",
  "pdf",
  "png",
  "psd",
  "pyc",
  "rar",
  "so",
  "sqlite",
  "tar",
  "tgz",
  "ttf",
  "wasm",
  "wav",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xz",
  "zip",
]);

const MINIFIED = /\.min\.(?:js|mjs|cjs|css)$|\.(?:js|css)\.map$/i;
const GENERATED =
  /\.generated\.\w+$|\.g\.cs$|\.designer\.cs$|\.pb\.go$|_pb2(?:_grpc)?\.pyi?$|\.pb\.(?:h|cc)$/i;

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** Returns why a path is excluded from analysis, or `null` when it should be analyzed. */
export function classifyPath(path: string): ExclusionReason | null {
  const segments = path.split("/");
  const fileName = segments.at(-1) ?? "";

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (EXCLUDED_DIRECTORIES.has(segments[index] ?? "")) {
      return "excluded-directory";
    }
  }
  if (BINARY_EXTENSIONS.has(extensionOf(fileName))) {
    return "binary";
  }
  if (MINIFIED.test(fileName)) {
    return "minified";
  }
  if (GENERATED.test(fileName)) {
    return "generated";
  }
  return null;
}
