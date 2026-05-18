import { OpenAiCompatibleProvider } from "./openAiCompatibleProvider.js";

export class LocalApiProvider extends OpenAiCompatibleProvider {
  constructor() {
    super({
      id: "local",
      name: "Local API",
      baseUrl: process.env.ORC_LOCAL_API_URL ?? "http://localhost:8000/v1"
    });
  }
}
