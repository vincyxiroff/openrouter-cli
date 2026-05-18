const blockedPatterns = [
  /\brm\s+-[^\n]*r[^\n]*f/i,
  /\bsudo\b/i,
  /\breboot\b/i,
  /\bshutdown\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bdiskpart\b/i,
  /\bcurl\b[\s\S]*\|\s*bash/i,
  /\bwget\b[\s\S]*\|\s*bash/i,
  /\bchmod\s+-R\s+777\b/i,
  /\beval\b/i
];

export function validateCommand(command: string): { ok: true } | { ok: false; reason: string } {
  const blocked = blockedPatterns.find((pattern) => pattern.test(command));

  if (blocked) {
    return { ok: false, reason: "Command blocked by safety policy" };
  }

  return { ok: true };
}
