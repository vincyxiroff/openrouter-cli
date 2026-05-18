import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EditPlan } from "../core/types.js";
import { validateFilePath } from "../safety/files.js";
import { isInside } from "../utils/path.js";
import { UserFacingError } from "../utils/errors.js";

export async function applyChanges(cwd: string, plan: EditPlan): Promise<void> {
  for (const change of plan.changes) {
    const validation = validateFilePath(change.path);

    if (!validation.ok) {
      throw new UserFacingError(validation.reason);
    }

    if (!isInside(cwd, change.path)) {
      throw new UserFacingError(`Refusing to write outside project: ${change.path}`);
    }

    const absolute = join(cwd, change.path);

    if (change.type === "delete") {
      await rm(absolute, { force: true });
      continue;
    }

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, change.content, "utf8");
  }
}
