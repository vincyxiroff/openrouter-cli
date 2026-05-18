import { startVoiceSession } from "../voice/voiceSession.js";
import { printInfo, printMuted } from "../terminal/render.js";

export type VoiceOptions = {
  model?: string;
};

export async function voiceCommand(options: VoiceOptions = {}): Promise<void> {
  printInfo(await startVoiceSession(options.model));
  printMuted(
    "Push-to-talk, interruption, streaming STT, and TTS providers are wired as roadmap adapters."
  );
}
