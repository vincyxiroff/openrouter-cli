# Release Checklist

1. Update `CHANGELOG.md`.
2. Run the full verification suite.
3. Confirm `npm pack --dry-run` includes only expected files.
4. Bump version with one of:

```bash
npm run version:patch
npm run version:minor
npm run version:major
```

5. Publish when ready:

```bash
npm publish
```

The `prepack` script builds `dist/` before packaging.
