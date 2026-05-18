import { OpenAiCompatibleProvider } from "../local/openAiCompatibleProvider.js";

export class LmStudioProvider extends OpenAiCompatibleProvider {
  constructor() {
    super({
      id: "lmstudio",
      name: "LM Studio",
      baseUrl: "http://localhost:1234/v1"
    });
  }
}
