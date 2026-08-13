import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const allowed = [/^playable-a8\//, /^worker-a8\//];

function gitLines(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} should be readable`);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

test("A8 changes remain inside the two delegated directories", () => {
  const tracked = gitLines(["diff", "--name-only"]);
  const untracked = gitLines(["ls-files", "--others", "--exclude-standard"]);
  const paths = [...new Set([...tracked, ...untracked])];
  const outside = paths.filter((filePath) => !allowed.some((pattern) => pattern.test(filePath.replaceAll("\\", "/"))));
  assert.deepEqual(outside, [], `protected scope changed outside playable-a8/** and worker-a8/**: ${outside.join(", ")}`);
});
