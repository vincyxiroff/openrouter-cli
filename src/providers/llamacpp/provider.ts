import { OpenAiCompatibleProvider } from "../local/openAiCompatibleProvider.js";

export class LlamaCppProvider extends OpenAiCompatibleProvider {
  constructor() {
    super({
      id: "llamacpp",
      name: "llama.cpp",
      baseUrl: process.env.ORC_LLAMA_CPP_URL ?? "http://localhost:8080/v1"
    });
  }
}
