import { createServer } from "node:http";

export async function startDashboard(
  port = 3000
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((_, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(renderDashboard());
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));

  return {
    url: `http://localhost:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

function renderDashboard(): string {
  return [
    "<!doctype html>",
    "<html>",
    "<head><title>openrouter-cli dashboard</title></head>",
    "<body>",
    "<h1>openrouter-cli dashboard</h1>",
    "<p>MVP dashboard shell for sessions, prompts, token usage, models, settings, plugins, and MCP status.</p>",
    "</body>",
    "</html>"
  ].join("");
}
