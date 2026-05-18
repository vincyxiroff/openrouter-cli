export type AgentRole = "planner" | "coder" | "reviewer" | "tester";

export type AgentDefinition = {
  role: AgentRole;
  name: string;
  prompt: string;
};

export type AgentsConfig = {
  mode: "sequential" | "parallel";
  agents: AgentDefinition[];
};

export const defaultAgentsConfig: AgentsConfig = {
  mode: "sequential",
  agents: [
    { role: "planner", name: "Planner Agent", prompt: "Plan the work clearly." },
    { role: "coder", name: "Coder Agent", prompt: "Implement the planned changes." },
    { role: "reviewer", name: "Reviewer Agent", prompt: "Review risks and code quality." },
    { role: "tester", name: "Tester Agent", prompt: "Design and run verification." }
  ]
};
