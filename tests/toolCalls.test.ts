import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runToolLoop } from "../src/agents/toolLoop.js";
import type { AiProvider } from "../src/providers/types.js";
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

  it("continues the conversation after tool results", async () => {
    const requests: string[][] = [];
    const provider: AiProvider = {
      id: "test",
      name: "Test",
      kind: "local",
      isAvailable: () => Promise.resolve(true),
      listModels: () => Promise.resolve([]),
      chat: ({ messages }) => {
        requests.push(messages.map((message) => message.content));

        if (requests.length === 1) {
          return Promise.resolve(
            [
              "Checking.",
              "<longcat_tool_call>Bash",
              "<longcat_arg_key>command</longcat_arg_key>",
              "<longcat_arg_value>npm test</longcat_arg_value>",
              "</longcat_tool_call>"
            ].join("\n")
          );
        }

        return Promise.resolve("Final answer after tool result.");
      }
    };

    const result = await runToolLoop({
      provider,
      model: "test",
      temperature: 0,
      messages: [{ role: "user", content: "Run tests" }],
      cwd: process.cwd(),
      allowCommandExecution: false,
      autoAcceptCommands: false,
      maxToolIterations: 20
    });

    expect(result.finalAnswer).toBe("Final answer after tool result.");
    expect(result.iterations).toBe(1);
    expect(requests).toHaveLength(2);
    expect(requests[1]?.join("\n")).toContain("Tool results were executed");
  });

  it("executes cross-platform read tool calls", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "orc-tools-"));
    await writeFile(join(cwd, "note.txt"), "hello from file\n", "utf8");
    const requests: string[][] = [];
    const provider: AiProvider = {
      id: "test",
      name: "Test",
      kind: "local",
      isAvailable: () => Promise.resolve(true),
      listModels: () => Promise.resolve([]),
      chat: ({ messages }) => {
        requests.push(messages.map((message) => message.content));

        if (requests.length === 1) {
          return Promise.resolve(
            [
              "<longcat_tool_call>Read",
              "<longcat_arg_key>path</longcat_arg_key>",
              "<longcat_arg_value>note.txt</longcat_arg_value>",
              "</longcat_tool_call>"
            ].join("\n")
          );
        }

        return Promise.resolve("Read done.");
      }
    };

    try {
      const result = await runToolLoop({
        provider,
        model: "test",
        temperature: 0,
        messages: [{ role: "user", content: "Read note" }],
        cwd,
        allowCommandExecution: false,
        autoAcceptCommands: false,
        maxToolIterations: 20
      });

      expect(result.finalAnswer).toBe("Read done.");
      expect(requests[1]?.join("\n")).toContain("hello from file");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
