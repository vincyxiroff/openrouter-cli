import { describe, expect, it } from "vitest";
import {
  isShellToolCall,
  parseLongcatToolCalls,
  stripLongcatToolCalls
} from "../src/tools/toolCalls.js";

describe("tool calls", () => {
  it("parses longcat shell tool calls", () => {
    const content = [
      "Creo una cartella.",
      "<longcat_tool_call>Bash",
      "<longcat_arg_key>command</longcat_arg_key>",
      "<longcat_arg_value>mkdir prova</longcat_arg_value>",
      "<longcat_arg_key>description</longcat_arg_key>",
      "<longcat_arg_value>Create folder</longcat_arg_value>",
      "</longcat_tool_call>"
    ].join("\n");

    const calls = parseLongcatToolCalls(content);

    expect(calls).toEqual([
      {
        name: "Bash",
        input: {
          command: "mkdir prova",
          description: "Create folder"
        }
      }
    ]);
    expect(isShellToolCall(calls[0])).toBe(true);
  });

  it("strips longcat tool calls from display text", () => {
    const content = "Prima<longcat_tool_call>Bash</longcat_tool_call>Dopo";

    expect(stripLongcatToolCalls(content)).toBe("PrimaDopo");
  });
});
