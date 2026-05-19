import { confirm } from "@inquirer/prompts";
import ora from "ora";
import type { ChatMessage } from "../core/types.js";
import type { AiProvider } from "../providers/types.js";
import { validateCommand } from "../safety/commands.js";
import { printInfo, printMuted, renderMarkdown } from "../terminal/render.js";
import { runShellCommandWithResult } from "../terminal/runCommand.js";
import {
  isShellToolCall,
  parseLongcatToolCalls,
  stripLongcatToolCalls,
  type ParsedToolCall
} from "../tools/toolCalls.js";
import { getErrorMessage, UserFacingError } from "../utils/errors.js";

export type ToolLoopOptions = {
  provider: AiProvider;
  model: string;
  temperature: number;
  messages: ChatMessage[];
  cwd: string;
  allowCommandExecution: boolean;
  autoAcceptCommands: boolean;
  maxToolIterations: number;
  onToken?: (token: string) => void;
  onBeforeRequest?: (messages: ChatMessage[]) => Promise<void>;
};

export type ToolLoopResult = {
  finalAnswer: string;
  messages: ChatMessage[];
  iterations: number;
};

export async function runToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  const messages = [...options.messages];
  let finalAnswer = "";
  let toolIterations = 0;

  for (;;) {
    const spinner = ora(
      toolIterations === 0 ? "Requesting response" : "Continuing with tool results"
    ).start();

    try {
      await options.onBeforeRequest?.(messages);
      finalAnswer = await options.provider.chat({
        model: options.model,
        temperature: options.temperature,
        messages,
        ...(options.onToken ? { onToken: options.onToken } : {})
      });
      spinner.stop();
    } catch (error) {
      spinner.stop();
      throw error;
    }

    const toolCalls = parseLongcatToolCalls(finalAnswer);
    const text = stripLongcatToolCalls(finalAnswer);

    if (text) {
      console.log(renderMarkdown(text));
    }

    messages.push({ role: "assistant", content: finalAnswer });

    if (toolCalls.length === 0) {
      return { finalAnswer, messages, iterations: toolIterations };
    }

    if (toolIterations >= options.maxToolIterations) {
      throw new UserFacingError("Tool execution limit reached");
    }

    const results: string[] = [];

    for (const call of toolCalls) {
      results.push(await executeToolCall(call, options));
    }

    toolIterations += 1;
    messages.push({
      role: "user",
      content: formatToolResults(results)
    });
  }
}

async function executeToolCall(call: ParsedToolCall, options: ToolLoopOptions): Promise<string> {
  if (!isShellToolCall(call)) {
    const message = `Unsupported tool: ${call.name}`;
    printMuted(message);
    return message;
  }

  const command = call.input.command;

  if (!command) {
    const message = "Shell tool skipped because no command was provided.";
    printMuted(message);
    return message;
  }

  const validation = validateCommand(command);

  if (!validation.ok) {
    const message = `Command blocked by safety policy and requires manual review: ${command}`;
    printMuted(message);
    return message;
  }

  if (!options.allowCommandExecution && !options.autoAcceptCommands) {
    const message = `Skipped command because command execution is disabled: ${command}`;
    printMuted(message);
    return message;
  }

  if (!options.autoAcceptCommands) {
    const run = await confirm({ message: `Run command: ${command}?`, default: false });

    if (!run) {
      const message = `Skipped command: ${command}`;
      printMuted(message);
      return message;
    }
  } else {
    printInfo("Auto-running command...");
    printMuted(`Running: ${command}`);
  }

  try {
    const spinner = ora("Running command").start();
    const result = await runShellCommandWithResult(command, options.cwd);
    spinner.stop();

    if (result.stdout) {
      console.log(result.stdout);
    }

    if (result.stderr) {
      console.error(result.stderr);
    }

    printMuted(`Command exited with code ${result.exitCode}`);
    return formatCommandResult(command, result.exitCode, result.stdout, result.stderr);
  } catch (error) {
    const message = `Command failed: ${getErrorMessage(error)}`;
    printMuted(message);
    return `${message}\nCommand: ${command}`;
  }
}

function formatCommandResult(
  command: string,
  exitCode: number,
  stdout: string,
  stderr: string
): string {
  return [
    `Command: ${command}`,
    `Exit code: ${exitCode}`,
    stdout ? `stdout:\n${trimToolOutput(stdout)}` : "stdout: <empty>",
    stderr ? `stderr:\n${trimToolOutput(stderr)}` : "stderr: <empty>"
  ].join("\n");
}

function trimToolOutput(output: string, maxLength = 12_000): string {
  if (output.length <= maxLength) {
    return output;
  }

  return `${output.slice(0, maxLength)}\n[output truncated after ${maxLength} characters]`;
}

function formatToolResults(results: string[]): string {
  return [
    "Tool results were executed and are now available.",
    "Continue from these results and produce the next tool call or final answer.",
    "",
    ...results.map(
      (result, index) => `<tool_result index="${index + 1}">\n${result}\n</tool_result>`
    )
  ].join("\n");
}
