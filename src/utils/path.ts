import { relative, resolve } from "node:path";

export function toPosixPath(path: string): string {
  return path.replaceAll("\\", "/");
}

export function isInside(root: string, path: string): boolean {
  const relativePath = relative(resolve(root), resolve(root, path));
  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.includes(":"));
}
