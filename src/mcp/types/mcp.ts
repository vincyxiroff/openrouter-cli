export type McpServerConfig = {
  name: string;
  command?: string | undefined;
  args?: string[] | undefined;
  url?: string | undefined;
  enabled: boolean;
  timeoutMs?: number | undefined;
  permissions?: string[] | undefined;
};

export type McpConfig = {
  servers: McpServerConfig[];
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type McpRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
};

export type McpResponse = {
  jsonrpc?: "2.0";
  id?: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type McpTransport = {
  start(): Promise<void>;
  request(request: McpRequest, timeoutMs: number): Promise<McpResponse>;
  close(): Promise<void>;
};
