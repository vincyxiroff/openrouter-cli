export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
  role: Role;
  content: string;
};

export type AppConfig = {
  provider: string;
  model: string;
  temperature: number;
  maxContextFiles: number;
  maxFileSizeKB: number;
  allowCommandExecution: boolean;
  ignoredPaths: string[];
};

export type ContextFile = {
  path: string;
  content: string;
  score: number;
  size: number;
};

export type FileChange =
  | {
      type: "create" | "update";
      path: string;
      content: string;
    }
  | {
      type: "delete";
      path: string;
    };

export type EditPlan = {
  summary: string;
  reasoning: string;
  changes: FileChange[];
  commands: string[];
};

export type ModelInfo = {
  id: string;
  name?: string;
  context_length?: number;
  description?: string;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string | null;
  };
  pricing?: Record<string, string | number | null | undefined>;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
};

export type ModelSource = "live" | "cache" | "stale-cache";

export type ModelRegistryResult = {
  models: ModelInfo[];
  source: ModelSource;
  warning?: string;
};
