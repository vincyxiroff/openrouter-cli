export type ParsedToolCall = {
  name: string;
  input: Record<string, string>;
};

const toolCallPattern = /<longcat_tool_call>([\s\S]*?)<\/longcat_tool_call>/g;
const toolCallStart = "<longcat_tool_call>";
const argumentStartPattern =
  /<longcat_arg_key>([\s\S]*?)<\/longcat_arg_key>\s*<longcat_arg_value>/g;
const argumentEnd = "</longcat_arg_value>";

export function parseLongcatToolCalls(content: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  let lastClosedToolCallEnd = 0;

  for (const match of content.matchAll(toolCallPattern)) {
    const body = match[1] ?? "";
    calls.push(parseToolCallBody(body));
    lastClosedToolCallEnd = (match.index ?? 0) + match[0].length;
  }

  const trailingToolCallStart = content.indexOf(toolCallStart, lastClosedToolCallEnd);

  if (trailingToolCallStart !== -1) {
    const body = content.slice(trailingToolCallStart + toolCallStart.length);
    calls.push(parseToolCallBody(body));
  }

  return calls;
}

export function stripLongcatToolCalls(content: string): string {
  return content.replace(toolCallPattern, "").replace(/<longcat_tool_call>[\s\S]*$/, "").trim();
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

function parseToolCallBody(body: string): ParsedToolCall {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const name = lines.find((line) => !line.startsWith("<")) ?? "tool";

  return {
    name,
    input: parseArguments(body)
  };
}

function parseArguments(body: string): Record<string, string> {
  const input: Record<string, string> = {};

  for (const argument of body.matchAll(argumentStartPattern)) {
    const key = decodeXml(argument[1] ?? "").trim();

    if (!key) {
      continue;
    }

    const valueStart = argument.index + argument[0].length;
    const valueEnd = body.indexOf(argumentEnd, valueStart);

    if (valueEnd === -1) {
      continue;
    }

    const rawValue = body.slice(valueStart, valueEnd);
    const value = decodeXml(rawValue);
    input[key] = key === "content" ? value : value.trim();
  }

  return input;
}
