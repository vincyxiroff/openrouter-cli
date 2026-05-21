import { spawn } from "node:child_process";
import * as vscode from "vscode";

type WebviewMessage =
  | { type: "ready" }
  | { type: "ask"; prompt: string }
  | { type: "edit"; prompt: string; autoEdits?: boolean; autoCommands?: boolean }
  | { type: "trust"; action: "status" | "project" | "folder" | "remove" | "list" }
  | { type: "terminal" }
  | { type: "setup" }
  | { type: "doctor" };

type QuickTask = {
  label: string;
  task: string;
  mode: "ask" | "edit";
};

const output = vscode.window.createOutputChannel("OpenRouter CLI");

export function activate(context: vscode.ExtensionContext): void {
  const provider = new OpenRouterViewProvider(context.extensionUri);

  context.subscriptions.push(
    output,
    vscode.window.registerWebviewViewProvider(OpenRouterViewProvider.viewType, provider),
    command("openrouterCli.chat", () => provider.focus()),
    command("openrouterCli.explain", () =>
      runQuickTask({ label: "Explain", task: "Explain this code clearly", mode: "ask" })
    ),
    command("openrouterCli.edit", () =>
      runQuickTask({ label: "Edit", task: "Improve the selected code", mode: "edit" })
    ),
    command("openrouterCli.fixErrors", () =>
      runQuickTask({ label: "Fix Errors", task: "Fix errors in the selected code", mode: "edit" })
    ),
    command("openrouterCli.refactor", () =>
      runQuickTask({ label: "Refactor", task: "Refactor the selected code", mode: "edit" })
    ),
    command("openrouterCli.addDocumentation", () =>
      runQuickTask({ label: "Document", task: "Add useful documentation to the selected code", mode: "edit" })
    ),
    command("openrouterCli.trustStatus", () => runTrustAction("status")),
    command("openrouterCli.trustProject", () => runTrustAction("project")),
    command("openrouterCli.trustFolder", () => runTrustAction("folder")),
    command("openrouterCli.removeTrust", () => runTrustAction("remove")),
    command("openrouterCli.openTerminal", () => openOrcTerminal())
  );
}

export function deactivate(): void {}

class OpenRouterViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "openrouterCli.chatView";
  private view?: vscode.WebviewView;
  private activeRun?: ReturnType<typeof spawn>;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };
    view.webview.html = renderWebview(view.webview);
    view.webview.onDidReceiveMessage((message: WebviewMessage) => void this.handleMessage(message));
  }

  focus(): void {
    void vscode.commands.executeCommand(`${OpenRouterViewProvider.viewType}.focus`);
    void this.refreshTrustStatus();
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    if (message.type === "ready") {
      await this.refreshTrustStatus();
      return;
    }

    if (message.type === "ask") {
      await this.runAsk(message.prompt);
      return;
    }

    if (message.type === "edit") {
      openEditTerminal(message.prompt, {
        autoEdits: message.autoEdits === true,
        autoCommands: message.autoCommands === true
      });
      this.post({ type: "notice", text: "Edit opened in the terminal for diff approval." });
      return;
    }

    if (message.type === "trust") {
      const text = await runOrc(["trust", message.action]);
      this.post({ type: "trust", text });
      return;
    }

    if (message.type === "terminal") {
      openOrcTerminal();
      return;
    }

    if (message.type === "setup") {
      openOrcTerminal(["setup"]);
      return;
    }

    if (message.type === "doctor") {
      const text = await runOrc(["doctor"]);
      this.post({ type: "diagnostics", text });
    }
  }

  private async refreshTrustStatus(): Promise<void> {
    try {
      const text = await runOrc(["trust", "status"]);
      this.post({ type: "trust", text });
    } catch (error) {
      this.post({ type: "trust", text: getErrorMessage(error) });
    }
  }

  private async runAsk(prompt: string): Promise<void> {
    const trimmed = prompt.trim();

    if (!trimmed) {
      this.post({ type: "notice", text: "Write a prompt first." });
      return;
    }

    this.activeRun?.kill();
    this.post({ type: "run-start" });

    try {
      this.activeRun = streamOrc(["ask", trimmed], (chunk) => {
        this.post({ type: "chunk", chunk });
      });
      await waitForProcess(this.activeRun);
      this.post({ type: "run-done" });
    } catch (error) {
      this.post({ type: "run-error", text: getErrorMessage(error) });
    } finally {
      this.activeRun = undefined;
    }
  }

  private post(message: Record<string, unknown>): void {
    void this.view?.webview.postMessage(message);
  }
}

function command(name: string, run: () => unknown): vscode.Disposable {
  return vscode.commands.registerCommand(name, run);
}

async function runQuickTask(task: QuickTask): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const selection = editor?.document.getText(editor.selection).trim();
  const file = editor ? vscode.workspace.asRelativePath(editor.document.uri) : undefined;
  const prompt = buildTaskPrompt(task.task, file, selection);

  if (task.mode === "edit") {
    openEditTerminal(prompt);
    return;
  }

  output.clear();
  output.show(true);
  output.appendLine(`${task.label}: ${file ?? "workspace"}`);
  output.appendLine("");

  try {
    await streamOrcToOutput(["ask", prompt]);
  } catch (error) {
    vscode.window.showErrorMessage(getErrorMessage(error));
  }
}

async function runTrustAction(action: "status" | "project" | "folder" | "remove"): Promise<void> {
  output.clear();
  output.show(true);

  try {
    output.append(await runOrc(["trust", action]));
  } catch (error) {
    vscode.window.showErrorMessage(getErrorMessage(error));
  }
}

function buildTaskPrompt(task: string, file?: string, selection?: string): string {
  const location = file ? `File: @${file}` : "Use the current workspace context.";

  if (!selection) {
    return `${task}.\n${location}`;
  }

  return `${task}.\n${location}\n\nSelected code:\n${selection}`;
}

function openEditTerminal(
  task: string,
  options: { autoEdits?: boolean; autoCommands?: boolean } = {}
): void {
  const args = ["edit", task];

  if (options.autoEdits) {
    args.push("--auto-edits");
  }

  if (options.autoCommands) {
    args.push("--auto-cmds");
  }

  openOrcTerminal(args);
}

function openOrcTerminal(args: string[] = []): void {
  const terminal = vscode.window.createTerminal({
    name: "OpenRouter CLI",
    cwd: getWorkspacePath()
  });
  terminal.show();
  terminal.sendText([getCommandName(), ...args.map(quoteShellArg)].join(" "));
}

async function streamOrcToOutput(args: string[]): Promise<void> {
  await waitForProcess(
    streamOrc(args, (chunk) => {
      output.append(chunk);
    })
  );
}

async function runOrc(args: string[]): Promise<string> {
  let text = "";
  await waitForProcess(
    streamOrc(args, (chunk) => {
      text += chunk;
    })
  );
  text = stripAnsi(text);
  return text.trim() ? text : "No output.";
}

function streamOrc(args: string[], onChunk: (chunk: string) => void): ReturnType<typeof spawn> {
  const child = spawn(getCommandName(), args, {
    cwd: getWorkspacePath(),
    shell: process.platform === "win32"
  });

  child.stdout.on("data", (chunk: Buffer) => onChunk(chunk.toString("utf8")));
  child.stderr.on("data", (chunk: Buffer) => onChunk(chunk.toString("utf8")));

  return child;
}

function waitForProcess(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code && code !== 0) {
        reject(new Error(`orc exited with code ${code}.`));
        return;
      }

      resolve();
    });
  });
}

function getCommandName(): string {
  return vscode.workspace.getConfiguration("openrouterCli").get<string>("command") ?? "orc";
}

function getWorkspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function quoteShellArg(value: string): string {
  if (process.platform === "win32") {
    return `'${value.replace(/'/g, "''")}'`;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function renderWebview(webview: vscode.Webview): string {
  const nonce = getNonce();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>OpenRouter CLI</title>
  <style>
    :root {
      color-scheme: var(--vscode-color-scheme);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr auto;
    }

    header {
      padding: 14px 14px 12px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      background: var(--vscode-sideBar-background);
    }

    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .status {
      display: inline-flex;
      align-items: center;
      min-width: 76px;
      justify-content: center;
      border: 1px solid var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 11px;
      font-weight: 700;
    }

    .path {
      margin-top: 8px;
      color: var(--vscode-descriptionForeground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }

    main {
      min-height: 0;
      overflow: auto;
      padding: 12px;
    }

    section {
      margin-bottom: 14px;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 11px;
      line-height: 1.3;
      color: var(--vscode-descriptionForeground);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .toolbar,
    .grid {
      display: grid;
      gap: 7px;
    }

    .toolbar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    button {
      min-height: 30px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      padding: 6px 8px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      font: inherit;
      line-height: 1.25;
      cursor: pointer;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    textarea {
      width: 100%;
      min-height: 116px;
      resize: vertical;
      display: block;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 9px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      font-family: var(--vscode-font-family);
      line-height: 1.45;
    }

    textarea:focus,
    button:focus-visible,
    input:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 1px;
    }

    .toggles {
      display: grid;
      gap: 7px;
      margin: 8px 0;
    }

    label {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    input[type="checkbox"] {
      width: 14px;
      height: 14px;
      margin: 0;
    }

    pre {
      margin: 0;
      min-height: 140px;
      max-height: 42vh;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 10px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      line-height: 1.45;
    }

    footer {
      display: grid;
      gap: 7px;
      padding: 10px 12px 12px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
      background: var(--vscode-sideBar-background);
    }

    .quiet {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="title-row">
        <h1>OpenRouter CLI</h1>
        <span class="status" id="trustBadge">...</span>
      </div>
      <div class="path" id="trustPath">Checking workspace authorization</div>
    </header>

    <main>
      <section>
        <h2>Authorization</h2>
        <div class="toolbar">
          <button data-trust="project">Trust Project</button>
          <button data-trust="folder" class="secondary">Trust Folder</button>
          <button data-trust="status" class="secondary">Status</button>
          <button data-trust="remove" class="secondary">Remove Trust</button>
        </div>
      </section>

      <section>
        <h2>Ask</h2>
        <textarea id="prompt" placeholder="Ask about this workspace"></textarea>
        <div class="toolbar" style="margin-top: 8px;">
          <button id="ask">Ask</button>
          <button id="edit">Edit</button>
        </div>
        <div class="toggles">
          <label><input id="autoEdits" type="checkbox"> Auto-apply file edits</label>
          <label><input id="autoCommands" type="checkbox"> Auto-run approved commands</label>
        </div>
      </section>

      <section>
        <h2>Workspace</h2>
        <div class="grid">
          <button id="terminal" class="secondary">Open CLI Terminal</button>
          <button id="setup" class="secondary">Setup</button>
          <button id="doctor" class="secondary">Doctor</button>
        </div>
      </section>

      <section>
        <h2>Output</h2>
        <pre id="output"></pre>
      </section>
    </main>

    <footer>
      <div class="quiet" id="notice">Ready.</div>
    </footer>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const prompt = document.getElementById("prompt");
    const output = document.getElementById("output");
    const notice = document.getElementById("notice");
    const trustBadge = document.getElementById("trustBadge");
    const trustPath = document.getElementById("trustPath");
    const autoEdits = document.getElementById("autoEdits");
    const autoCommands = document.getElementById("autoCommands");

    const post = (message) => vscode.postMessage(message);
    const setNotice = (text) => {
      notice.textContent = text;
    };

    document.getElementById("ask").addEventListener("click", () => {
      output.textContent = "";
      setNotice("Running ask...");
      post({ type: "ask", prompt: prompt.value });
    });

    document.getElementById("edit").addEventListener("click", () => {
      setNotice("Opening edit terminal...");
      post({
        type: "edit",
        prompt: prompt.value,
        autoEdits: autoEdits.checked,
        autoCommands: autoCommands.checked
      });
    });

    document.getElementById("terminal").addEventListener("click", () => post({ type: "terminal" }));
    document.getElementById("setup").addEventListener("click", () => post({ type: "setup" }));
    document.getElementById("doctor").addEventListener("click", () => {
      output.textContent = "";
      setNotice("Running diagnostics...");
      post({ type: "doctor" });
    });

    document.querySelectorAll("[data-trust]").forEach((button) => {
      button.addEventListener("click", () => {
        setNotice("Updating authorization...");
        post({ type: "trust", action: button.dataset.trust });
      });
    });

    window.addEventListener("message", (event) => {
      const message = event.data;

      if (message.type === "run-start") {
        output.textContent = "";
        setNotice("Streaming response...");
      }

      if (message.type === "chunk") {
        output.textContent += message.chunk;
        output.scrollTop = output.scrollHeight;
      }

      if (message.type === "run-done") {
        setNotice("Done.");
      }

      if (message.type === "run-error") {
        setNotice(message.text);
      }

      if (message.type === "notice") {
        setNotice(message.text);
      }

      if (message.type === "trust") {
        const text = message.text || "";
        output.textContent = text;
        trustBadge.textContent = text.includes("trusted-project")
          ? "Project"
          : text.includes("trusted-folder")
            ? "Folder"
            : text.includes("restricted")
              ? "Restricted"
              : "Status";
        const path = text.split("\\n").find((line) => line.toLowerCase().includes("path:"));
        trustPath.textContent = path ? path.replace(/^\\s*path:\\s*/i, "") : "Workspace authorization updated";
        setNotice("Authorization status refreshed.");
      }

      if (message.type === "diagnostics") {
        output.textContent = message.text;
        setNotice("Diagnostics complete.");
      }
    });

    post({ type: "ready" });
  </script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";

  for (let index = 0; index < 32; index += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return text;
}
