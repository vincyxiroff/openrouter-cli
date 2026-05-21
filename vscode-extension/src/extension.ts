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
  const child = spawn(getCommandName(), getProcessArgs(args), {
    cwd: getWorkspacePath(),
    shell: process.platform === "win32"
  });

  child.stdout.on("data", (chunk: Buffer) => onChunk(chunk.toString("utf8")));
  child.stderr.on("data", (chunk: Buffer) => onChunk(chunk.toString("utf8")));

  return child;
}

function getProcessArgs(args: string[]): string[] {
  if (process.platform !== "win32") {
    return args;
  }

  return args.map(quoteCmdArg);
}

function quoteCmdArg(value: string): string {
  if (!/[ \t\n\v"]/.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
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
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr auto;
    }

    header {
      padding: 10px 12px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      background: var(--vscode-sideBar-background);
    }

    .title-row,
    .actions,
    .composer-actions,
    .toggles {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-row {
      justify-content: space-between;
    }

    h1 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .status {
      display: inline-flex;
      align-items: center;
      min-width: 68px;
      justify-content: center;
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    .path,
    .notice,
    .meta {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.4;
    }

    .path {
      margin-top: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    main {
      min-height: 0;
      overflow: auto;
      padding: 14px 12px 18px;
    }

    .messages {
      display: flex;
      min-height: 100%;
      flex-direction: column;
      gap: 14px;
    }

    .message {
      display: grid;
      gap: 5px;
    }

    .message.user {
      justify-items: end;
    }

    .message.assistant,
    .message.system {
      justify-items: start;
    }

    .bubble {
      max-width: min(100%, 760px);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 9px 10px;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.48;
    }

    .user .bubble {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }

    .assistant .bubble {
      color: var(--vscode-editor-foreground);
      background: var(--vscode-sideBar-background);
    }

    .system .bubble {
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-input-background);
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
    }

    button {
      min-height: 28px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 5px;
      padding: 5px 8px;
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
      min-height: 70px;
      max-height: 180px;
      resize: vertical;
      display: block;
      border: 1px solid var(--vscode-input-border);
      border-radius: 7px;
      padding: 10px;
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

    footer {
      display: grid;
      gap: 8px;
      padding: 10px 12px 12px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
      background: var(--vscode-sideBar-background);
    }

    .composer-actions {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .actions,
    .toggles {
      flex-wrap: wrap;
    }

    label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    input[type="checkbox"] {
      width: 14px;
      height: 14px;
      margin: 0;
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

    <main id="scrollArea">
      <div class="messages" id="messages">
        <div class="message assistant">
          <div class="meta">OpenRouter CLI</div>
          <div class="bubble">Ask me about this workspace, or use Edit to open a terminal flow for approved file changes.</div>
        </div>
      </div>
    </main>

    <footer>
      <textarea id="prompt" placeholder="Message OpenRouter CLI"></textarea>
      <div class="composer-actions">
        <div class="actions">
          <button id="ask">Ask</button>
          <button id="edit" class="secondary">Edit</button>
          <button id="terminal" class="secondary">Terminal</button>
          <button id="doctor" class="secondary">Doctor</button>
        </div>
        <div class="actions">
          <button data-trust="project" class="secondary">Trust Project</button>
          <button data-trust="status" class="secondary">Status</button>
        </div>
      </div>
      <div class="toggles">
        <label><input id="autoEdits" type="checkbox"> Auto edits</label>
        <label><input id="autoCommands" type="checkbox"> Auto commands</label>
      </div>
      <div class="notice" id="notice">Ready.</div>
    </footer>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const prompt = document.getElementById("prompt");
    const messages = document.getElementById("messages");
    const scrollArea = document.getElementById("scrollArea");
    const notice = document.getElementById("notice");
    const trustBadge = document.getElementById("trustBadge");
    const trustPath = document.getElementById("trustPath");
    const autoEdits = document.getElementById("autoEdits");
    const autoCommands = document.getElementById("autoCommands");
    let activeAssistantBubble;

    const post = (message) => vscode.postMessage(message);
    const setNotice = (text) => {
      notice.textContent = text;
    };
    const scrollToBottom = () => {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    };
    const appendMessage = (role, text, label) => {
      const message = document.createElement("div");
      const meta = document.createElement("div");
      const bubble = document.createElement("div");
      message.className = "message " + role;
      meta.className = "meta";
      bubble.className = "bubble";
      meta.textContent = label || (role === "user" ? "You" : "OpenRouter CLI");
      bubble.textContent = text || "";
      message.append(meta, bubble);
      messages.append(message);
      scrollToBottom();
      return bubble;
    };
    const submitAsk = () => {
      const text = prompt.value.trim();
      if (!text) {
        setNotice("Write a prompt first.");
        return;
      }

      appendMessage("user", text, "You");
      activeAssistantBubble = appendMessage("assistant", "", "OpenRouter CLI");
      setNotice("Streaming response...");
      post({ type: "ask", prompt: text });
      prompt.value = "";
    };

    document.getElementById("ask").addEventListener("click", submitAsk);
    prompt.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitAsk();
      }
    });

    document.getElementById("edit").addEventListener("click", () => {
      const text = prompt.value.trim();
      setNotice("Opening edit terminal...");
      appendMessage("user", text || "Open edit terminal", "You");
      post({
        type: "edit",
        prompt: text,
        autoEdits: autoEdits.checked,
        autoCommands: autoCommands.checked
      });
      prompt.value = "";
    });

    document.getElementById("terminal").addEventListener("click", () => post({ type: "terminal" }));
    document.getElementById("doctor").addEventListener("click", () => {
      setNotice("Running diagnostics...");
      activeAssistantBubble = appendMessage("system", "", "Doctor");
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
        setNotice("Streaming response...");
      }

      if (message.type === "chunk") {
        if (!activeAssistantBubble) {
          activeAssistantBubble = appendMessage("assistant", "", "OpenRouter CLI");
        }
        activeAssistantBubble.textContent += message.chunk;
        scrollToBottom();
      }

      if (message.type === "run-done") {
        activeAssistantBubble = undefined;
        setNotice("Done.");
      }

      if (message.type === "run-error") {
        if (activeAssistantBubble) {
          activeAssistantBubble.textContent = message.text;
          activeAssistantBubble = undefined;
        } else {
          appendMessage("system", message.text, "Error");
        }
        setNotice(message.text);
      }

      if (message.type === "notice") {
        setNotice(message.text);
      }

      if (message.type === "trust") {
        const text = message.text || "";
        trustBadge.textContent = text.includes("trusted-project")
          ? "Project"
          : text.includes("trusted-folder")
            ? "Folder"
            : text.includes("restricted")
              ? "Restricted"
              : "Status";
        const path = text.split("\\n").find((line) => line.toLowerCase().includes("path:"));
        trustPath.textContent = path ? path.replace(/^\\s*path:\\s*/i, "") : "Workspace authorization updated";
        appendMessage("system", text, "Trust");
        setNotice("Authorization status refreshed.");
      }

      if (message.type === "diagnostics") {
        if (activeAssistantBubble) {
          activeAssistantBubble.textContent = message.text;
          activeAssistantBubble = undefined;
        } else {
          appendMessage("system", message.text, "Doctor");
        }
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
