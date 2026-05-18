export type ParsedToolCall = {
  name: string;
  input: Record<string, string>;
};

const toolCallPattern = /<longcat_tool_call>([\s\S]*?)<\/longcat_tool_call>/g;
const argumentPattern =
  /<longcat_arg_key>([\s\S]*?)<\/longcat_arg_key>\s*<longcat_arg_value>([\s\S]*?)<\/longcat_arg_value>/g;

export function parseLongcatToolCalls(content: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];

  for (const match of content.matchAll(toolCallPattern)) {
    const body = match[1] ?? "";
    const lines = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const name = lines.find((line) => !line.startsWith("<")) ?? "tool";
    const input: Record<string, string> = {};

    for (const argument of body.matchAll(argumentPattern)) {
      const key = decodeXml(argument[1] ?? "").trim();
      const value = decodeXml(argument[2] ?? "").trim();

      if (key) {
        input[key] = value;
      }
    }

    calls.push({ name, input });
  }

  return calls;
}

export function stripLongcatToolCalls(content: string): string {
  return content.replace(toolCallPattern, "").trim();
}

export function isShellToolCall(call: ParsedToolCall): boolean {
  return ["bash", "shell", "terminal", "command"].includes(call.name.trim().toLowerCase());
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
