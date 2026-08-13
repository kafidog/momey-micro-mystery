import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseline = "2d65c7baaebf5af62027373122147a7966a9c9cc";

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

test("A9 work stays inside playable-a9 and worker-a9", () => {
  const changed = git(["diff", "--name-only", baseline]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const outside = [...new Set([...changed, ...untracked])].filter((file) => !/^(playable-a9|worker-a9)\//.test(file.replaceAll("\\", "/")));
  assert.deepEqual(outside, []);
});
