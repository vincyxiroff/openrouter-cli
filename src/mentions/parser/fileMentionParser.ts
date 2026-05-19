export type ParsedFileMention = {
  token: string;
  value: string;
  start: number;
  end: number;
};

const mentionPattern = /(^|\s)@([^\s@]+)/g;

export function parseFileMentions(prompt: string): ParsedFileMention[] {
  const mentions: ParsedFileMention[] = [];

  for (const match of prompt.matchAll(mentionPattern)) {
    const prefix = match[1] ?? "";
    const value = match[2] ?? "";
    const start = (match.index ?? 0) + prefix.length;
    const token = `@${value}`;

    if (value.trim()) {
      mentions.push({ token, value, start, end: start + token.length });
    }
  }

  return mentions;
}

export function currentMentionToken(input: string): { query: string; start: number } | undefined {
  const lastSpace = Math.max(
    input.lastIndexOf(" "),
    input.lastIndexOf("\n"),
    input.lastIndexOf("\t")
  );
  const start = lastSpace + 1;
  const token = input.slice(start);

  if (!token.startsWith("@")) {
    return undefined;
  }

  return { query: token.slice(1), start };
}
