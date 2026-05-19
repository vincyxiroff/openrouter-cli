# Safety Model

`openrouter-cli` is designed around explicit approval and workspace trust.

## File Safety

The CLI refuses sensitive paths such as:

- `.env`
- `.pem`
- SSH private keys
- credential files
- secret files
- token files

The AI never writes files directly. It returns a structured edit plan, the CLI validates it, displays a diff, and applies it only after confirmation unless trusted auto edit mode is enabled.

## Command Safety

Commands are never run automatically by default. Dangerous command patterns are blocked, including:

- `rm -rf`
- `sudo`
- `reboot`
- `shutdown`
- `mkfs`
- `curl | bash`
- `wget | bash`
- recursive unsafe chmod
- `eval`

Trusted projects can enable auto command execution with `--yes` or `--auto-cmds`, but dangerous commands remain blocked.

## Trust Safety

Unknown workspaces start in restricted mode unless the user trusts the project or folder.

Restricted mode allows read-only chat and explanation, but blocks:

- file edits
- shell execution
- plugin execution
- MCP execution
- auto edits
- auto commands

Use `orc trust` or `/trust` to inspect or change trust state.

## Plugin and MCP Safety

Plugins run through isolated loader boundaries with timeouts and error isolation. Plugins are disabled in restricted workspaces.

MCP tools are discovered dynamically. Any tool execution path must go through an approval layer before actions such as shell, write, network, or external service changes are allowed. MCP execution is disabled in restricted workspaces.
