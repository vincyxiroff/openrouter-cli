import { spawn } from "node:child_process";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("openrouterCli.chatView", provider),
    command("openrouterCli.chat", () => provider.focus()),
    command("openrouterCli.explain", () => runSelectionTask("Explain this code")),
    command("openrouterCli.edit", () => runSelectionTask("Edit this code")),
    command("openrouterCli.fixErrors", () => runSelectionTask("Fix errors in this code")),
    command("openrouterCli.refactor", () => runSelectionTask("Refactor this code")),
    command("openrouterCli.addDocumentation", () =>
      runSelectionTask("Add documentation to this code")
    ),
    command("openrouterCli.trustStatus", () => runTrustStatus()),
    command("openrouterCli.openTerminal", () => openOrcTerminal())
  );
}

export function deactivate(): void {}

class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = renderWebview();
    view.webview.onDidReceiveMessage(async (message: { prompt?: string }) => {
      if (!message.prompt) {
        return;
      }

      await streamOrc(["ask", message.prompt], (chunk) => {
        view.webview.postMessage({ type: "chunk", chunk });
      });
      view.webview.postMessage({ type: "done" });
    });
  }

  focus(): void {
    vscode.commands.executeCommand("openrouterCli.chatView.focus");
  }
}

function command(name: string, run: () => unknown): vscode.Disposable {
  return vscode.commands.registerCommand(name, run);
}

async function runSelectionTask(instruction: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage("Open a file first.");
    return;
  }

  const selection = editor.document.getText(editor.selection);
  const prompt = selection ? `${instruction}:\n\n${selection}` : instruction;
  const channel = vscode.window.createOutputChannel("OpenRouter CLI");
  channel.show(true);
  await streamOrc(["ask", prompt], (chunk) => channel.append(chunk));
}

async function runTrustStatus(): Promise<void> {
  const channel = vscode.window.createOutputChannel("OpenRouter CLI");
  channel.show(true);
  await streamOrc(["trust", "status"], (chunk) => channel.append(chunk));
}

function openOrcTerminal(): void {
  const commandName =
    vscode.workspace.getConfiguration("openrouterCli").get<string>("command") ?? "orc";
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const terminal = vscode.window.createTerminal({
    name: "OpenRouter CLI",
    cwd
  });
  terminal.show();
  terminal.sendText(commandName);
}

function streamOrc(args: string[], onChunk: (chunk: string) => void): Promise<void> {
  const commandName =
    vscode.workspace.getConfiguration("openrouterCli").get<string>("command") ?? "orc";
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const child = spawn(commandName, args, { cwd, shell: process.platform === "win32" });

  child.stdout.on("data", (chunk: Buffer) => onChunk(chunk.toString("utf8")));
  child.stderr.on("data", (chunk: Buffer) => onChunk(chunk.toString("utf8")));

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", () => resolve());
  });
}

function renderWebview(): string {
  return [
    "<!doctype html>",
    "<html>",
    "<body>",
    "<style>body{font-family:var(--vscode-font-family);padding:12px}textarea{width:100%;height:96px}button{margin-top:8px}pre{white-space:pre-wrap}</style>",
    "<h2>OpenRouter CLI</h2>",
    '<textarea id="prompt" placeholder="Ask about this project"></textarea>',
    '<button id="send">Send</button>',
    '<pre id="out"></pre>',
    "<script>",
    "const vscode=acquireVsCodeApi();",
    "document.getElementById('send').onclick=()=>{document.getElementById('out').textContent='';vscode.postMessage({prompt:document.getElementById('prompt').value});};",
    "window.addEventListener('message',event=>{if(event.data.type==='chunk')document.getElementById('out').textContent+=event.data.chunk;});",
    "</script>",
    "</body>",
    "</html>"
  ].join("");
}
