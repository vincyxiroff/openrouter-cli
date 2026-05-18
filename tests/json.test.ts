import { describe, expect, it } from "vitest";
import { extractJsonObject } from "../src/utils/json.js";

describe("extractJsonObject", () => {
  it("extracts JSON from text", () => {
    expect(extractJsonObject('text {"summary":"ok"} trailing')).toEqual({ summary: "ok" });
  });

  it("extracts fenced JSON", () => {
    expect(extractJsonObject('```json\n{"summary":"ok"}\n```')).toEqual({ summary: "ok" });
  });
});
