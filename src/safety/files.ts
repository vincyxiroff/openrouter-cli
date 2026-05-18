const blockedPathPatterns = [
  /(^|\/)\.env($|\.)/i,
  /\.pem$/i,
  /(^|\/)id_rsa$/i,
  /(^|\/)id_ed25519$/i,
  /credentials/i,
  /secret/i,
  /token/i
];

export function validateFilePath(path: string): { ok: true } | { ok: false; reason: string } {
  const normalized = path.replaceAll("\\", "/");
  const blocked = blockedPathPatterns.find((pattern) => pattern.test(normalized));

  if (blocked) {
    return { ok: false, reason: `Refusing to read or write sensitive path: ${path}` };
  }

  return { ok: true };
}
