# Basic Usage

```bash
orc init
orc ask "explain this project"
orc ask "explain @src/index.ts"
orc context "authentication"
orc edit "add request validation to the login route"
orc edit "fix type errors" --yes
orc commit
```

`orc edit` always shows a diff before writing files. In trusted projects, `--yes`, `--auto-edits`, and `--auto-cmds` can skip routine confirmations while dangerous commands remain blocked.
