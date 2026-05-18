# Safety Model

`openrouter-cli` is designed around explicit approval.

## File Safety

The CLI refuses sensitive paths such as:

- `.env`
- `.pem`
- SSH private keys
- credential files
- secret files
- token files

The AI never writes files directly. It returns a structured edit plan, the CLI validates it, displays a diff, and applies it only after confirmation.

## Command Safety

Commands are never run automatically. Dangerous command patterns are blocked, including:

- `rm -rf`
- `sudo`
- `reboot`
- `shutdown`
- `mkfs`
- `curl | bash`
- `wget | bash`
- recursive unsafe chmod
- `eval`

## Plugin and MCP Safety

Plugins run through isolated loader boundaries with timeouts and error isolation.

MCP tools are discovered dynamically. Any tool execution path must go through an approval layer before actions such as shell, write, network, or external service changes are allowed.
