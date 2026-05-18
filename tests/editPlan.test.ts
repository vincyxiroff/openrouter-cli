import { describe, expect, it } from "vitest";
import { parseEditPlan } from "../src/filesystem/editPlan.js";

describe("parseEditPlan", () => {
  it("accepts a valid plan", () => {
    const plan = parseEditPlan({
      summary: "Create file",
      reasoning: "Requested by user",
      changes: [{ type: "create", path: "src/a.ts", content: "export {};\n" }],
      commands: ["npm test"]
    });

    expect(plan.changes).toHaveLength(1);
  });
});
