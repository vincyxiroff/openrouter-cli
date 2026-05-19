import { describe, expect, it } from "vitest";
import { parsePortableHeredocWrite } from "../src/terminal/runCommand.js";

describe("run command", () => {
  it("parses bash heredoc file writes for portable execution", () => {
    const parsed = parsePortableHeredocWrite(`cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en"></html>
EOF
echo "Created index.html"`);

    expect(parsed).toEqual({
      path: "index.html",
      content: "<!DOCTYPE html>\n<html lang=\"en\"></html>\n",
      stdout: "Created index.html"
    });
  });

  it("does not parse heredocs with extra shell operations", () => {
    const parsed = parsePortableHeredocWrite(`cat > index.html << 'EOF'
hello
EOF
npm test`);

    expect(parsed).toBeUndefined();
  });
});
