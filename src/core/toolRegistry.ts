export type ToolPermission = "read" | "write" | "network" | "shell";

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: string;
  description: string;
  permissions: ToolPermission[];
  execute(input: TInput): Promise<TOutput>;
};

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
