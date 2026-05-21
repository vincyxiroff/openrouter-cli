import { describe, expect, it } from "vitest";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runToolLoop } from "../src/agents/toolLoop.js";
import type { AiProvider } from "../src/providers/types.js";
import {
  isShellToolCall,
  parseLongcatToolCalls,
  stripLongcatToolCalls
} from "../src/tools/toolCalls.js";
import { TrustManager } from "../src/trust/manager/trustManager.js";

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

  it("parses escaped html write content without trimming it", () => {
    const content = [
      "<longcat_tool_call>Write",
      "<longcat_arg_key>path</longcat_arg_key>",
      "<longcat_arg_value>index.html</longcat_arg_value>",
      "<longcat_arg_key>content</longcat_arg_key>",
      "<longcat_arg_value>",
      "&lt;!DOCTYPE html&gt;",
      "&lt;html lang=&quot;en&quot;&gt;",
      "&lt;body&gt;Tom &amp; Jerry&lt;/body&gt;",
      "&lt;/html&gt;",
      "",
      "</longcat_arg_value>",
      "</longcat_tool_call>"
    ].join("\n");

    const calls = parseLongcatToolCalls(content);

    expect(calls).toEqual([
      {
        name: "Write",
        input: {
          path: "index.html",
          content: '\n<!DOCTYPE html>\n<html lang="en">\n<body>Tom & Jerry</body>\n</html>\n\n'
        }
      }
    ]);
  });

  it("recovers a trailing longcat tool call when only the tool close tag is missing", () => {
    const content = [
      "<longcat_tool_call>Write",
      "<longcat_arg_key>path</longcat_arg_key>",
      "<longcat_arg_value>index.html</longcat_arg_value>",
      "<longcat_arg_key>content</longcat_arg_key>",
      "<longcat_arg_value>Hello</longcat_arg_value>"
    ].join("\n");

    expect(parseLongcatToolCalls(content)).toEqual([
      {
        name: "Write",
        input: {
          path: "index.html",
          content: "Hello"
        }
      }
    ]);
  });

  it("strips malformed trailing longcat tool calls from display text", () => {
    const content = "Prima\n<longcat_tool_call>Write\n<longcat_arg_key>content";

    expect(stripLongcatToolCalls(content)).toBe("Prima");
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

  it("executes cross-platform edit tool calls", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "orc-tools-edit-"));
    const previousAppData = process.env.APPDATA;
    const appData = await mkdtemp(join(tmpdir(), "orc-appdata-"));
    process.env.APPDATA = appData;
    await writeFile(join(cwd, "note.txt"), "hello from file\n", "utf8");
    await new TrustManager().trustProject(cwd);
    const provider: AiProvider = {
      id: "test",
      name: "Test",
      kind: "local",
      isAvailable: () => Promise.resolve(true),
      listModels: () => Promise.resolve([]),
      chat: ({ messages }) => {
        if (messages.length === 1) {
          return Promise.resolve(
            [
              "<longcat_tool_call>Edit",
              "<longcat_arg_key>path</longcat_arg_key>",
              "<longcat_arg_value>note.txt</longcat_arg_value>",
              "<longcat_arg_key>old</longcat_arg_key>",
              "<longcat_arg_value>hello</longcat_arg_value>",
              "<longcat_arg_key>new</longcat_arg_key>",
              "<longcat_arg_value>ciao</longcat_arg_value>",
              "</longcat_tool_call>"
            ].join("\n")
          );
        }

        return Promise.resolve("Edit done.");
      }
    };

    try {
      const result = await runToolLoop({
        provider,
        model: "test",
        temperature: 0,
        messages: [{ role: "user", content: "Edit note" }],
        cwd,
        allowCommandExecution: false,
        autoAcceptFileWrites: true,
        autoAcceptCommands: false,
        maxToolIterations: 20
      });

      expect(result.finalAnswer).toBe("Edit done.");
      await expect(readFile(join(cwd, "note.txt"), "utf8")).resolves.toBe("ciao from file\n");
    } finally {
      process.env.APPDATA = previousAppData;
      await rm(appData, { recursive: true, force: true });
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("executes cross-platform delete tool calls", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "orc-tools-delete-"));
    const previousAppData = process.env.APPDATA;
    const appData = await mkdtemp(join(tmpdir(), "orc-appdata-"));
    process.env.APPDATA = appData;
    await writeFile(join(cwd, "old.txt"), "remove me\n", "utf8");
    await new TrustManager().trustProject(cwd);
    const provider: AiProvider = {
      id: "test",
      name: "Test",
      kind: "local",
      isAvailable: () => Promise.resolve(true),
      listModels: () => Promise.resolve([]),
      chat: ({ messages }) => {
        if (messages.length === 1) {
          return Promise.resolve(
            [
              "<longcat_tool_call>Delete",
              "<longcat_arg_key>path</longcat_arg_key>",
              "<longcat_arg_value>old.txt</longcat_arg_value>",
              "</longcat_tool_call>"
            ].join("\n")
          );
        }

        return Promise.resolve("Delete done.");
      }
    };

    try {
      const result = await runToolLoop({
        provider,
        model: "test",
        temperature: 0,
        messages: [{ role: "user", content: "Delete old file" }],
        cwd,
        allowCommandExecution: false,
        autoAcceptFileWrites: true,
        autoAcceptCommands: false,
        maxToolIterations: 20
      });

      expect(result.finalAnswer).toBe("Delete done.");
      await expect(access(join(cwd, "old.txt"))).rejects.toThrow();
    } finally {
      process.env.APPDATA = previousAppData;
      await rm(appData, { recursive: true, force: true });
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
