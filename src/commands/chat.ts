import { input, select } from "@inquirer/prompts";
import { askCommand } from "./ask.js";
import { editCommand } from "./edit.js";
import { header, printMuted } from "../terminal/render.js";

export async function chatCommand(cwd = process.cwd()): Promise<void> {
  console.log(header());

  for (;;) {
    const mode = await select({
      message: "Mode",
      choices: [
        { name: "Ask", value: "ask" },
        { name: "Edit", value: "edit" },
        { name: "Exit", value: "exit" }
      ]
    });

    if (mode === "exit") {
      printMuted("Session closed.");
      return;
    }

    const prompt = await input({ message: mode === "ask" ? "Ask" : "Edit task", required: true });

    if (mode === "ask") {
      await askCommand(prompt, cwd);
    } else {
      await editCommand(prompt, cwd);
    }
  }
}
