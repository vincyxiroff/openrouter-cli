export type VoiceConfig = {
  sttProvider: "whisper-local" | "openai-compatible";
  ttsProvider: "piper-local" | "edge-tts";
  pushToTalk: boolean;
  interruptible: boolean;
};

export const defaultVoiceConfig: VoiceConfig = {
  sttProvider: "whisper-local",
  ttsProvider: "edge-tts",
  pushToTalk: true,
  interruptible: true
};
