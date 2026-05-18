export function extractJsonObject(input: string): unknown {
  const fenced = input.match(/```json\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? input;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }

  return JSON.parse(source.slice(start, end + 1));
}
