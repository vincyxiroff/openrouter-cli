import { defaultVoiceConfig } from "./types.js";

export async function startVoiceSession(model?: string): Promise<string> {
  await Promise.resolve();
  const config = {
    ...defaultVoiceConfig,
    sttProvider: model === "whisper" ? "whisper-local" : defaultVoiceConfig.sttProvider
  };
  return `Voice mode MVP ready: ${config.sttProvider} -> AI -> ${config.ttsProvider}`;
}
