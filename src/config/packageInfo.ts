import { createRequire } from "node:module";

type PackageInfo = {
  name: string;
  version: string;
};

const require = createRequire(import.meta.url);
const packageInfo = require("../../package.json") as PackageInfo;

export function packageName(): string {
  return packageInfo.name;
}

export function packageVersion(): string {
  return packageInfo.version;
}
